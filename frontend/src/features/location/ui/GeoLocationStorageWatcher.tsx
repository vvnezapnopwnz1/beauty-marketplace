import { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@app/store'
import {
  openCityPicker,
  selectActiveCity,
  selectDeviceLocation,
  setCity,
} from '@features/location/model/locationSlice'
import { loadStoredCity, saveStoredCity } from '@shared/lib/locationStorage'
import { resolveRegionByCoords } from '@shared/api/geoApi'

const DEBOUNCE_MS = 400

/**
 * Следит за Redux-состоянием геолокации: при появлении реальных GPS-координат
 * резолвит регион через 2GIS и записывает город в Redux и localStorage (`bm:selected_city`).
 * Не перезаписывает явный ручной выбор города (`source: manual`).
 */
export function GeoLocationStorageWatcher() {
  const dispatch = useAppDispatch()
  const device = useAppSelector(selectDeviceLocation)
  const activeCity = useAppSelector(selectActiveCity)
  const lastPersistedKey = useRef<string>('')
  const inFlight = useRef(false)

  useEffect(() => {
    if (!device.ready || device.source !== 'gps') {
      return
    }
    if (activeCity?.source === 'manual') {
      return
    }

    const coordsKey = `${device.lat.toFixed(5)}_${device.lon.toFixed(5)}`
    if (coordsKey === lastPersistedKey.current) {
      return
    }

    const handle = window.setTimeout(() => {
      void (async () => {
        if (inFlight.current) return
        inFlight.current = true
        try {
          const city = await resolveRegionByCoords(device.lat, device.lon)
          const selected = {
            cityName: city.cityName,
            regionId: city.regionId,
            lat: city.lat ?? device.lat,
            lon: city.lon ?? device.lon,
            source: 'geo' as const,
            resolved: true,
          }
          lastPersistedKey.current = coordsKey
          dispatch(setCity(selected))
          saveStoredCity(selected)
        } catch {
          if (!loadStoredCity()) {
            dispatch(openCityPicker())
          }
        } finally {
          inFlight.current = false
        }
      })()
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(handle)
  }, [dispatch, device.ready, device.source, device.lat, device.lon, activeCity?.source])

  return null
}
