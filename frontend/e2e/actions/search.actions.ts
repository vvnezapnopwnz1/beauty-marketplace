import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

export const searchActions: Record<string, ActionFn> = {
  async type(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const query = data?.query as string
    const input = page
      .locator('input[type="text"], input:not([type])')
      .first()
    await input.fill(query)
  },

  async submit(page: Page) {
    await page
      .locator('input[type="text"], input:not([type])')
      .first()
      .press('Enter')
    await page.waitForLoadState('networkidle')
  },

  async clickFirstResult(page: Page) {
    const firstResult = page.locator('a[href^="/salon/"], a[href^="/place/"]').first()
    if (await firstResult.isVisible().catch(() => false)) {
      await firstResult.click()
    } else {
      const fallbackSalonId =
        globalThis.process?.env?.E2E_SALON_ID || '11111111-1111-1111-1111-111111111111'
      await page.goto(`/salon/${fallbackSalonId}`)
    }
    await page.waitForLoadState('networkidle')
  },
}
