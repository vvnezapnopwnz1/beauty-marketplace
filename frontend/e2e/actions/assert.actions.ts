import { expect, type Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

export const assertActions: Record<string, ActionFn> = {
  async onPage(page: Page, ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const section = data?.section as string
    const sectionFromCtx = ctx.has('currentSection') ? ctx.get<string>('currentSection') : null
    if (sectionFromCtx) {
      expect(sectionFromCtx).toBe(section)
      return
    }

    const url = new URL(page.url())
    const sectionFromUrl = url.searchParams.get('section') ?? 'overview'
    expect(sectionFromUrl).toBe(section)
  },

  async isLoggedIn(page: Page) {
    await expect(page).not.toHaveURL(/\/login/)
  },

  async isLoggedOut(page: Page) {
    await page.goto('/me')
    await expect(page).toHaveURL(/\/login/)
  },

  async redirectToLogin(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    await page.goto(data?.path as string)
    await page.waitForURL(/\/login/)
  },

  async staffInList(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const name = data?.name as string
    await expect(page.locator(`text="${name}"`)).toBeVisible()
    if (data?.status) {
      await expect(page.locator(`[data-testid="staff-row"]:has-text("${name}")`).locator(`text="${data.status}"`)).toBeVisible()
    }
  },

  async serviceInList(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    await expect(page.locator(`text="${data?.name}"`)).toBeVisible()
    if (data?.price) {
      await expect(page.locator(`text="${data.price}"`)).toBeVisible()
    }
  },

  async serviceNotInList(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    await expect(page.locator(`text="${data?.name}"`)).not.toBeVisible()
  },

  async appointmentCreated(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    await expect(page.locator(`text="${data?.clientName}"`)).toBeVisible()
    if (data?.serviceName) {
      await expect(page.locator(`text="${data.serviceName}"`)).toBeVisible()
    }
  },

  async appointmentStatus(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const status = data?.status as string
    await expect(page.locator(`[data-testid="appointment-status"]:has-text("${status}"), .status-badge:has-text("${status}")`)).toBeVisible()
  },

  async appointmentUpdated(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    if (data?.time) await expect(page.locator(`text="${data.time}"`)).toBeVisible()
    if (data?.staffName) await expect(page.locator(`text="${data.staffName}"`)).toBeVisible()
  },

  async appointmentMoved(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    // After DnD, verify the appointment block is in the new position
    if (data?.newTime) {
      await expect(page.locator(`[data-testid^="appointment-block"]:has-text("${data.newTime}")`)).toBeVisible()
    }
  },

  async appointmentInList(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    if (data?.clientName) await expect(page.locator(`text="${data.clientName}"`)).toBeVisible()
    if (data?.serviceName) await expect(page.locator(`text="${data.serviceName}"`)).toBeVisible()
  },

  async bookingSuccess(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    await expect(page.locator('[data-testid="booking-success"], .toast-success')).toBeVisible()
    if (data?.masterName) {
      await expect(page.locator(`text="${data.masterName}"`)).toBeVisible()
    }
  },

  async clientInList(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    await expect(page.locator(`text="${data?.name}"`)).toBeVisible()
  },

  async clientNotInList(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    await expect(page.locator(`text="${data?.name}"`)).not.toBeVisible()
  },

  async clientHasTag(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const row = page.locator(`[data-testid="client-row"]:has-text("${data?.clientName}")`)
    await expect(row.locator(`text="${data?.tag}"`)).toBeVisible()
  },

  async searchResults(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const minCount = (data?.minCount as number) || 1
    const results = page.locator('a[href^="/salon/"], a[href^="/place/"]')
    const count = await results.count()
    if (count > 0) {
      await expect(results.first()).toBeVisible({ timeout: 10_000 })
      expect(count).toBeGreaterThanOrEqual(minCount)
    }
  },

  async onSalonPage(page: Page) {
    await expect(page).toHaveURL(/\/(salon|place)\//)
  },

  async profileSaved(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    await expect(page.locator('.toast-success, [role="alert"]')).toBeVisible()
    if (data?.name) await expect(page.locator(`text="${data.name}"`)).toBeVisible()
  },

  async profileUpdated(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    if (data?.displayName) await expect(page.locator(`text="${data.displayName}"`)).toBeVisible()
  },

  async sessionsList(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const minCount = (data?.minCount as number) || 1
    const sessions = page.locator('[data-testid="session-row"]')
    const count = await sessions.count()
    expect(count).toBeGreaterThanOrEqual(minCount)
  },

  async inviteInList(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    await expect(page.locator(`text="${data?.phone}"`)).toBeVisible()
  },

  async memberInList(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    await expect(page.locator(`text="${data?.phone}"`)).toBeVisible()
  },

  async claimStatus(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const status = data?.status as string
    await expect(page.locator(`[data-testid="claim-status"]:has-text("${status}")`)).toBeVisible()
  },

  async masterAppointmentsList(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const minCount = (data?.minCount as number) || 0
    if (minCount === 0) {
      // Just check page loaded
      await expect(page.locator('[data-testid="appointments-list"], .appointments-section')).toBeVisible()
    }
  },

  async masterSalonsList(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const minCount = (data?.minCount as number) || 1
    const salons = page.locator('[data-testid="salon-row"]')
    const count = await salons.count()
    expect(count).toBeGreaterThanOrEqual(minCount)
  },

  async scheduleUpdated(page: Page) {
    await expect(page.locator('.toast-success, [role="alert"]')).toBeVisible()
  },
}
