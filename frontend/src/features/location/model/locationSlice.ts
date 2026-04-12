import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '@app/store'

export type LocationSource = 'geo' | 'manual' | 'storage'

export type DeviceLocationSource = 'gps' | 'denied' | 'unavailable' | 'pending'
export type AddressLevel = 'address' | 'district' | 'city'

export interface DeviceLocationState {
  lat: number
  lon: number
  ready: boolean
  source: DeviceLocationSource
}

export interface SelectedCity {
  cityName: string
  regionId: number
  lat: number
  lon: number
  source: LocationSource
  resolved: boolean
}

interface LocationState {
  city: SelectedCity | null
  pickerOpen: boolean
  /** Единый источник координат с устройства (обновляется DeviceLocationSync). */
  device: DeviceLocationState
  /**
   * Полная строка адреса из 2GIS Geocoder при GPS (город, улица, дом).
   * Без GPS — null, в шапке показывается только город из профиля.
   */
  addressLine: string | null
  addressLevel: AddressLevel | null
}

const MOSCOW_LAT = 55.7558
const MOSCOW_LON = 37.6176

const initialState: LocationState = {
  city: null,
  pickerOpen: false,
  device: {
    lat: MOSCOW_LAT,
    lon: MOSCOW_LON,
    ready: false,
    source: 'pending',
  },
  addressLine: null,
  addressLevel: null,
}

export const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setCity: (state, action: PayloadAction<SelectedCity>) => {
      state.city = action.payload
    },
    clearCity: state => {
      state.city = null
    },
    openCityPicker: state => {
      state.pickerOpen = true
    },
    closeCityPicker: state => {
      state.pickerOpen = false
    },
    setDeviceLocation: (
      state,
      action: PayloadAction<{ lat: number; lon: number; source: DeviceLocationSource; ready: boolean }>,
    ) => {
      state.device = {
        lat: action.payload.lat,
        lon: action.payload.lon,
        source: action.payload.source,
        ready: action.payload.ready,
      }
    },
    setAddressLine: (state, action: PayloadAction<string | null>) => {
      state.addressLine = action.payload
    },
    setAddressLevel: (state, action: PayloadAction<AddressLevel | null>) => {
      state.addressLevel = action.payload
    },
  },
})

export const {
  setCity,
  clearCity,
  openCityPicker,
  closeCityPicker,
  setDeviceLocation,
  setAddressLine,
  setAddressLevel,
} = locationSlice.actions

export const selectActiveCity = (state: RootState) => state.location.city
export const selectCityPickerOpen = (state: RootState) => state.location.pickerOpen
export const selectDeviceLocation = (state: RootState) => state.location.device
export const selectAddressLine = (state: RootState) => state.location.addressLine
export const selectAddressLevel = (state: RootState) => state.location.addressLevel
