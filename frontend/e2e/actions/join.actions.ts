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
    await page.waitForLoadState('load')
  },

  async claimSalon(page: Page, ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const { source, externalId } = data as Record<string, string>
    await page.goto(`/claim-salon?source=${encodeURIComponent(source)}&externalId=${encodeURIComponent(externalId)}`)
    await page.waitForURL(/\/(claim-salon|login)/, { timeout: 15_000 })
    if (page.url().includes('/login')) {
      throw new Error(
        'claimSalon: redirected to /login (session lost). Check token injection and /api/v1/me after auth.login.',
      )
    }
    await page.waitForURL(/\/claim-salon\?/)
    const missingExternalIdAlert = page.getByText(/Не указан externalId салона/i)
    if (await missingExternalIdAlert.count()) {
      throw new Error(`Claim page opened without externalId (source=${source}, externalId=${externalId})`)
    }
    await page.getByRole('heading', { name: /Заявить права на салон/i }).waitFor({ state: 'visible', timeout: 15_000 })
    const loadError = page.getByText(/Не удалось загрузить данные салона|Салон не найден/i)
    if (await loadError.count()) {
      const msg = (await loadError.first().innerText()).trim()
      throw new Error(`claimSalon: place did not load (${msg}). externalId=${externalId}`)
    }
    const submitBtn = page.getByRole('button', { name: /Отправить заявку/i })
    await submitBtn.waitFor({ state: 'visible', timeout: 20_000 })
    await submitBtn.click()
    await page.waitForLoadState('load')
    ctx.set('claimSource', source)
    ctx.set('claimExternalId', externalId)
  },
}
