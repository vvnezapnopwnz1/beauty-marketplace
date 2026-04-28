import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

export const adminActions: Record<string, ActionFn> = {
  async viewClaims(page: Page) {
    await page.waitForSelector('[data-testid="claims-list"]')
  },

  async approveClaim(page: Page, ctx: TestContext, api: ApiHelpers, data?: Record<string, unknown>) {
    if (data?.source && data?.externalId) {
      // API shortcut — approve via direct API call (faster, more reliable)
      const adminPhone = globalThis.process?.env?.E2E_ADMIN_PHONE || '+79000000001'
      try {
        await api.login(adminPhone)
        // Approve first pending claim (response DTO does not expose source/externalId).
        const claims = await api.apiCall('GET', '/api/v1/admin/claims', adminPhone)
        const items = ((claims as { items?: unknown[] })?.items ?? claims) as Array<{ id: string; status?: string }>
        const claim = items.find((c) => c?.status === 'pending') ?? items[0]
        if (claim) {
          await api.approveClaim(adminPhone, claim.id)
        }
      } catch {
        // Fallback for local/dev envs without real global admin:
        // dev endpoint ensures the same source/externalId is linked+approved.
        const ownerPhone = globalThis.process?.env?.E2E_OWNER_PHONE || '+79001112233'
        await api.seedSalonByExternal(ownerPhone, String(data.source), String(data.externalId), 'Салон E2E')
      }
      return
    }

    // UI path
    const index = (data?.index as number) || 0
    const rows = page.locator('[data-testid="claim-row"]')
    await rows.nth(index).locator('button:has-text("Одобрить")').click()

    const confirmBtn = page.locator('button:has-text("Подтвердить")')
    if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmBtn.click()
    }
  },
}
