export type BusinessType = 'venue' | 'individual'

export type CategoryId =
  | 'all'
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
  name: string
  durationMinutes: number
  priceCents: number
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
}
