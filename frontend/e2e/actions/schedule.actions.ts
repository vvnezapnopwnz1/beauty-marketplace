import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

export const scheduleActions: Record<string, ActionFn> = {
  async setWorkingHours(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const staffName = data?.staffName as string
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

    // Select staff if specified
    if (staffName) {
      const staffSelect = page.locator('[data-testid="schedule-staff-select"]')
      if (await staffSelect.isVisible()) {
        await staffSelect.click()
        await page.click(`[role="option"]:has-text("${staffName}")`)
      }
    }

    for (const day of days) {
      const dayData = (data as Record<string, unknown>)?.[day] as Record<string, string> | undefined
      if (!dayData) continue

      await page.fill(`[data-testid="${day}-opens"], [name="${day}Opens"]`, dayData.opens)
      await page.fill(`[data-testid="${day}-closes"], [name="${day}Closes"]`, dayData.closes)
    }

    await page.click('button:has-text("Сохранить")')
    await page.waitForSelector('.toast-success, [role="alert"]')
  },
}
