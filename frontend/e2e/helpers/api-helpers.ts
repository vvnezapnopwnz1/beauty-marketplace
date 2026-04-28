import { request, type APIRequestContext } from '@playwright/test'

const env = globalThis.process?.env ?? {}
const API_BASE = env.E2E_API_URL || 'http://localhost:8080'

/**
 * Direct API calls for setup/teardown (bypassing UI).
 * Used for preconditions and admin actions that would slow down tests.
 */
export class ApiHelpers {
  private ctx!: APIRequestContext
  private tokens = new Map<string, { access: string; refresh: string }>()
  private defaultSalonId: string | null = null

  async init() {
    this.ctx = await request.newContext({ baseURL: API_BASE })
    await this.bootstrapDevSalon()
  }

  async dispose() {
    await this.ctx.dispose()
  }

  /** Request OTP and verify (dev mode returns code in response or use fixed "1234") */
  async login(phone: string): Promise<{ accessToken: string; refreshToken: string; user: Record<string, unknown> }> {
    // Request OTP
    await this.ctx.post('/api/auth/otp/request', {
      data: { phone, channel: 'sms' },
    })

    // In dev mode, OTP is printed to stderr — we use fixed code "1234" or env override
    const code = env.E2E_OTP_CODE || '1234'

    const verifyRes = await this.ctx.post('/api/auth/otp/verify', {
      data: { phone, code },
    })

    const body = await verifyRes.json()
    const accessToken = body?.tokenPair?.accessToken ?? body?.accessToken
    const refreshToken = body?.tokenPair?.refreshToken ?? body?.refreshToken
    if (!accessToken || !refreshToken) {
      throw new Error(`OTP verify returned invalid token payload for ${phone}`)
    }
    this.tokens.set(phone, { access: accessToken, refresh: refreshToken })
    return { accessToken, refreshToken, user: (body?.user ?? {}) as Record<string, unknown> }
  }

  getAccessToken(phone: string): string {
    const t = this.tokens.get(phone)
    if (!t) throw new Error(`No token for phone ${phone}. Call login() first.`)
    return t.access
  }

  getDefaultSalonId(): string | null {
    return this.defaultSalonId
  }

  /** Approve a salon claim via admin API */
  async approveClaim(adminPhone: string, claimId: string) {
    const token = this.getAccessToken(adminPhone)
    await this.ctx.post(`/api/v1/admin/claims/${claimId}/approve`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  }

  /** Create a salon via API (for seeding) */
  async createSalon(ownerPhone: string, salonData: Record<string, unknown>) {
    const token = this.getAccessToken(ownerPhone)
    const res = await this.ctx.post('/api/v1/salons', {
      headers: { Authorization: `Bearer ${token}` },
      data: salonData,
    })
    return res.json()
  }

  /** Direct API call with auth */
  async apiCall(method: string, path: string, phone: string, data?: Record<string, unknown>, salonId?: string) {
    const token = this.getAccessToken(phone)
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
    if (salonId) headers['X-Salon-Id'] = salonId

    const res = await this.ctx.fetch(`${API_BASE}${path}`, {
      method,
      headers,
      data,
    })
    if (!res.ok()) {
      throw new Error(`API ${method} ${path} failed: ${res.status()} ${await res.text()}`)
    }
    return res.json()
  }

  /**
   * Dev fallback: approve/ensure claim via dev endpoint
   * without requiring global admin role.
   */
  async seedSalonByExternal(phone: string, source: string, externalId: string, snapshotName?: string) {
    const res = await this.ctx.post('/api/dev/e2e/seed-salon', {
      data: {
        phone,
        source,
        externalId,
        snapshotName: snapshotName || 'Салон E2E',
      },
    })
    if (!res.ok()) {
      throw new Error(`Dev seed fallback failed: ${res.status()} ${await res.text()}`)
    }
    return res.json()
  }

  private async bootstrapDevSalon() {
    const phone = env.E2E_OWNER_PHONE || '+79001112233'
    const source = env.E2E_SEED_SOURCE || '2gis'
    const externalId = env.E2E_SEED_EXTERNAL_ID || '141373143068690'
    const snapshotName = env.E2E_SEED_SNAPSHOT_NAME || 'Салон E2E'

    const res = await this.ctx.post('/api/dev/e2e/seed-salon', {
      data: { phone, source, externalId, snapshotName },
    })
    if (!res.ok()) {
      throw new Error(
        `Dev seed failed (${res.status()}). Start backend with DEV_ENDPOINTS=1 DEV_OTP_BYPASS_ANY=1 or check /api/dev/e2e/seed-salon`
      )
    }
    const body = await res.json()
    const salonId = (body?.salonId as string | undefined) ?? null
    const tokenPair = body?.tokenPair as
      | { accessToken?: string; refreshToken?: string }
      | undefined

    if (tokenPair?.accessToken && tokenPair?.refreshToken) {
      this.tokens.set(phone, {
        access: tokenPair.accessToken,
        refresh: tokenPair.refreshToken,
      })
    }
    this.defaultSalonId = salonId
  }
}
