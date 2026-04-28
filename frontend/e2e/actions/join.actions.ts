import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

export const joinActions: Record<string, ActionFn> = {
  async searchSalon(page: Page, _ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    await page.goto('/join')
    const query = data?.query as string
    const input = page
      .locator('input[type="text"], input:not([type])')
      .first()
    await input.fill(query)
    await input.press('Enter')
    await page.waitForLoadState('networkidle')
  },

  async claimSalon(page: Page, ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const { source, externalId } = data as Record<string, string>
    await page.goto(`/claim-salon?source=${encodeURIComponent(source)}&externalId=${encodeURIComponent(externalId)}`)
    await page.waitForURL(/\/claim-salon\?/)
    const missingExternalIdAlert = page.getByText(/Не указан externalId салона/i)
    if (await missingExternalIdAlert.count()) {
      throw new Error(`Claim page opened without externalId (source=${source}, externalId=${externalId})`)
    }
    const submitBtn = page.getByRole('button', { name: /Отправить заявку/i })
    await submitBtn.waitFor({ state: 'visible', timeout: 10_000 })
    await submitBtn.click()
    await page.waitForLoadState('networkidle')
    ctx.set('claimSource', source)
    ctx.set('claimExternalId', externalId)
  },
}
