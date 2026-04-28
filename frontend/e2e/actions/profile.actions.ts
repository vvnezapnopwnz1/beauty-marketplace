import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

export const profileActions: Record<string, ActionFn> = {
  async edit(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    if (data?.nameOverride) {
      await page.fill('[name="nameOverride"], [data-testid="salon-name-override"]', data.nameOverride as string)
    }
    if (data?.slotDuration) {
      await page.fill('[name="slotDurationMinutes"], [data-testid="slot-duration"]', String(data.slotDuration))
    }
    if (data?.categoryScopes) {
      for (const scope of data.categoryScopes as string[]) {
        const checkbox = page.locator(`[data-testid="scope-${scope}"]`)
        if (!(await checkbox.isChecked())) await checkbox.click()
      }
    }
  },

  async save(page: Page) {
    await page.click('[data-testid="save-profile"], button:has-text("Сохранить")')
    await page.waitForSelector('.toast-success, [role="alert"]')
  },
}
