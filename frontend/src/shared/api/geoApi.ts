import { publicApiUrl } from '@shared/lib/apiPublicUrl'

export interface CityOption {
  regionId: number
  cityName: string
  lat?: number
  lon?: number
}

export async function resolveRegionByCoords(lat: number, lon: number): Promise<CityOption> {
  const res = await fetch(publicApiUrl(`/api/v1/geo/region?lat=${lat}&lon=${lon}`), { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function searchCities(q: string): Promise<CityOption[]> {
  const res = await fetch(publicApiUrl(`/api/v1/geo/cities?q=${encodeURIComponent(q)}`), { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = (await res.json()) as { items: CityOption[] }
  return json.items
}

export interface ReverseGeocodeResult {
  /** Полная строка из 2GIS Geocoder: город, улица, дом. */
  formatted: string
  /** Качество адреса для UI: address (улица+дом), district, city. */
  level: 'address' | 'district' | 'city'
}

/** Server-side reverse geocode (2GIS Catalog Geocoder via backend). */
export async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  const res = await fetch(
    publicApiUrl(
      `/api/v1/geo/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`,
    ),
    { cache: 'no-store' },
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<ReverseGeocodeResult>
}
