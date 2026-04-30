import type { Page } from '@playwright/test'
import type { TestContext } from '../helpers/test-context'
import type { ApiHelpers } from '../helpers/api-helpers'
import type { ActionFn } from './index'

export const authActions: Record<string, ActionFn> = {
  /**
   * Login via API helper and inject tokens into localStorage.
   */
  async login(page: Page, ctx: TestContext, api: ApiHelpers, data?: Record<string, unknown>) {
    const phone = data?.phone as string
    const auth = await api.login(phone)
    await page.goto('/')
    await page.evaluate(
      ({ accessToken, refreshToken, sessionId }) => {
        localStorage.setItem('beauty_access_token', accessToken)
        localStorage.setItem('beauty_refresh_token', refreshToken)
        if (sessionId) localStorage.setItem('beauty_session_id', sessionId)
      },
      {
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        sessionId: (auth.user?.sessionId as string | null | undefined) ?? null,
      },
    )
    const meResp = page.waitForResponse(
      (r) => r.url().includes('/api/v1/me') && r.request().method() === 'GET',
      { timeout: 30_000 },
    )
    await page.reload()
    const me = await meResp
    if (!me.ok()) {
      throw new Error(`login: GET /api/v1/me after reload returned ${me.status()}`)
    }
    await page.waitForLoadState('load')
    ctx.set('currentPhone', phone)
  },

  /** Login as salon owner (uses env or default phone) */
  async loginAsSalonOwner(page: Page, ctx: TestContext, api: ApiHelpers) {
    const phone = env('E2E_OWNER_PHONE') || '+79001112233'
    await authActions.login(page, ctx, api, { phone })
    ctx.set('ownerPhone', phone)
    const me = await api.apiCall('GET', '/api/auth/me', phone)
    const memberships = (me as { effectiveRoles?: { salonMemberships?: Array<{ salonId: string }> } })
      ?.effectiveRoles?.salonMemberships
    if (memberships?.length) {
      ctx.set('salonId', memberships[0].salonId)
    }
  },

  /** Login as master */
  async loginAsMaster(page: Page, ctx: TestContext, api: ApiHelpers) {
    const phone = env('E2E_MASTER_PHONE') || '+79001112244'
    await authActions.login(page, ctx, api, { phone })
  },

  /** Login as admin */
  async loginAsAdmin(page: Page, ctx: TestContext, api: ApiHelpers) {
    const phone = env('E2E_ADMIN_PHONE') || '+79000000001'
    await authActions.login(page, ctx, api, { phone })
  },

  /** Logout via UI */
  async logout(page: Page) {
    await page.evaluate(() => {
      localStorage.removeItem('beauty_access_token')
      localStorage.removeItem('beauty_refresh_token')
      localStorage.removeItem('beauty_session_id')
    })
    await page.goto('/')
    await page.waitForLoadState('load')
  },

  /** Wait for automatic token refresh (simulates session persistence) */
  async waitForTokenRefresh(page: Page) {
    // Wait long enough for auto-refresh to trigger (access token TTL ~15min in prod, shorter in dev)
    await page.waitForTimeout(2000)
    // Verify the page still works after potential refresh
    await page.reload()
    await page.waitForLoadState('load')
  },
}

function env(name: string): string | undefined {
  return globalThis.process?.env?.[name]
}
