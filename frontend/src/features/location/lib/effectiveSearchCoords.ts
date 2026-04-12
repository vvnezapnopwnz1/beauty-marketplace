import type { DeviceLocationState, SelectedCity } from '@features/location/model/locationSlice'

const MOSCOW = { lat: 55.7558, lon: 37.6176 }

/**
 * Координаты для поиска и карты: при успешном GPS — координаты устройства, иначе центр выбранного города.
 */
export function effectiveSearchCoords(
  activeCity: SelectedCity | null,
  device: DeviceLocationState,
): { lat: number; lon: number } {
  if (device.ready && device.source === 'gps') {
    return { lat: device.lat, lon: device.lon }
  }
  if (activeCity) {
    return { lat: activeCity.lat, lon: activeCity.lon }
  }
  return MOSCOW
}
