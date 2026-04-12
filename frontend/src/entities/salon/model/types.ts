export type BusinessType = 'venue' | 'individual'

export type CategoryId =
  | 'hair'
  | 'nails'
  | 'spa'
  | 'barber'
  | 'brows'
  | 'makeup'
  | 'massage'
  | 'skin'
  | 'hair_removal'

export type SalonBadge = 'popular' | 'top' | 'new'

export type CardGradient = 'bg1' | 'bg2' | 'bg3' | 'bg4' | 'bg5' | 'bg6'

export interface Service {
  /** Present when loaded from API; required for online booking */
  id?: string
  name: string
  durationMinutes: number
  priceCents: number
}

/** Optional rows for «Контакты» on the profile (e.g. 2GIS-derived) */
export interface SalonContactRow {
  icon: string
  label: string
  value: string
}

export interface Salon {
  id: string
  name: string
  category: CategoryId
  businessType: BusinessType
  rating: number
  reviewCount: number
  distanceKm: number
  address: string
  district: string
  services: Service[]
  availableToday: boolean
  onlineBooking: boolean
  photoUrl: string | null
  badge?: SalonBadge
  cardGradient: CardGradient
  emoji: string
  contactRows?: SalonContactRow[]
}
