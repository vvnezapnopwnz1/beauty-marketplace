import type { CardGradient, SalonContactRow, SalonView, WorkingHourRow } from '@entities/salon'
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

function contactRowsFromPlace(d: PlaceDetail): SalonContactRow[] {
  const contacts = d.contacts ?? []
  return contacts
    .filter(c => ['phone', 'email', 'website'].includes(c.type))
    .map(c => ({
      type: c.type as 'phone' | 'email' | 'website',
      value: c.type === 'website' ? displaySiteValue(c.value.trim()) : c.value.trim(),
      label: c.label,
    }))
}

/**
 * Maps 2GIS-backed place detail to the shared Salon card model.
 * Platform fields (services, online booking, distance) stay empty/disabled.
 */
function scheduleFromPlace(d: PlaceDetail): { workingHours?: WorkingHourRow[]; schedule247?: boolean } {
  if (d.schedule247) return { schedule247: true, workingHours: undefined }
  const days = d.weeklySchedule ?? []
  const workingHours: WorkingHourRow[] = days.slice(0, 7).map((day, index) => {
    const first = day.workingHours?.[0]
    if (!first) {
      return {
        dayOfWeek: index,
        opensAt: '',
        closesAt: '',
        isClosed: true,
      }
    }
    return {
      dayOfWeek: index,
      opensAt: first.from.slice(0, 5),
      closesAt: first.to.slice(0, 5),
      isClosed: false,
    }
  })
  return { workingHours, schedule247: false }
}

export function placeDetailToSalon(d: PlaceDetail): SalonView {
  const addr = d.fullAddressName || d.address || ''
  const rating = d.rating ?? 0
  const reviewCount = d.reviewCount ?? 0
  const photos = d.photoUrls ?? []
  const schedule = scheduleFromPlace(d)
  return {
    mode: 'place',
    externalId: d.externalId,
    name: d.name,
    rating,
    reviewCount,
    address: addr,
    district: d.rubricNames?.[0] ?? '',
    photos: photos.filter(Boolean),
    description: d.description,
    cardGradient: pickGradient(d.name),
    emoji: pickEmoji(d.name),
    services: [],
    workingHours: schedule.workingHours,
    schedule247: schedule.schedule247,
    scheduleComment: d.scheduleComment,
    contactRows: contactRowsFromPlace(d),
    canBookOnline: false,
    hasOwner: false,
    timezone: 'Europe/Moscow',
  }
}
