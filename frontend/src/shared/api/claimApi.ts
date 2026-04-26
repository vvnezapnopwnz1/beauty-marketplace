import { publicApiUrl } from '@shared/lib/apiPublicUrl'

import { authFetch } from './authApi'

const base = () => publicApiUrl('/api/v1')

export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'duplicate'
export type ClaimRelation = 'owner' | 'manager' | 'representative'

export interface SubmitClaimPayload {
  source: string
  externalId: string
  relationType: ClaimRelation
  comment?: string
  snapshotName: string
  snapshotAddress?: string
  snapshotPhone?: string
  snapshotPhoto?: string
}

export interface SubmitClaimResponse {
  claimId: string
  status: ClaimStatus
  estimatedReviewDays: number
}

export interface ClaimStatusResponse {
  claimId: string
  status: ClaimStatus
  rejectionReason?: string | null
  salonId?: string | null
  createdAt: string
}

export interface AdminClaimItem {
  id: string
  status: ClaimStatus
  relationType: ClaimRelation
  comment?: string | null
  createdAt: string
  user: { id: string; phone: string; displayName?: string | null }
  place: { name: string; address?: string | null; phone?: string | null; photoUrl?: string | null }
}

export interface AdminClaimsResponse {
  items: AdminClaimItem[]
  total: number
}

export async function submitClaim(payload: SubmitClaimPayload): Promise<SubmitClaimResponse> {
  const res = await authFetch(`${base()}/salons/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = Object.assign(new Error((body as { error?: string }).error ?? 'submit_claim_failed'), {
      status: res.status,
      body,
    })
    throw err
  }
  return res.json()
}

export async function fetchMyClaimStatus(
  source: string,
  externalId: string,
): Promise<ClaimStatusResponse | null> {
  const res = await authFetch(
    `${base()}/salons/claim/my-status?source=${source}&externalId=${encodeURIComponent(externalId)}`,
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error('fetch_claim_status_failed')
  return res.json()
}

export async function fetchAdminClaims(
  status = 'pending',
  page = 1,
  pageSize = 20,
): Promise<AdminClaimsResponse> {
  const res = await authFetch(`${base()}/admin/claims?status=${status}&page=${page}&page_size=${pageSize}`)
  if (!res.ok) throw new Error('fetch_admin_claims_failed')
  return res.json()
}

export async function approveClaim(claimId: string): Promise<{ salonId: string }> {
  const res = await authFetch(`${base()}/admin/claims/${claimId}/approve`, { method: 'PUT' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw Object.assign(new Error((body as { error?: string }).error ?? 'approve_failed'), {
      status: res.status,
    })
  }
  return res.json()
}

export async function rejectClaim(claimId: string, reason: string): Promise<void> {
  const res = await authFetch(`${base()}/admin/claims/${claimId}/reject`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  if (!res.ok) throw new Error('reject_failed')
}
