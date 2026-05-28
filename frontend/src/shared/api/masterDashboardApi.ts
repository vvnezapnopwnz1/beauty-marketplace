import { authFetch } from './authApi'
import { publicApiUrl } from '@shared/lib/apiPublicUrl'
import type { DashboardServiceCategoriesResponse } from './dashboardApi'

const apiV1 = () => publicApiUrl('/api/v1')

const root = () => publicApiUrl('/api/v1/master-dashboard')

export interface MasterCabinetProfile {
  id: string
  displayName: string
  bio?: string | null
  specializations: string[]
  yearsExperience?: number | null
  avatarUrl?: string | null
  phoneE164: string
  publishedAt?: string | null
  onboardingStep?: string | null
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
  clientNote?: string | null
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
  const url = `${root()}/profile`
  const body = JSON.stringify(data)
  console.log('[updateMyMasterProfile] PUT', url, body)
  const res = await authFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    console.error('[updateMyMasterProfile] failed', res.status, errData)
    throw new Error((errData as { error?: string }).error || `HTTP ${res.status}`)
  }
  const json = await res.json()
  console.log('[updateMyMasterProfile] success', json)
  return json
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
  page?: number
  page_size?: number
}

export async function getMyMasterAppointments(params?: MasterAppointmentsParams): Promise<MasterDashboardAppointmentList> {
  const q = new URLSearchParams()
  if (params?.from) q.set('from', params.from)
  if (params?.to) q.set('to', params.to)
  if (params?.status) q.set('status', params.status)
  if (params?.page) q.set('page', params.page.toString())
  if (params?.page_size) q.set('page_size', params.page_size.toString())
  const qs = q.toString()
  const url = `${root()}/appointments${qs ? `?${qs}` : ''}`
  const res = await authFetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export interface ManualAppointmentInput {
  startsAt: string
  serviceIds: string[]
  guestName: string
  guestPhone: string
  clientNote?: string
  clientUserId?: string
}

export async function createPersonalAppointment(data: ManualAppointmentInput): Promise<MasterDashboardAppointment> {
  const res = await authFetch(`${root()}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error((errData as { error?: string }).error || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function updatePersonalAppointment(id: string, data: Partial<ManualAppointmentInput>): Promise<void> {
  const res = await authFetch(`${root()}/appointments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error((errData as { error?: string }).error || `HTTP ${res.status}`)
  }
}

export async function uploadMasterAvatar(
  masterProfileId: string,
  file: File,
): Promise<{ avatarUrl: string }> {
  const url = `${apiV1()}/master-profiles/${masterProfileId}/photo`
  const form = new FormData()
  form.append('avatar', file)
  console.log('[uploadMasterAvatar] POST', url, 'file:', file.name, file.size, file.type)
  const res = await authFetch(url, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    console.error('[uploadMasterAvatar] failed', res.status, data)
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`)
  }
  const json = await res.json()
  console.log('[uploadMasterAvatar] success', json)
  return json
}

export async function fetchMasterServiceCategories(): Promise<DashboardServiceCategoriesResponse> {
  const res = await authFetch(`${root()}/service-categories`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`)
  }
  return res.json()
}

// MasterServices
export interface MasterService {
  id: string
  name: string
  categorySlug?: string
  description?: string
  priceCents?: number
  durationMinutes: number
  isActive: boolean
}

export type CreateMasterServiceInput = Omit<MasterService, 'id' | 'isActive'>

export async function getMasterServices(): Promise<MasterService[]> {
  const res = await authFetch(`${root()}/services`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function createMasterService(data: CreateMasterServiceInput): Promise<MasterService> {
  const res = await authFetch(`${root()}/services`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function updateMasterService(id: string, data: CreateMasterServiceInput): Promise<MasterService> {
  const res = await authFetch(`${root()}/services/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function deleteMasterService(id: string): Promise<void> {
  const res = await authFetch(`${root()}/services/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// MasterClients
export interface MasterClient {
  id: string
  displayName: string
  phone?: string
  notes?: string
  extraContact?: string
  userId?: string
}

export type CreateMasterClientInput = Omit<MasterClient, 'id'>

export async function getMasterClients(): Promise<MasterClient[]> {
  const res = await authFetch(`${root()}/clients`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function createMasterClient(data: CreateMasterClientInput): Promise<MasterClient> {
  const res = await authFetch(`${root()}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function updateMasterClient(id: string, data: CreateMasterClientInput): Promise<MasterClient> {
  const res = await authFetch(`${root()}/clients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function deleteMasterClient(id: string): Promise<void> {
  const res = await authFetch(`${root()}/clients/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// MasterSchedule
export interface MasterWorkingHour {
  dayOfWeek: number
  opensAt: string
  closesAt: string
  isClosed: boolean
}

export interface UpdateMasterScheduleInput {
  hours: MasterWorkingHour[]
}

export async function getMasterSchedule(): Promise<MasterWorkingHour[]> {
  const res = await authFetch(`${root()}/schedule`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function updateMasterSchedule(data: UpdateMasterScheduleInput): Promise<MasterWorkingHour[]> {
  const res = await authFetch(`${root()}/schedule`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
