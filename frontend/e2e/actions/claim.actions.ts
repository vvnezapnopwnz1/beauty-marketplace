import { expect, type Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import { closeCitySelectionModalIfVisible } from '../helpers/ui-overlays'
import type { ActionFn } from './index'

export const claimActions: Record<string, ActionFn> = {
  async checkStatus(page: Page, ctx: TestContext, _api: ApiHelpers, data?: Record<string, unknown>) {
    const source = (data?.source as string | undefined) ?? (ctx.has('claimSource') ? ctx.get<string>('claimSource') : '2gis')
    const externalId =
      (data?.externalId as string | undefined) ??
      (ctx.has('claimExternalId') ? ctx.get<string>('claimExternalId') : '')
    const statusUrl = `/claim-salon/status?source=${encodeURIComponent(source)}&externalId=${encodeURIComponent(externalId)}`
    await page.goto(statusUrl)
    await page.waitForLoadState('networkidle')

    if (data?.status) {
      await closeCitySelectionModalIfVisible(page)

      const expected = data.status as string
      const statusLabel: Record<string, RegExp> = {
        pending: /На рассмотрении/i,
        approved: /Одобрена/i,
        rejected: /Отклонена/i,
        duplicate: /Дубликат/i,
      }
      const label = statusLabel[expected] ?? new RegExp(expected, 'i')
      const statusAlert = page.getByRole('alert').filter({ hasText: label }).first()
      await expect(statusAlert).toBeVisible({ timeout: 10000 })
      await expect(statusAlert).toContainText(label)
    }
  },

  async goToDashboard(page: Page, ctx: TestContext) {
    await page.click('[data-testid="go-to-dashboard"], a:has-text("Перейти в кабинет"), button:has-text("Открыть салон")')
    await page.waitForURL(/\/(dashboard|salon)\//)
    // Extract salonId from URL for both /dashboard/:salonId and /salon/:salonId
    const match = page.url().match(/\/(?:dashboard|salon)\/([^/?]+)/)
    if (match) {
      const salonId = match[1]
      ctx.set('salonId', salonId)
      if (/\/salon\//.test(page.url())) {
        await page.goto(`/dashboard/${salonId}/onboarding`)
      }
    }
  },
}
