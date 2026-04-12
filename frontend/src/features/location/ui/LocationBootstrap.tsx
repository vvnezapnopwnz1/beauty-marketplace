import { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@app/store'
import {
  closeCityPicker,
  openCityPicker,
  selectCityPickerOpen,
  selectDeviceLocation,
  setCity,
} from '@features/location/model/locationSlice'
import { loadStoredCity, saveStoredCity } from '@shared/lib/locationStorage'
import { CityPickerModal } from './CityPickerModal'

export function LocationBootstrap() {
  const dispatch = useAppDispatch()
  const pickerOpen = useAppSelector(selectCityPickerOpen)
  const device = useAppSelector(selectDeviceLocation)
  const pickerOpenedNoStorage = useRef(false)

  useEffect(() => {
    const stored = loadStoredCity()
    if (!stored) return
    const city = {
      cityName: stored.cityName,
      regionId: stored.regionId,
      lat: stored.lat,
      lon: stored.lon,
      source: stored.source,
      resolved: true,
    }
    dispatch(setCity(city))
  }, [dispatch])

  /** Нет сохранённого города и геолокация недоступна — предлагаем выбрать город вручную. */
  useEffect(() => {
    if (loadStoredCity()) return
    if (!device.ready) return
    if (device.source === 'gps') return

    if (!pickerOpenedNoStorage.current) {
      pickerOpenedNoStorage.current = true
      dispatch(openCityPicker())
    }
  }, [dispatch, device.ready, device.source])

  return (
    <CityPickerModal
      open={pickerOpen}
      onClose={() => dispatch(closeCityPicker())}
      onSelect={city => {
        const selected = {
          cityName: city.cityName,
          regionId: city.regionId,
          lat: city.lat ?? 55.7558,
          lon: city.lon ?? 37.6176,
          source: 'manual' as const,
          resolved: true,
        }
        dispatch(setCity(selected))
        saveStoredCity(selected)
      }}
    />
  )
}
