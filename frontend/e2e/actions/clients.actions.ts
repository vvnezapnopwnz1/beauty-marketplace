import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

export const clientsActions: Record<string, ActionFn> = {
  async create(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    await page.click('[data-testid="add-client"], button:has-text("Добавить клиента")')
    await page.waitForSelector('[role="dialog"]')
    await page.fill('[name="displayName"], [data-testid="client-name"]', data?.displayName as string)
    if (data?.phone) await page.fill('[name="phone"], [data-testid="client-phone"]', data.phone as string)
    await page.click('button:has-text("Сохранить")')
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' })
  },

  async assignTag(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const { clientName, tag } = data as Record<string, string>
    await page.click(`tr:has-text("${clientName}"), [data-testid="client-row"]:has-text("${clientName}")`)
    await page.waitForSelector('[data-testid="client-detail-drawer"]')
    await page.click('[data-testid="add-tag"], button:has-text("Тег")')
    await page.click(`[data-testid="tag-${tag}"], [role="option"]:has-text("${tag}")`)
  },

  async delete(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const name = data?.clientName as string
    await page.click(`tr:has-text("${name}")`)
    await page.click('[data-testid="delete-client"], button:has-text("Удалить")')
    await page.click('button:has-text("Подтвердить"), button:has-text("Да")')
  },

  async showDeleted(page: Page) {
    await page.click('[data-testid="show-deleted"], label:has-text("Удалённые")')
    await page.waitForTimeout(500)
  },

  async restore(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const name = data?.clientName as string
    const row = page.locator(`tr:has-text("${name}")`)
    await row.locator('button:has-text("Восстановить")').click()
  },
}
