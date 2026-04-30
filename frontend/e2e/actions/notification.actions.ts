import { expect, type Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

const OWNER_PHONE = globalThis.process?.env?.E2E_OWNER_PHONE || '+79001112233'

export const notificationActions: Record<string, ActionFn> = {
  /**
   * Idempotent: ensure at least one active service and one master exist for
   * the salon. Stores serviceId and salonMasterId in context so subsequent
   * steps can reference them without repeating API calls.
   */
  async seedPrerequisites(_page: Page, ctx: TestContext, api: ApiHelpers) {
    const salonId = ctx.get<string>('salonId')

    // Ensure owner token is loaded (bootstrapDevSalon may have done it already)
    if (!apiHasToken(api, OWNER_PHONE)) {
      await api.login(OWNER_PHONE)
    }

    // Service
    const services = await api.listSalonServices(OWNER_PHONE, salonId)
    const activeServices = services.filter((s) => s.isActive !== false)
    let serviceId: string
    if (activeServices.length > 0) {
      serviceId = activeServices[0].id
    } else {
      const svc = await api.createSalonService(OWNER_PHONE, salonId, {
        name: 'E2E Женская стрижка',
        categorySlug: 'hair_cuts',
        durationMinutes: 60,
        priceCents: 200000,
        isActive: true,
        sortOrder: 0,
      })
      serviceId = svc.id as string
    }
    ctx.set('serviceId', serviceId)

    // Master
    const masters = await api.listSalonMasters(OWNER_PHONE, salonId)
    const activeMasters = masters.filter((m) => m.isActive !== false)
    let salonMasterId: string
    if (activeMasters.length > 0) {
      salonMasterId = activeMasters[0].id
    } else {
      const master = await api.createSalonMaster(OWNER_PHONE, salonId, {
        displayName: 'E2E Мастер',
        phone: '+79008887766',
        color: '#9C27B0',
        isActive: true,
        dashboardAccess: false,
        telegramNotifications: false,
        serviceIds: [serviceId],
      })
      salonMasterId = (master.id ?? master.salonMasterId) as string

      await api.assignServiceToMaster(OWNER_PHONE, salonId, salonMasterId, [serviceId])
    }
    ctx.set('salonMasterId', salonMasterId)
  },

  /**
   * Creates a guest booking via API (no auth) — triggers SSE notification
   * for all salon members currently subscribed to the stream.
   *
   * data.startsAtHour  — UTC hour for the booking (default 10). Use different
   *                      values for multiple same-day bookings to avoid conflicts.
   * data.dayOffset     — days from today (default 1 = tomorrow).
   */
  async triggerGuestBooking(_page: Page, ctx: TestContext, api: ApiHelpers, data?: Record<string, unknown>) {
    const salonId = ctx.get<string>('salonId')
    const serviceId = ctx.get<string>('serviceId')
    const salonMasterId = ctx.has('salonMasterId') ? ctx.get<string>('salonMasterId') : undefined
    const guestName = (data?.guestName as string) || 'Тест Гость'
    const guestPhone = (data?.guestPhone as string) || '+79001234567'
    const startsAtHour = (data?.startsAtHour as number) ?? 10
    const dayOffset = (data?.dayOffset as number) ?? 1

    // Explicit startsAt bypasses slot-availability checks in the backend,
    // which means we don't need a master schedule set up.
    const startsAt = new Date()
    startsAt.setUTCDate(startsAt.getUTCDate() + dayOffset)
    startsAt.setUTCHours(startsAtHour, 0, 0, 0)

    const booking = await api.createGuestBooking(salonId, {
      serviceIds: [serviceId],
      name: guestName,
      phone: guestPhone,
      ...(salonMasterId ? { salonMasterId } : {}),
      startsAt: startsAt.toISOString(),
    })

    if (booking?.appointmentId) {
      ctx.set('lastAppointmentId', String(booking.appointmentId))
    }
  },

  /**
   * Wait for a notification snackbar with the given title to appear.
   * SSE → Redux → notistack → DOM: allow up to timeout ms.
   */
  async waitForSnackbar(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const title = (data?.title as string) || 'Новая запись'
    const timeout = (data?.timeout as number) || 12_000
    await page.waitForSelector(`text="${title}"`, { timeout })
  },

  /**
   * Click an action button (by label) inside the currently visible snackbar.
   */
  async clickSnackbarAction(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const label = data?.label as string
    if (!label) throw new Error('notification.clickSnackbarAction: label is required')
    const btn = page.getByRole('button', { name: label }).first()
    await expect(btn).toBeVisible({ timeout: 8_000 })
    await btn.click()
  },

  /**
   * Assert a success snackbar appeared with the given text.
   */
  async assertSuccessSnackbar(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const text = (data?.text as string) || 'Запись подтверждена'
    await expect(page.locator(`text="${text}"`)).toBeVisible({ timeout: 8_000 })
  },

  /**
   * Assert the notification snackbar with the given title is no longer visible.
   */
  async assertSnackbarGone(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const title = (data?.title as string) || 'Новая запись'
    await expect(page.locator(`text="${title}"`)).not.toBeVisible({ timeout: 8_000 })
  },

  /**
   * Dismiss all currently visible snackbars that have a "Закрыть" button.
   * Safe to call when zero or multiple snackbars are on screen.
   */
  async dismissAllSnackbars(page: Page) {
    const closeButtons = page.getByRole('button', { name: 'Закрыть' })
    // Snapshot count upfront — list may shrink as we click
    const count = await closeButtons.count()
    for (let i = 0; i < count; i++) {
      const btn = closeButtons.nth(0) // always pick first; after click it's gone
      if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
        await btn.click()
        await page.waitForTimeout(200) // let dismiss animation start
      }
    }
  },

  /**
   * Assert bell badge shows at least minCount unread notifications.
   * Polls until the count reaches the threshold or timeout expires.
   */
  async assertBellBadge(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const minCount = (data?.minCount as number) ?? 1
    const timeout = (data?.timeout as number) ?? 8_000

    if (minCount === 0) {
      await expect(page.locator('[data-testid="notification-bell"]')).toBeVisible({ timeout })
      return
    }

    // Wait until the bell shows a count >= minCount (RTK Query may lag slightly)
    await page.waitForFunction(
      (min: number) => {
        const bell = document.querySelector('[data-testid="notification-bell"]')
        if (!bell) return false
        const num = parseInt((bell.textContent ?? '').replace(/\D/g, '') || '0', 10)
        return num >= min
      },
      minCount,
      { timeout },
    )
  },

  /**
   * Open the notification bell popover.
   */
  async openBellPopover(page: Page) {
    const bell = page.locator('[data-testid="notification-bell"]')
    await expect(bell).toBeVisible({ timeout: 5_000 })
    await bell.click()
    // Wait for the popover list to appear
    await page.waitForSelector('[role="presentation"] ul', { timeout: 5_000 })
  },

  /**
   * Assert the popover contains at least minCount notification items.
   */
  async assertPopoverCount(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const minCount = (data?.minCount as number) ?? 1
    const items = page.locator('[role="presentation"] ul li')
    await expect(items.first()).toBeVisible({ timeout: 5_000 })
    const count = await items.count()
    expect(count).toBeGreaterThanOrEqual(minCount)
  },

  /**
   * Close the notification popover (press Escape).
   */
  async closeBellPopover(page: Page) {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  },
}

function apiHasToken(api: ApiHelpers, phone: string): boolean {
  try {
    api.getAccessToken(phone)
    return true
  } catch {
    return false
  }
}
