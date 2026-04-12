/* global RequestInfo, RequestInit */
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
}

export interface VerifyOTPResponse {
  tokenPair: TokenPair
  user: UserInfo
  isNew: boolean
}

export interface OTPRequestResponse {
  expiresAt: string
}

const TOKEN_KEY = 'beauty_access_token'
const REFRESH_KEY = 'beauty_refresh_token'

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

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

export async function authFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const token = getStoredAccessToken()
  const headers = new Headers(init?.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
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

export async function requestOTP(phone: string): Promise<OTPRequestResponse> {
  const res = await fetch(`${API_BASE}/api/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Network error' }))
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
  const res = await authFetch(`${API_BASE}/api/auth/me`)
  if (!res.ok) throw new Error('unauthorized')
  return res.json()
}

export async function logout(): Promise<void> {
  await authFetch(`${API_BASE}/api/auth/logout`, { method: 'POST' })
  clearTokens()
}
