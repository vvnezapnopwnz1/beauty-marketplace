const API = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

export interface ApiService {
  id: string
  name: string
  durationMinutes: number
  priceCents: number
}

export interface ApiSalon {
  id: string
  name: string
  category: string
  businessType: string
  rating: number
  reviewCount: number
  distanceKm: number
  address: string
  district: string
  services: ApiService[]
  availableToday: boolean
  onlineBooking: boolean
  photoUrl: string | null
  photos: string[]
  description: string
  phonePublic: string
  timezone: string
  workingHours: WorkingHourDTO[]
  badge?: string
  cardGradient: string
  emoji: string
}

export interface WorkingHourDTO {
  dayOfWeek: number
  opensAt: string
  closesAt: string
  isClosed: boolean
  breakStartsAt?: string
  breakEndsAt?: string
}

export interface SalonListParams {
  lat?: number
  lon?: number
  category?: string
  onlineOnly?: boolean
}

export async function fetchSalons(params: SalonListParams = {}): Promise<ApiSalon[]> {
  const qs = new URLSearchParams()
  if (params.lat != null) qs.set('lat', String(params.lat))
  if (params.lon != null) qs.set('lon', String(params.lon))
  if (params.category) qs.set('category', params.category)
  if (params.onlineOnly) qs.set('online_only', 'true')
  const res = await fetch(`${API}/v1/salons?${qs}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`http_${res.status}`)
  return res.json()
}

export interface GuestBookingResponse {
  appointmentId: string
  startsAt: string
  endsAt: string
}

export async function fetchSalonById(salonId: string): Promise<ApiSalon> {
  const res = await fetch(`${API}/v1/salons/${salonId}`, { cache: 'no-store' })
  if (!res.ok) {
    if (res.status === 404) throw new Error('not_found')
    throw new Error(`http_${res.status}`)
  }
  return res.json()
}

export async function fetchSalonByExternal(
  source: string,
  externalId: string,
): Promise<{ salonId: string; onlineBooking: boolean } | null> {
  const qs = new URLSearchParams({ source, id: externalId })
  const res = await fetch(`${API}/v1/salons/by-external?${qs}`, { cache: 'no-store' })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`http_${res.status}`)
  return res.json()
}

export interface SalonMasterProfilePublic {
  id: string
  bio: string | null
  specializations: string[]
  avatarUrl: string | null
  yearsExperience: number | null
  cachedRating: number | null
  cachedReviewCount: number
}

export interface SalonMasterServicePublic {
  serviceId: string
  serviceName: string
  durationMinutes: number
  priceCents: number
  priceOverrideCents: number | null
  effectivePriceCents: number
}

export interface SalonMasterPublic {
  id: string
  displayName: string
  color?: string | null
  masterProfile?: SalonMasterProfilePublic | null
  services: SalonMasterServicePublic[]
}

export async function fetchSalonMasters(salonId: string): Promise<SalonMasterPublic[]> {
  const res = await fetch(`${API}/v1/salons/${salonId}/masters`, { cache: 'no-store' })
  if (!res.ok) {
    if (res.status === 404) throw new Error('not_found')
    throw new Error(`http_${res.status}`)
  }
  return res.json()
}

export interface MasterSalonCardPublic {
  salonMasterId: string
  salonId: string
  salonName: string
  salonAddress: string
  displayNameInSalon: string
  services: string[]
  joinedAt?: string | null
}

export interface MasterProfilePublic {
  id: string
  displayName: string
  bio?: string | null
  specializations: string[]
  avatarUrl: string | null
  yearsExperience?: number | null
  cachedRating?: number | null
  cachedReviewCount: number
  headerCalendarColor?: string | null
  salons: MasterSalonCardPublic[]
}

export async function fetchMasterProfile(masterProfileId: string): Promise<MasterProfilePublic> {
  const res = await fetch(`${API}/v1/masters/${masterProfileId}`, { cache: 'no-store' })
  if (!res.ok) {
    if (res.status === 404) throw new Error('not_found')
    throw new Error(`http_${res.status}`)
  }
  return res.json()
}

export async function submitGuestBooking(
  salonId: string,
  body: {
    serviceId: string
    /** When several services are booked, all ids (same order as UI); first must match serviceId. */
    serviceIds?: string[]
    name: string
    phone: string
    note?: string
    startsAt?: string
    endsAt?: string
    salonMasterId?: string
    masterProfileId?: string
  },
): Promise<GuestBookingResponse> {
  const payload: Record<string, unknown> = {
    serviceId: body.serviceId,
    name: body.name,
    phone: body.phone,
  }
  if (body.serviceIds != null && body.serviceIds.length > 1) {
    payload.serviceIds = body.serviceIds
  }
  if (body.note?.trim()) payload.note = body.note.trim()
  if (body.startsAt) payload.startsAt = body.startsAt
  if (body.endsAt) payload.endsAt = body.endsAt
  if (body.salonMasterId) payload.salonMasterId = body.salonMasterId
  if (body.masterProfileId) payload.masterProfileId = body.masterProfileId

  const res = await fetch(`${API}/v1/salons/${salonId}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `http_${res.status}`)
  }
  return data
}

export interface PublicAvailableSlot {
  startsAt: string
  endsAt: string
  salonMasterId: string
  masterName: string
}

export interface PublicSlotMasterInfo {
  salonMasterId: string
  masterName: string
}

export interface PublicSlotsResponse {
  date: string
  slotDurationMinutes: number
  slots: PublicAvailableSlot[]
  masters: PublicSlotMasterInfo[]
}

export async function fetchPublicSlots(
  salonId: string,
  params: {
    date: string
    serviceId?: string
    serviceIds?: string[]
    masterProfileId?: string
    salonMasterId?: string
  },
): Promise<PublicSlotsResponse> {
  const qs = new URLSearchParams()
  qs.set('date', params.date)
  if (params.serviceIds != null && params.serviceIds.length > 0) {
    qs.set('serviceIds', params.serviceIds.join(','))
  } else if (params.serviceId) {
    qs.set('serviceId', params.serviceId)
  }
  if (params.masterProfileId) qs.set('masterProfileId', params.masterProfileId)
  if (params.salonMasterId) qs.set('salonMasterId', params.salonMasterId)
  const res = await fetch(`${API}/v1/salons/${salonId}/slots?${qs}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`http_${res.status}`)
  return res.json()
}
