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
  badge?: string
  cardGradient: string
  emoji: string
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

export async function submitGuestBooking(
  salonId: string,
  body: { serviceId: string; name: string; phone: string; note?: string },
): Promise<GuestBookingResponse> {
  const res = await fetch(`${API}/v1/salons/${salonId}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      serviceId: body.serviceId,
      name: body.name,
      phone: body.phone,
      ...(body.note?.trim() ? { note: body.note.trim() } : {}),
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `http_${res.status}`)
  }
  return data
}
