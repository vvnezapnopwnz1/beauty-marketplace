import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

export const calendarActions: Record<string, ActionFn> = {
  async switchMode(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const mode = data?.mode as string
    const labels: Record<string, string> = { day: 'День', week: 'Неделя', month: 'Месяц' }
    await page.click(`[data-testid="calendar-mode-${mode}"], button:has-text("${labels[mode]}")`)
    await page.waitForLoadState('networkidle')
  },

  async dragAppointment(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const { clientName, toTime } = data as Record<string, string>

    // Find the appointment block
    const block = page.locator(`[data-testid^="appointment-block"]:has-text("${clientName}")`)
    const target = page.locator(`[data-testid="time-slot-${toTime}"]`)

    // Perform drag
    await block.dragTo(target)
    await page.waitForLoadState('networkidle')
  },
}
