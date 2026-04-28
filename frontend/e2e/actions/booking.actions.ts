import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

export const bookingActions: Record<string, ActionFn> = {
  async selectServices(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const services = data?.services as string[]
    for (const svc of services) {
      await page.click(`[data-testid="service-option"]:has-text("${svc}"), label:has-text("${svc}")`)
    }
    // Click "Next" in wizard
    await page.click('[data-testid="booking-next"], button:has-text("Далее")')
  },

  async selectMaster(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const masterName = data?.masterName as string
    await page.click(`[data-testid="master-option"]:has-text("${masterName}"), [role="button"]:has-text("${masterName}")`)
    await page.click('[data-testid="booking-next"], button:has-text("Далее")')
  },

  async selectSlot(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const { date, preferTime } = data as Record<string, string>

    if (date === 'tomorrow') {
      await page.click('[data-testid="next-date"], [aria-label="Следующий день"]')
    }

    // Click preferred time slot or first available
    if (preferTime) {
      const slot = page.locator(`[data-testid="slot-${preferTime}"], button:has-text("${preferTime}")`)
      if (await slot.isVisible()) {
        await slot.click()
      } else {
        // Fallback: click first available slot
        await page.click('[data-testid^="slot-"]:not([disabled]):first-child')
      }
    } else {
      await page.click('[data-testid^="slot-"]:not([disabled]):first-child')
    }

    await page.click('[data-testid="booking-next"], button:has-text("Далее")')
  },

  async fillGuestContacts(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const { name, phone, note } = data as Record<string, string>
    await page.fill('[data-testid="guest-name"], [name="guestName"]', name)
    await page.fill('[data-testid="guest-phone"], [name="guestPhone"]', phone)
    if (note) {
      const noteInput = page.locator('[data-testid="guest-note"], [name="clientNote"]')
      if (await noteInput.isVisible()) await noteInput.fill(note)
    }
  },

  async confirm(page: Page) {
    await page.click('[data-testid="booking-confirm"], button:has-text("Записаться")')
    await page.waitForSelector('[data-testid="booking-success"], .toast-success, [role="alert"]')
  },
}
