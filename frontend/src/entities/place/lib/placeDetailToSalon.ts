import type { Salon, CardGradient, SalonContactRow } from '@entities/salon'
import { CARD_GRADIENTS } from '@entities/salon'
import type { PlaceDetail } from '@shared/api/placesApi'

const GRADIENT_KEYS = Object.keys(CARD_GRADIENTS) as CardGradient[]

const EMOJIS = ['✂', '💅', '✦', '🪒', '✻', '💆']

function pickGradient(name: string): CardGradient {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return GRADIENT_KEYS[Math.abs(hash) % GRADIENT_KEYS.length]
}

function pickEmoji(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 37 + name.charCodeAt(i)) | 0
  return EMOJIS[Math.abs(hash) % EMOJIS.length]
}

/** Stable id for routing and keys; not a platform UUID */
export function placeSalonId(externalId: string): string {
  return `place:${externalId}`
}

export function isPlaceSalonId(id: string): boolean {
  return id.startsWith('place:')
}

export function externalIdFromPlaceSalonId(id: string): string {
  return id.slice('place:'.length)
}

function displaySiteValue(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`)
    return u.hostname.replace(/^www\./, '') + (u.pathname && u.pathname !== '/' ? u.pathname : '')
  } catch {
    return url
  }
}

function contactRowsFromPlace(d: PlaceDetail, address: string): SalonContactRow[] {
  const contacts = d.contacts ?? []
  const phone = contacts.find(c => c.type === 'phone')?.value
  const site = contacts.find(c => c.type === 'website' || /^https?:\/\//i.test(c.value.trim()))?.value
  return [
    { icon: '📍', label: 'Адрес', value: address || '—' },
    { icon: '📞', label: 'Телефон', value: phone?.trim() || '—' },
    { icon: '🌐', label: 'Сайт', value: site?.trim() ? displaySiteValue(site.trim()) : '—' },
    { icon: '📸', label: 'Instagram', value: '—' },
  ]
}

/**
 * Maps 2GIS-backed place detail to the shared Salon card model.
 * Platform fields (services, online booking, distance) stay empty/disabled.
 */
export function placeDetailToSalon(d: PlaceDetail): Salon {
  const addr = d.fullAddressName || d.address || ''
  const rating = d.rating ?? 0
  const reviewCount = d.reviewCount ?? 0
  const photos = d.photoUrls ?? []
  return {
    id: placeSalonId(d.externalId),
    name: d.name,
    category: 'hair',
    businessType: 'venue',
    rating,
    reviewCount,
    distanceKm: 0,
    address: addr,
    district: d.rubricNames?.[0] ?? '',
    services: [],
    availableToday: false,
    onlineBooking: false,
    photoUrl: photos[0]?.trim() || null,
    cardGradient: pickGradient(d.name),
    emoji: pickEmoji(d.name),
    contactRows: contactRowsFromPlace(d, addr),
  }
}
