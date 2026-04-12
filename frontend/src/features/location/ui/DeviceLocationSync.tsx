import { useEffect, useRef } from 'react'
import { useAppDispatch } from '@app/store'
import { setDeviceLocation } from '@features/location/model/locationSlice'

const MOSCOW_LAT = 55.7558
const MOSCOW_LON = 37.6176

const GEO_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 12_000,
  maximumAge: 60_000,
}

/**
 * Единая подписка на геолокацию: getCurrentPosition, повтор при смене разрешения,
 * мягкий refresh при возврате во вкладку (throttle).
 */
export function DeviceLocationSync() {
  const dispatch = useAppDispatch()
  const lastVisibilityFetch = useRef(0)

  useEffect(() => {
    const applyPosition = (pos: GeolocationPosition) => {
      dispatch(
        setDeviceLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          source: 'gps',
          ready: true,
        }),
      )
    }

    const applyDenied = () => {
      dispatch(
        setDeviceLocation({
          lat: MOSCOW_LAT,
          lon: MOSCOW_LON,
          source: 'denied',
          ready: true,
        }),
      )
    }

    const requestOnce = () => {
      if (typeof window !== 'undefined' && !window.isSecureContext && import.meta.env.DEV) {
        console.warn(
          '[beautica] Небезопасный контекст (часто http://<IP>:5173). Геолокация может быть недоступна; ' +
            'попробуйте http://localhost:5173 или HTTPS.',
        )
      }
      if (!navigator.geolocation) {
        dispatch(
          setDeviceLocation({
            lat: MOSCOW_LAT,
            lon: MOSCOW_LON,
            source: 'unavailable',
            ready: true,
          }),
        )
        return
      }
      navigator.geolocation.getCurrentPosition(applyPosition, applyDenied, GEO_OPTIONS)
    }

    requestOnce()

    let permRef: PermissionStatus | null = null
    const onPermChange = () => {
      if (permRef?.state === 'granted') requestOnce()
    }
    if (navigator.permissions?.query) {
      void navigator.permissions.query({ name: 'geolocation' }).then(p => {
        permRef = p
        p.onchange = onPermChange
      })
    }

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastVisibilityFetch.current < 45_000) return
      lastVisibilityFetch.current = now
      requestOnce()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      if (permRef) permRef.onchange = null
    }
  }, [dispatch])

  return null
}
