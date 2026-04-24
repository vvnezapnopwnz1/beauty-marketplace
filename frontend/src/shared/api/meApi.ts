import { authFetch } from '@shared/api/authApi'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export interface SalonRef {
  salonId: string
}

export interface EffectiveRoles {
  isClient: boolean
  isMaster: boolean
  isPlatformAdmin: boolean
  ownerOfSalons: SalonRef[]
  adminOfSalons: SalonRef[]
}

export interface UserProfile {
  id: string
  phone: string
  username: string | null
  displayName: string | null
  firstName: string | null
  lastName: string | null
  birthDate: string | null
  gender: string | null
  city: string | null
  bio: string | null
  locale: 'ru' | 'en'
  themePref: 'light' | 'dark' | 'system'
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
  globalRole: string
  effectiveRoles: EffectiveRoles
  masterProfileId: string | null
}

export interface UpdateMePayload {
  username?: string | null
  displayName?: string | null
  firstName?: string | null
  lastName?: string | null
  birthDate?: string | null
  gender?: string | null
  city?: string | null
  bio?: string | null
  locale?: 'ru' | 'en'
  themePref?: 'light' | 'dark' | 'system'
  avatarUrl?: string | null
}

export interface UserSession {
  id: string
  createdAt: string
  expiresAt: string
  isCurrent: boolean
}

export interface DeleteMeConflictError extends Error {
  code: 'has_owned_salons'
  salonIds: string[]
}

async function parseError(res: Response): Promise<{ error: string; field?: string }> {
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
  return {
    error: String((data as { error?: string }).error ?? `HTTP ${res.status}`),
    field: (data as { field?: string }).field,
  }
}

export async function fetchMyProfile(): Promise<UserProfile> {
  const res = await authFetch(`${API_BASE}/api/v1/me`)
  if (!res.ok) {
    const e = await parseError(res)
    throw new Error(e.error)
  }
  return res.json()
}

export async function updateMyProfile(payload: UpdateMePayload): Promise<UserProfile> {
  const res = await authFetch(`${API_BASE}/api/v1/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const e = await parseError(res)
    const err = new Error(e.error) as Error & { field?: string }
    err.field = e.field
    throw err
  }
  return res.json()
}

export async function fetchMySessions(): Promise<UserSession[]> {
  const res = await authFetch(`${API_BASE}/api/v1/me/sessions`)
  if (!res.ok) {
    const e = await parseError(res)
    throw new Error(e.error)
  }
  return res.json()
}

export async function revokeSession(sessionId: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/v1/me/sessions/${sessionId}`, { method: 'DELETE' })
  if (!res.ok) {
    const e = await parseError(res)
    throw new Error(e.error)
  }
}

export async function revokeAllSessions(): Promise<{ revoked: number }> {
  const res = await authFetch(`${API_BASE}/api/v1/me/sessions/revoke-all`, { method: 'POST' })
  if (!res.ok) {
    const e = await parseError(res)
    throw new Error(e.error)
  }
  return res.json()
}

export async function deleteMyAccount(): Promise<void> {
  const res = await authFetch(`${API_BASE}/api/v1/me`, { method: 'DELETE' })
  if (res.ok) return
  const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as {
    error?: string
    salonIds?: string[]
  }
  if (res.status === 409 && body.error === 'has_owned_salons') {
    const err = new Error('has_owned_salons') as DeleteMeConflictError
    err.code = 'has_owned_salons'
    err.salonIds = body.salonIds ?? []
    throw err
  }
  throw new Error(body.error ?? `HTTP ${res.status}`)
}
