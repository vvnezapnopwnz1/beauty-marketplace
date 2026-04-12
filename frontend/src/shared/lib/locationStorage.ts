import type { SelectedCity } from '@features/location/model/locationSlice'

/** Ключ localStorage; при появлении GPS обновляется GeoLocationStorageWatcher. */
const STORAGE_KEY = 'bm:selected_city'

export function loadStoredCity(): SelectedCity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SelectedCity
    if (!parsed?.cityName || !parsed.regionId) return null
    return parsed
  } catch {
    return null
  }
}

export function saveStoredCity(city: SelectedCity): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(city))
}
