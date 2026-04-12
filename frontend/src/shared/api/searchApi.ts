import { useState, useCallback } from 'react'
import { publicApiUrl } from '@shared/lib/apiPublicUrl'

export interface SearchServiceDTO {
  id: string
  name: string
  durationMinutes: number
  priceCents: number
}

export interface SearchResultItem {
  externalId: string
  name: string
  address?: string
  lat: number
  lon: number
  photoUrl?: string | null
  rating?: number | null
  reviewCount?: number | null
  rubricNames?: string[]
  distanceKm: number
  category: string
  salonId?: string
  onlineBooking: boolean
  services?: SearchServiceDTO[]
}

export interface SearchResult {
  items: SearchResultItem[]
  total: number
}

export interface SearchParams {
  lat: number
  lon: number
  category: string
  region_id?: number
  page?: number
  page_size?: number
  sort?: 'popular' | 'nearby' | 'rating'
  open_now?: boolean
  high_rating?: boolean
  online_booking?: boolean
  clientAction?: string
}

function buildClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `ui-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function useSearch() {
  const [data, setData] = useState<SearchResult | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (params: SearchParams, options?: { append?: boolean }) => {
    setIsFetching(true)
    setError(null)
    if (!options?.append) {
      setData(null)
    }
    try {
      const qs = new URLSearchParams({
        lat: String(params.lat),
        lon: String(params.lon),
        category: params.category,
        ...(params.region_id && { region_id: String(params.region_id) }),
        ...(params.page && { page: String(params.page) }),
        ...(params.page_size && { page_size: String(params.page_size) }),
        ...(params.sort && { sort: params.sort }),
        ...(params.open_now && { open_now: 'true' }),
        ...(params.high_rating && { high_rating: 'true' }),
        ...(params.online_booking && { online_booking: 'true' }),
      })
      const url = publicApiUrl(`/api/v1/search?${qs}`)
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'X-Client-Request-ID': buildClientRequestId(),
          'X-Client-Action': params.clientAction ?? 'search_refresh',
          // Полный URL как в браузере (для access-log на бэкенде / OpenObserve)
          'X-Client-Request-URL': typeof window !== 'undefined' ? new URL(url, window.location.href).href : url,
        },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: SearchResult = await res.json()
      
      setData(prev => {
        if (!options?.append || !prev) return json
        
        const existingIds = new Set(prev.items.map(i => i.externalId))
        const newItems = json.items.filter(i => !existingIds.has(i.externalId))
        
        return {
          total: json.total, // always use latest total
          items: [...prev.items, ...newItems]
        }
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error')
      if (!options?.append) setData(null)
    } finally {
      setIsFetching(false)
    }
  }, [])

  return { data, isFetching, error, search }
}
