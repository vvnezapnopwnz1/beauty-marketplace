import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

export const masterDashboardActions: Record<string, ActionFn> = {
  async navigate(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const section = data?.section as string
    await page.goto(`/master-dashboard?section=${section}`)
    await page.waitForLoadState('load')
  },

  async editProfile(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    if (data?.bio) await page.fill('[name="bio"], [data-testid="master-bio"]', data.bio as string)
    if (data?.specializations) {
      for (const spec of data.specializations as string[]) {
        await page.fill('[data-testid="add-spec-input"]', spec)
        await page.keyboard.press('Enter')
      }
    }
    await page.click('button:has-text("Сохранить")')
  },
}
