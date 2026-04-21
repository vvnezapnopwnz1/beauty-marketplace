import { authFetch } from './authApi'
import { publicApiUrl } from '@shared/lib/apiPublicUrl'

const base = () => publicApiUrl('/api/v1/dashboard/clients')

export interface ClientTag {
  id: string
  salonId?: string | null
  name: string
  color: string
}

export interface SalonClient {
  id: string
  salonId: string
  userId?: string | null
  phoneE164?: string | null
  displayName: string
  notes?: string | null
  tags: ClientTag[]
  visitCount: number
  lastVisitAt?: string | null
  userPhone?: string | null
  userDisplayName?: string | null
  createdAt: string
}

export interface ClientListResponse {
  items: SalonClient[]
  total: number
}

export interface ClientAppointmentRow {
  id: string
  startsAt: string
  endsAt: string
  status: string
  serviceName: string
  staffName?: string | null
  clientLabel: string
  clientPhone?: string | null
}

export interface ClientAppointmentListResponse {
  items: ClientAppointmentRow[]
  total: number
}

export interface ClientListParams {
  search?: string
  tagIds?: string[]
  page?: number
  pageSize?: number
}

export async function fetchClients(params: ClientListParams = {}): Promise<ClientListResponse> {
  const q = new URLSearchParams()
  if (params.search) q.set('search', params.search)
  if (params.tagIds?.length) q.set('tag_ids', params.tagIds.join(','))
  if (params.page) q.set('page', String(params.page))
  if (params.pageSize) q.set('page_size', String(params.pageSize))
  const res = await authFetch(`${base()}?${q}`)
  if (!res.ok) throw new Error('fetch clients failed')
  return res.json()
}

export async function fetchClient(clientId: string): Promise<SalonClient> {
  const res = await authFetch(`${base()}/${clientId}`)
  if (!res.ok) throw new Error('fetch client failed')
  return res.json()
}

export async function updateClient(
  clientId: string,
  data: { displayName?: string; notes?: string },
): Promise<SalonClient> {
  const res = await authFetch(`${base()}/${clientId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('update client failed')
  return res.json()
}

export async function fetchClientAppointments(
  clientId: string,
  page = 1,
  pageSize = 25,
): Promise<ClientAppointmentListResponse> {
  const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  const res = await authFetch(`${base()}/${clientId}/appointments?${q}`)
  if (!res.ok) throw new Error('fetch client appointments failed')
  return res.json()
}

export async function fetchTags(): Promise<ClientTag[]> {
  const res = await authFetch(`${base()}/tags`)
  if (!res.ok) throw new Error('fetch tags failed')
  return res.json()
}

export async function createTag(data: { name: string; color: string }): Promise<ClientTag> {
  const res = await authFetch(`${base()}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('create tag failed')
  return res.json()
}

export async function assignTag(clientId: string, tagId: string): Promise<void> {
  const res = await authFetch(`${base()}/${clientId}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tagId }),
  })
  if (!res.ok) throw new Error('assign tag failed')
}

export async function removeTag(clientId: string, tagId: string): Promise<void> {
  const res = await authFetch(`${base()}/${clientId}/tags/${tagId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('remove tag failed')
}

export async function mergeClientToUser(clientId: string, userId: string): Promise<void> {
  const res = await authFetch(`${base()}/${clientId}/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
  if (!res.ok) throw new Error('merge failed')
}
