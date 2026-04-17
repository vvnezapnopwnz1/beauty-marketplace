import { authFetch } from './authApi'
import { publicApiUrl } from '@shared/lib/apiPublicUrl'

const root = () => publicApiUrl('/api/v1/master-dashboard')

export interface MasterCabinetProfile {
  id: string
  displayName: string
  bio?: string | null
  specializations: string[]
  yearsExperience?: number | null
  avatarUrl?: string | null
  phoneE164: string
}

export interface UpdateMasterCabinetProfile {
  displayName: string
  bio?: string | null
  specializations: string[]
  yearsExperience?: number | null
  avatarUrl?: string | null
}

export interface MasterInviteDTO {
  salonMasterId: string
  salonId: string
  salonName: string
  salonAddress?: string | null
  createdAt: string
}

export interface MasterSalonMembershipDTO {
  salonMasterId: string
  salonId: string
  salonName: string
  salonAddress?: string | null
  joinedAt?: string | null
}

export interface MasterDashboardAppointment {
  id: string
  salonId: string
  salonName: string
  startsAt: string
  endsAt: string
  status: string
  serviceName: string
  clientLabel: string
  clientPhone?: string | null
  serviceId: string
  salonMasterId?: string | null
}

export interface MasterDashboardAppointmentList {
  items: MasterDashboardAppointment[]
  total: number
}

export async function getMyMasterProfile(): Promise<MasterCabinetProfile> {
  const res = await authFetch(`${root()}/profile`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function updateMyMasterProfile(data: UpdateMasterCabinetProfile): Promise<MasterCabinetProfile> {
  const res = await authFetch(`${root()}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error((errData as { error?: string }).error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function getMyMasterInvites(): Promise<MasterInviteDTO[]> {
  const res = await authFetch(`${root()}/invites`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function acceptMasterInvite(salonMasterId: string): Promise<void> {
  const res = await authFetch(`${root()}/invites/${salonMasterId}/accept`, { method: 'POST' })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error((errData as { error?: string }).error || `HTTP ${res.status}`)
  }
}

export async function declineMasterInvite(salonMasterId: string): Promise<void> {
  const res = await authFetch(`${root()}/invites/${salonMasterId}/decline`, { method: 'POST' })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error((errData as { error?: string }).error || `HTTP ${res.status}`)
  }
}

export async function getMyMasterSalons(): Promise<MasterSalonMembershipDTO[]> {
  const res = await authFetch(`${root()}/salons`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export interface MasterAppointmentsParams {
  from?: string
  to?: string
  status?: string
}

export async function getMyMasterAppointments(params?: MasterAppointmentsParams): Promise<MasterDashboardAppointmentList> {
  const q = new URLSearchParams()
  if (params?.from) q.set('from', params.from)
  if (params?.to) q.set('to', params.to)
  if (params?.status) q.set('status', params.status)
  const qs = q.toString()
  const url = `${root()}/appointments${qs ? `?${qs}` : ''}`
  const res = await authFetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
