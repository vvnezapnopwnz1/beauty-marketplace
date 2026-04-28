import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

export const servicesActions: Record<string, ActionFn> = {
  async create(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const { name, categorySlug, durationMinutes, priceCents, description } = data as Record<string, unknown>

    await page.click('[data-testid="add-service"], button:has-text("Добавить услугу")')
    await page.waitForSelector('[data-testid="service-form"], [role="dialog"]')

    await page.fill('[name="name"], [data-testid="service-name"]', name as string)

    if (categorySlug) {
      const catSelect = page.locator('[name="categorySlug"], [data-testid="service-category"]')
      if (await catSelect.isVisible()) await catSelect.selectOption(categorySlug as string)
    }

    if (durationMinutes) {
      await page.fill('[name="durationMinutes"], [data-testid="service-duration"]', String(durationMinutes))
    }

    if (priceCents) {
      // UI shows rubles, convert from cents
      const rubles = String(Math.floor((priceCents as number) / 100))
      await page.fill('[name="price"], [data-testid="service-price"]', rubles)
    }

    if (description) {
      const descInput = page.locator('[name="description"], [data-testid="service-description"]')
      if (await descInput.isVisible()) await descInput.fill(description as string)
    }

    await page.click('[data-testid="service-form-submit"], button:has-text("Сохранить")')
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' })
  },

  async edit(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const oldName = data?.oldName as string
    const newName = data?.newName as string
    const newPriceCents = data?.newPriceCents as number | undefined

    // Find and click edit on the service row
    const row = page.locator(`tr:has-text("${oldName}"), [data-testid="service-row"]:has-text("${oldName}")`)
    await row.locator('[data-testid="edit-service"], button[aria-label="Редактировать"]').click()
    await page.waitForSelector('[data-testid="service-form"], [role="dialog"]')

    if (newName) {
      await page.fill('[name="name"], [data-testid="service-name"]', newName)
    }
    if (newPriceCents) {
      const rubles = String(Math.floor(newPriceCents / 100))
      await page.fill('[name="price"], [data-testid="service-price"]', rubles)
    }

    await page.click('[data-testid="service-form-submit"], button:has-text("Сохранить")')
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' })
  },

  async delete(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const name = data?.name as string
    const row = page.locator(`tr:has-text("${name}"), [data-testid="service-row"]:has-text("${name}")`)
    await row.locator('[data-testid="delete-service"], button[aria-label="Удалить"]').click()

    // Confirm deletion dialog
    await page.click('[data-testid="confirm-delete"], button:has-text("Удалить")')
  },
}
