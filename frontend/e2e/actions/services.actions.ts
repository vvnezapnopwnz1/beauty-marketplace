import type { Locator, Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

async function setServiceDurationMinutes(dialog: Locator, target: number) {
  const stepper = dialog.getByTestId('service-duration-stepper')
  for (let guard = 0; guard < 200; guard++) {
    const text = await stepper.locator(':scope > div').first().textContent()
    const cur = parseInt(text?.match(/\d+/)?.[0] ?? '0', 10)
    if (cur === target) return
    if (cur < target) await stepper.locator('button').last().click()
    else await stepper.locator('button').first().click()
  }
  throw new Error(`Could not set duration to ${target} minutes`)
}

export const servicesActions: Record<string, ActionFn> = {
  async create(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const { name, categorySlug, durationMinutes, priceCents, description } = data as Record<string, unknown>

    await page.click('[data-testid="add-service"], button:has-text("Добавить услугу")')
    const dialog = page.getByRole('dialog')
    await dialog.waitFor({ state: 'visible' })

    await dialog.getByPlaceholder('Стрижка женская').fill(name as string)

    if (categorySlug) {
      const combo = dialog.getByRole('combobox')
      if (await combo.isVisible()) {
        await combo.click()
        const listbox = page.getByRole('listbox')
        await listbox.waitFor({ state: 'visible' })
        await listbox
          .getByRole('option')
          .filter({ has: page.locator(`[data-value="${categorySlug}"]`) })
          .click()
      }
    }

    if (durationMinutes) {
      await setServiceDurationMinutes(dialog, Number(durationMinutes))
    }

    if (priceCents) {
      // UI shows rubles, convert from cents
      const rubles = String(Math.floor((priceCents as number) / 100))
      await dialog.getByPlaceholder('2 500').fill(rubles)
    }

    if (description) {
      const descInput = dialog.getByPlaceholder('Что входит в услугу, особенности…')
      if (await descInput.isVisible()) await descInput.fill(description as string)
    }

    await dialog.getByRole('button', { name: 'Сохранить' }).click()
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
