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

export interface ClientListRequest {
  search?: string
  tagIds?: string[]
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface ClientFilterState {
  search: string
  tagIds: string[]
}
