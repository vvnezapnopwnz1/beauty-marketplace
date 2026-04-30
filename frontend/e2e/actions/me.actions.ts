import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

export const meActions: Record<string, ActionFn> = {
  async navigate(page: Page) {
    await page.goto('/me')
    await page.waitForLoadState('load')
  },

  async editProfile(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    if (data?.displayName) await page.getByLabel('Отображаемое имя').fill(data.displayName as string)
    if (data?.username) await page.getByLabel('Username').fill(data.username as string)
    await page.getByRole('button', { name: 'Сохранить' }).first().click()
    await page.waitForSelector('.toast-success, [role="alert"]')
  },

  async goToSecurity(page: Page) {
    await page.locator('nav').getByText('Безопасность', { exact: true }).first().click()
    await page.waitForLoadState('load')
  },

  async goToInvites(page: Page) {
    await page.goto('/me')
    await page.locator('nav').getByText('Приглашения', { exact: true }).first().click()
    await page.waitForLoadState('load')
  },

  async acceptInvite(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const salonName = data?.salonName as string
    const invite = page.locator(`[data-testid="invite-row"]:has-text("${salonName}")`)
    await invite.locator('button:has-text("Принять")').click()
  },
}
