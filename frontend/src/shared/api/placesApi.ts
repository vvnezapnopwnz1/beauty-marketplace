import { useState, useCallback } from 'react'
import { publicApiUrl } from '@shared/lib/apiPublicUrl'

export interface PlaceItem {
  externalId: string
  name: string
  address?: string
  lat: number
  lon: number
  photoUrl?: string | null
  rating?: number | null
  reviewCount?: number | null
  rubricNames?: string[]
}

export interface PlacesSearchResult {
  items: PlaceItem[]
  total: number
}

export interface PlacesSearchParams {
  q: string
  lat: number
  lon: number
  region_id?: number
  radius?: number
  page?: number
  page_size?: number
  category?: string
  clientAction?: string
}

export async function searchPlaces(params: {
  q: string
  pageSize?: number
  page?: number
  lat?: number
  lon?: number
}): Promise<PlacesSearchResult> {
  const qs = new URLSearchParams({
    q: params.q,
    lat: String(params.lat ?? 55.751244),
    lon: String(params.lon ?? 37.618423),
    page: String(params.page ?? 1),
    page_size: String(params.pageSize ?? 10),
  })
  const url = publicApiUrl(`/api/v1/places/search?${qs}`)
  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      'X-Client-Request-ID': buildClientRequestId(),
      'X-Client-Action': 'join_search_place',
      'X-Client-Request-URL': typeof window !== 'undefined' ? new URL(url, window.location.href).href : url,
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export interface PlaceContact {
  type: string
  value: string
  label?: string
}

export interface PlaceScheduleDay {
  day: string
  workingHours?: { from: string; to: string }[]
  is247?: boolean
  comment?: string
}

export interface PlaceDetail {
  externalId: string
  name: string
  address?: string
  fullAddressName?: string
  lat: number
  lon: number
  description?: string
  photoUrls?: string[]
  rating?: number | null
  reviewCount?: number | null
  rubricNames?: string[]
  orgName?: string
  brandName?: string
  scheduleComment?: string
  schedule247?: boolean
  weeklySchedule?: PlaceScheduleDay[]
  contacts?: PlaceContact[]
  twoGisAlias?: string
}

function buildClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizePlaceDetail(raw: PlaceDetail): PlaceDetail {
  return {
    ...raw,
    photoUrls: Array.isArray(raw.photoUrls) ? raw.photoUrls : [],
    rubricNames: Array.isArray(raw.rubricNames) ? raw.rubricNames : undefined,
    weeklySchedule: Array.isArray(raw.weeklySchedule) ? raw.weeklySchedule : undefined,
    contacts: Array.isArray(raw.contacts) ? raw.contacts : undefined,
  }
}

export async function fetchPlaceByExternalId(externalId: string): Promise<PlaceDetail> {
  const id = encodeURIComponent(externalId)
  const res = await fetch(publicApiUrl(`/api/v1/places/item/${id}`), { cache: 'no-store' })
  if (res.status === 404) throw new Error('not_found')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const raw = (await res.json()) as PlaceDetail
  return normalizePlaceDetail(raw)
}

export function usePlacesSearch() {
  const [data, setData] = useState<PlacesSearchResult | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (params: PlacesSearchParams) => {
    setIsFetching(true)
    setError(null)
    try {
      const qs = new URLSearchParams({
        q: params.q,
        lat: String(params.lat),
        lon: String(params.lon),
        ...(params.region_id && { region_id: String(params.region_id) }),
        ...(params.radius && { radius: String(params.radius) }),
        ...(params.page && { page: String(params.page) }),
        ...(params.page_size && { page_size: String(params.page_size) }),
        ...(params.category && { category: params.category }),
      })
      const url = publicApiUrl(`/api/v1/places/search?${qs}`)
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'X-Client-Request-ID': buildClientRequestId(),
          'X-Client-Action': params.clientAction ?? 'places_text_search',
          'X-Client-Request-URL': typeof window !== 'undefined' ? new URL(url, window.location.href).href : url,
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: PlacesSearchResult = await res.json()
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error')
      setData(null)
    } finally {
      setIsFetching(false)
    }
  }, [])

  return { data, isFetching, error, search }
}
