import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

export const personnelActions: Record<string, ActionFn> = {
  async invite(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const { phone, role } = data as Record<string, string>
    await page.click('[data-testid="invite-staff"], button:has-text("Пригласить")')
    await page.waitForSelector('[role="dialog"]')
    await page.fill('[name="phone"], [data-testid="invite-phone"]', phone)
    if (role) {
      const roleSelect = page.locator('[name="role"], [data-testid="invite-role"]')
      await roleSelect.click()
      await page.click(`[role="option"]:has-text("${role}")`)
    }
    await page.click('button:has-text("Отправить"), button:has-text("Пригласить")')
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' })
  },
}
