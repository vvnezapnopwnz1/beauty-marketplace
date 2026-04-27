// src/entities/client/model/types.ts

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
  extraContact?: string | null
  displayName: string
  notes?: string | null
  tags: ClientTag[]
  visitCount: number
  lastVisitAt?: string | null
  userPhone?: string | null
  userDisplayName?: string | null
  deletedAt?: string | null
  createdAt: string
}

export interface ClientListResponse {
  items: SalonClient[]
  total: number
}

export interface ClientListRequest {
  search?: string
  tagIds?: string[]
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
  includeDead?: boolean
}

export interface ClientFilterState {
  search: string
  tagIds: string[]
  includeDead: boolean
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
