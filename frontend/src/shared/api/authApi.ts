/* global RequestInfo, RequestInit */
import { getActiveSalonId } from '@shared/lib/activeSalon'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface UserInfo {
  id: string
  phone: string
  displayName: string | null
  role: string
  sessionId?: string | null
  effectiveRoles?: {
    isClient: boolean
    isMaster: boolean
    isPlatformAdmin: boolean
    salonMemberships: Array<{ salonId: string; salonName: string; role: 'owner' | 'admin' | 'receptionist' }>
    pendingInvites: number
  }
  /** Present when this user owns a master_profiles row (after claiming or registration). */
  masterProfileId?: string | null
}

export interface VerifyOTPResponse {
  tokenPair: TokenPair
  user: UserInfo
  isNew: boolean
}

export interface OTPRequestResponse {
  expiresAt: string
}

export interface TelegramNotLinkedErrorPayload {
  error: 'telegram_not_linked'
  botUsername: string
}

export class TelegramNotLinkedError extends Error {
  readonly botUsername: string

  constructor(botUsername: string) {
    super('telegram_not_linked')
    this.name = 'TelegramNotLinkedError'
    this.botUsername = botUsername
  }
}

const TOKEN_KEY = 'beauty_access_token'
const REFRESH_KEY = 'beauty_refresh_token'
const SESSION_ID_KEY = 'beauty_session_id'

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY)
}

export function storeTokens(pair: TokenPair) {
  localStorage.setItem(TOKEN_KEY, pair.accessToken)
  localStorage.setItem(REFRESH_KEY, pair.refreshToken)
}

export function storeSessionId(sessionId: string | null | undefined) {
  if (!sessionId) {
    localStorage.removeItem(SESSION_ID_KEY)
    return
  }
  localStorage.setItem(SESSION_ID_KEY, sessionId)
}

export function getStoredSessionId(): string | null {
  return localStorage.getItem(SESSION_ID_KEY)
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(SESSION_ID_KEY)
}

export async function authFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const token = getStoredAccessToken()
  const headers = new Headers(init?.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const sessionId = getStoredSessionId()
  if (sessionId) {
    headers.set('X-Session-Id', sessionId)
  }
  const salonId = getActiveSalonId()
  if (salonId && !headers.has('X-Salon-Id')) {
    headers.set('X-Salon-Id', salonId)
  }
  let res = await fetch(input, { ...init, headers })

  if (res.status === 401 && getStoredRefreshToken()) {
    const refreshed = await refreshTokens()
    if (refreshed) {
      headers.set('Authorization', `Bearer ${refreshed.accessToken}`)
      res = await fetch(input, { ...init, headers })
    }
  }
  return res
}

export async function requestOTP(
  phone: string,
  channel: 'sms' | 'telegram' = 'sms',
): Promise<OTPRequestResponse> {
  const res = await fetch(`${API_BASE}/api/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, channel }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Network error' })) as
      | { error?: string; botUsername?: string }
      | TelegramNotLinkedErrorPayload
    if (data.error === 'telegram_not_linked') {
      throw new TelegramNotLinkedError(data.botUsername || '')
    }
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function verifyOTP(phone: string, code: string): Promise<VerifyOTPResponse> {
  const res = await fetch(`${API_BASE}/api/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Network error' }))
    throw new Error(data.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function refreshTokens(): Promise<TokenPair | null> {
  const refreshToken = getStoredRefreshToken()
  if (!refreshToken) return null

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) {
      clearTokens()
      return null
    }
    const pair: TokenPair = await res.json()
    storeTokens(pair)
    return pair
  } catch {
    clearTokens()
    return null
  }
}

export async function fetchMe(): Promise<UserInfo> {
  const res = await authFetch(`${API_BASE}/api/v1/me`)
  if (!res.ok) throw new Error('unauthorized')
  const data = await res.json() as {
    id: string
    phone: string
    displayName: string | null
    globalRole: string
    effectiveRoles?: UserInfo['effectiveRoles']
    masterProfileId?: string | null
  }
  return {
    id: data.id,
    phone: data.phone,
    displayName: data.displayName ?? null,
    role: data.globalRole,
    effectiveRoles: data.effectiveRoles,
    masterProfileId: data.masterProfileId ?? null,
  }
}

export async function logout(): Promise<void> {
  await authFetch(`${API_BASE}/api/auth/logout`, { method: 'POST' })
  clearTokens()
}
