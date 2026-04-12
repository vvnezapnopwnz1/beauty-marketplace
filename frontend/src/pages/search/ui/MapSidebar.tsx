import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Typography, Stack, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { load } from '@2gis/mapgl'
import { CARD_GRADIENTS } from '@entities/salon'
import type { CardGradient } from '@entities/salon'
import { useBrandColors } from '@shared/theme'

type MapGLModule = Awaited<ReturnType<typeof load>>
type MapInstance = InstanceType<MapGLModule['Map']>

/** Minimal shape for map preview pins + list (search or 2GIS text results). */
export interface MapSidebarPin {
  id: string
  name: string
  rating: number
  reviewCount: number
  distanceKm: number
  emoji: string
  cardGradient: CardGradient
  /** Used for secondary pin labels (min price). Empty = no price chip text. */
  servicePricesCents: number[]
  /** WGS84; when missing or invalid, pin is skipped on the real map. */
  lat?: number
  lon?: number
}

export type MapSidebarLayout = 'sidebar' | 'fullscreen'

interface Props {
  pins: MapSidebarPin[]
  activePinId?: string | null
  onSelectPin?: (id: string | null) => void
  /** Fallback map center when there are no geo points (lon, lat). */
  mapCenterLon: number
  mapCenterLat: number
  /**
   * Точное местоположение из браузера (только при `source === 'gps'`).
   * Рисуется отдельной точкой «вы здесь».
   */
  userGeo?: { lat: number; lon: number } | null
  /** `sidebar`: sticky card + 320px map. `fullscreen`: wide map ~70vh (SearchPage toggle). */
  layout?: MapSidebarLayout
}

const PIN_POSITIONS = [
  { top: '76px', left: '72px' },
  { top: '56px', left: '185px' },
  { top: '96px', right: '64px' },
  { bottom: '100px', left: '52px' },
  { bottom: '80px', right: '80px' },
]

const GRADIENT_KEYS = Object.keys(CARD_GRADIENTS) as CardGradient[]

/** Moscow Kremlin area — used only when props are invalid. */
const DEFAULT_LON_LAT: [number, number] = [37.6173, 55.7558]

function isValidGeo(lat: number | undefined, lon: number | undefined): boolean {
  if (lat == null || lon == null) return false
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false
  if (lat === 0 && lon === 0) return false
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180
}

function map2gisKey(): string | undefined {
  const k = import.meta.env.VITE_2GIS_MAP_KEY as string | undefined
  return k && k.trim() !== '' ? k.trim() : undefined
}

export function pickCardGradientKey(name: string): CardGradient {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  return GRADIENT_KEYS[Math.abs(hash) % GRADIENT_KEYS.length]
}

const EMOJIS = ['✂', '💅', '✦', '🪒', '✻', '💆']

export function pickMapEmoji(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 37 + name.charCodeAt(i)) | 0
  return EMOJIS[Math.abs(hash) % EMOJIS.length]
}

function formatPricePill(prices: number[]): string | null {
  if (prices.length === 0) return null
  const min = Math.min(...prices)
  if (!Number.isFinite(min) || min <= 0) return null
  return `от ${Math.round(min / 100)} ₽`
}

function formatDistanceText(distanceKm: number): string {
  if (!distanceKm || distanceKm <= 0) return '—'
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} м`
  return `${distanceKm.toFixed(1)} км`
}

function shortName(s: string, max = 26): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

type RenderNode =
  | { kind: 'pin'; id: string; pin: MapSidebarPin & { lat: number; lon: number } }
  | { kind: 'cluster'; id: string; lon: number; lat: number; count: number; pinIds: string[] }

function clusterPinsByZoom(
  pins: Array<MapSidebarPin & { lat: number; lon: number }>,
  zoom: number,
): RenderNode[] {
  if (zoom >= 13 || pins.length <= 20) {
    return pins.map(pin => ({ kind: 'pin' as const, id: pin.id, pin }))
  }
  const cell = zoom <= 10 ? 0.08 : 0.04
  const groups = new Map<string, Array<MapSidebarPin & { lat: number; lon: number }>>()
  for (const pin of pins) {
    const gx = Math.round(pin.lon / cell)
    const gy = Math.round(pin.lat / cell)
    const key = `${gx}:${gy}`
    const arr = groups.get(key)
    if (arr) arr.push(pin)
    else groups.set(key, [pin])
  }

  const out: RenderNode[] = []
  groups.forEach((arr, key) => {
    if (arr.length === 1) {
      out.push({ kind: 'pin', id: arr[0].id, pin: arr[0] })
      return
    }
    const lon = arr.reduce((s, p) => s + p.lon, 0) / arr.length
    const lat = arr.reduce((s, p) => s + p.lat, 0) / arr.length
    out.push({
      kind: 'cluster',
      id: `cluster:${key}`,
      lon,
      lat,
      count: arr.length,
      pinIds: arr.map(p => p.id),
    })
  })
  return out
}

function FallbackMapPreview({
  pins,
  activePinId,
  onSelectPin,
  mapPaneHeight,
}: {
  pins: MapSidebarPin[]
  activePinId?: string | null
  onSelectPin?: (id: string | null) => void
  mapPaneHeight: number | string
}) {
  const COLORS = useBrandColors()
  return (
    <Box
      sx={{
        height: mapPaneHeight,
        bgcolor: '#E8EBE4',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <Box
        component="svg"
        viewBox="0 0 380 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <path d="M0 120h380" stroke="white" strokeWidth="12" opacity="0.5" />
        <path d="M0 200h380" stroke="white" strokeWidth="8" opacity="0.4" />
        <path d="M140 0v320" stroke="white" strokeWidth="12" opacity="0.5" />
        <path d="M240 0v320" stroke="white" strokeWidth="8" opacity="0.4" />
        <path d="M60 0v320" stroke="white" strokeWidth="6" opacity="0.3" />
        <path d="M320 0v320" stroke="white" strokeWidth="6" opacity="0.3" />
        <path d="M0 60h380" stroke="white" strokeWidth="6" opacity="0.3" />
        <path d="M0 270h380" stroke="white" strokeWidth="6" opacity="0.3" />
        <rect x="30" y="70" width="80" height="35" rx="6" fill="white" opacity="0.25" />
        <rect x="160" y="70" width="60" height="35" rx="6" fill="white" opacity="0.25" />
        <rect x="260" y="70" width="90" height="35" rx="6" fill="white" opacity="0.25" />
        <rect x="30" y="140" width="90" height="45" rx="6" fill="white" opacity="0.25" />
        <rect x="160" y="140" width="60" height="45" rx="6" fill="white" opacity="0.25" />
        <rect x="260" y="140" width="80" height="45" rx="6" fill="white" opacity="0.25" />
        <rect x="30" y="220" width="80" height="55" rx="6" fill="white" opacity="0.2" />
        <rect x="160" y="220" width="60" height="55" rx="6" fill="white" opacity="0.2" />
        <rect x="260" y="220" width="90" height="55" rx="6" fill="white" opacity="0.2" />
      </Box>

      {pins.slice(0, 5).map((pin, i) => {
        const pos = PIN_POSITIONS[i] ?? PIN_POSITIONS[0]
        const isActive = pin.id === activePinId
        const pinColor = isActive ? COLORS.accent : COLORS.ink
        const pricePill = formatPricePill(pin.servicePricesCents)
        const label = isActive ? shortName(pin.name, 18) : pricePill ?? pin.emoji

        return (
          <Box
            key={pin.id}
            onClick={() => onSelectPin?.(isActive ? null : pin.id)}
            sx={{
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'transform 0.15s',
              transform: isActive ? 'scale(1.14)' : 'scale(1)',
              '&:hover': { transform: isActive ? 'scale(1.16)' : 'scale(1.08)' },
              maxWidth: 120,
              ...pos,
            }}
          >
            <Box
              sx={{
                bgcolor: pinColor,
                color: COLORS.white,
                fontSize: 11,
                fontWeight: 500,
                px: 1,
                py: '4px',
                borderRadius: '10px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                boxShadow: isActive ? '0 8px 20px rgba(26, 22, 18, 0.22)' : 'none',
              }}
            >
              {label}
            </Box>
            <Box
              sx={{
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: `5px solid ${pinColor}`,
              }}
            />
          </Box>
        )
      })}

      <Box
        sx={{
          position: 'absolute',
          right: 12,
          bottom: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {['+', '−'].map(ctrl => (
          <Box
            key={ctrl}
            component="button"
            type="button"
            sx={{
              width: 32,
              height: 32,
              bgcolor: COLORS.white,
              border: `1px solid ${COLORS.borderLight}`,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 300,
              color: COLORS.inkSoft,
              transition: 'background 0.1s',
              '&:hover': { bgcolor: COLORS.cream },
            }}
          >
            {ctrl}
          </Box>
        ))}
      </Box>
    </Box>
  )
}

/** Синяя точка в духе картографических приложений (не путать с брендом). */
const USER_LOCATION_BLUE = '#1A73E8'

function TwoGisMapView({
  mapKey,
  pins,
  activePinId,
  onSelectPin,
  mapCenterLon,
  mapCenterLat,
  userGeo,
  mapPaneHeight,
}: {
  mapKey: string
  pins: MapSidebarPin[]
  activePinId?: string | null
  onSelectPin?: (id: string | null) => void
  mapCenterLon: number
  mapCenterLat: number
  userGeo?: { lat: number; lon: number } | null
  mapPaneHeight: number | string
}) {
  const COLORS = useBrandColors()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapInstance | null>(null)
  const overlaysRef = useRef<Array<{ destroy: () => void }>>([])
  const [mapReady, setMapReady] = useState(false)
  const [zoom, setZoom] = useState(13)
  const shouldAutoFitRef = useRef(true)

  const baseLon = isValidGeo(mapCenterLat, mapCenterLon) ? mapCenterLon : DEFAULT_LON_LAT[0]
  const baseLat = isValidGeo(mapCenterLat, mapCenterLon) ? mapCenterLat : DEFAULT_LON_LAT[1]

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let cancelled = false
    let ro: ResizeObserver | null = null

    void load().then(mapgl => {
      if (cancelled) return
      const map = new mapgl.Map(el, {
        key: mapKey,
        center: [baseLon, baseLat],
        zoom: 13,
        zoomControl: 'bottomRight',
        copyright: 'bottomRight',
      })
      if (cancelled) {
        map.destroy()
        return
      }
      mapRef.current = map
      setZoom(13)
      setMapReady(true)
      map.on('zoom', () => {
        const z = Number((map as unknown as { getZoom: () => number }).getZoom?.() ?? 13)
        if (Number.isFinite(z)) setZoom(z)
      })
      map.on('movestart', () => {
        shouldAutoFitRef.current = false
      })
      ro = new ResizeObserver(() => {
        map.invalidateSize()
      })
      ro.observe(el)
    })

    return () => {
      cancelled = true
      if (ro) ro.disconnect()
      const m = mapRef.current
      if (m) {
        m.destroy()
        mapRef.current = null
      }
      setMapReady(false)
    }
  }, [mapKey, baseLon, baseLat])

  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    overlaysRef.current.forEach(m => m.destroy())
    overlaysRef.current = []

    const validPins = pins.filter(p => isValidGeo(p.lat, p.lon)) as Array<
      MapSidebarPin & { lat: number; lon: number }
    >
    const nodes = clusterPinsByZoom(validPins, zoom)
    const me =
      userGeo && isValidGeo(userGeo.lat, userGeo.lon)
        ? { lat: userGeo.lat, lon: userGeo.lon }
        : null

    void load().then(mapgl => {
      const current = mapRef.current
      if (!current || current !== map) return

      const boundsPoints: [number, number][] = validPins.map(p => [p.lon, p.lat])
      if (me) boundsPoints.push([me.lon, me.lat])

      if (shouldAutoFitRef.current) {
        if (boundsPoints.length === 0) {
          current.setCenter([baseLon, baseLat])
          current.setZoom(12)
        } else if (boundsPoints.length === 1) {
          const [lon, lat] = boundsPoints[0]
          current.setCenter([lon, lat])
          current.setZoom(14)
        } else {
          const b = new mapgl.LngLatBoundsClass({
            southWest: [boundsPoints[0][0], boundsPoints[0][1]],
            northEast: [boundsPoints[0][0], boundsPoints[0][1]],
          })
          for (let i = 1; i < boundsPoints.length; i++) {
            b.extend([boundsPoints[i][0], boundsPoints[i][1]])
          }
          current.fitBounds(b, {
            padding: { top: 48, right: 32, bottom: 56, left: 32 },
            maxZoom: 16,
          })
        }
        shouldAutoFitRef.current = false
      }

      current.on('click', () => onSelectPin?.(null))

      nodes.forEach(node => {
        if (node.kind === 'cluster') {
          const marker = new mapgl.Marker(current, {
            coordinates: [node.lon, node.lat],
            label: {
              text: String(node.count),
              color: '#FFFFFF',
              fontSize: 12,
              haloRadius: 11,
              haloColor: COLORS.ink,
              offset: [0, -2],
            },
            zIndex: 3,
          })
          marker.on('click', () => {
            current.setCenter([node.lon, node.lat])
            const next = Math.min(16, Math.round(zoom + 2))
            current.setZoom(next)
          })
          overlaysRef.current.push(marker)
          return
        }

        const pin = node.pin
        const isActive = pin.id === activePinId
        const pinColor = isActive ? COLORS.accent : COLORS.ink
        const pricePill = formatPricePill(pin.servicePricesCents)
        const iconLabel = isActive
          ? `${pin.emoji} ${pricePill ?? 'салон'}`
          : pin.emoji
        const marker = new mapgl.Marker(current, {
          coordinates: [pin.lon, pin.lat],
          label: {
            text: iconLabel,
            color: '#FFFFFF',
            fontSize: isActive ? 13 : 12,
            haloRadius: isActive ? 13 : 10,
            haloColor: pinColor,
            offset: [0, -6],
          },
          zIndex: isActive ? 8 : 4,
        })
        marker.on('click', () => {
          onSelectPin?.(isActive ? null : pin.id)
          current.setCenter([pin.lon, pin.lat])
        })
        overlaysRef.current.push(marker)
      })

      if (me) {
        const dot = new mapgl.CircleMarker(current, {
          coordinates: [me.lon, me.lat],
          diameter: 16,
          color: USER_LOCATION_BLUE,
          strokeColor: '#FFFFFF',
          strokeWidth: 2,
          zIndex: 10,
        })
        overlaysRef.current.push(dot)
      }

      if (activePinId) {
        const active = validPins.find(p => p.id === activePinId)
        if (active) {
          const popupText = shortName(active.name, 24)
          const price = formatPricePill(active.servicePricesCents) ?? 'по запросу'
          const popup = new mapgl.Marker(current, {
            coordinates: [active.lon, active.lat],
            label: {
              text: `${popupText} · ${price}`,
              color: COLORS.ink,
              fontSize: 12,
              haloRadius: 14,
              haloColor: COLORS.white,
              offset: [0, -30],
            },
            zIndex: 11,
          })
          overlaysRef.current.push(popup)
        }
      }
    })
  }, [mapReady, pins, activePinId, baseLon, baseLat, userGeo, zoom, onSelectPin, COLORS])

  return (
    <Box
      ref={containerRef}
      sx={{
        height: mapPaneHeight,
        width: '100%',
        position: 'relative',
        bgcolor: '#E8EBE4',
      }}
    />
  )
}

export function MapSidebar({
  pins,
  activePinId,
  onSelectPin,
  mapCenterLon,
  mapCenterLat,
  userGeo,
  layout = 'sidebar',
}: Props) {
  const COLORS = useBrandColors()
  const { t } = useTranslation()
  const nearby = pins.slice(0, 4)
  const mapKey = map2gisKey()
  const activePin = useMemo(() => pins.find(p => p.id === activePinId) ?? null, [pins, activePinId])
  const isFullscreen = layout === 'fullscreen'
  const mapPaneHeight = isFullscreen ? '70vh' : 320

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderRadius: '16px',
        border: `1px solid ${COLORS.border}`,
        overflow: 'hidden',
        position: isFullscreen ? 'relative' : 'sticky',
        top: isFullscreen ? undefined : 88,
        width: '100%',
      }}
    >
      {mapKey ? (
        <TwoGisMapView
          mapKey={mapKey}
          pins={pins}
          activePinId={activePinId}
          onSelectPin={onSelectPin}
          mapCenterLon={mapCenterLon}
          mapCenterLat={mapCenterLat}
          userGeo={userGeo}
          mapPaneHeight={mapPaneHeight}
        />
      ) : (
        <FallbackMapPreview
          pins={pins}
          activePinId={activePinId}
          onSelectPin={onSelectPin}
          mapPaneHeight={mapPaneHeight}
        />
      )}

      <Box sx={{ p: 2, maxHeight: isFullscreen ? 'min(40vh, 320px)' : undefined, overflowY: isFullscreen ? 'auto' : undefined }}>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.ink, mb: '12px' }}>
          {t('map.closestToYou')}
        </Typography>

        <Stack gap="10px">
          {nearby.map(pin => (
            <Box
              key={pin.id}
              onClick={() => onSelectPin?.(pin.id)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                p: '10px',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'background 0.1s',
                '&:hover': { bgcolor: COLORS.cream },
                bgcolor: pin.id === activePinId ? 'rgba(196,112,63,0.08)' : 'transparent',
                border: pin.id === activePinId ? `1px solid ${COLORS.border}` : '1px solid transparent',
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  background: CARD_GRADIENTS[pin.cardGradient],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {pin.emoji}
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: COLORS.ink,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {pin.name}
                </Typography>
                <Typography sx={{ fontSize: 11, color: COLORS.inkSoft, mt: '2px' }}>
                  ⭑ {pin.rating.toFixed(1)} · {pin.reviewCount} reviews
                </Typography>
              </Box>

              <Typography sx={{ fontSize: 12, color: COLORS.inkFaint, whiteSpace: 'nowrap' }}>
                {formatDistanceText(pin.distanceKm)}
              </Typography>
            </Box>
          ))}
        </Stack>
        {activePin && (
          <Box sx={{ mt: 1.5, p: 1.25, borderRadius: '10px', bgcolor: 'rgba(196,112,63,0.08)' }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: COLORS.ink, mb: 0.5 }}>
              {shortName(activePin.name, 40)}
            </Typography>
            <Typography sx={{ fontSize: 11, color: COLORS.inkSoft }}>
              {t('map.ratingShort')}: {activePin.rating.toFixed(1)} · {activePin.reviewCount}
            </Typography>
            <Typography sx={{ fontSize: 11, color: COLORS.inkSoft }}>
              {formatPricePill(activePin.servicePricesCents) ?? t('map.priceOnRequest')} · {formatDistanceText(activePin.distanceKm)}
            </Typography>
            <Button
              size="small"
              variant="text"
              sx={{ mt: 0.5, px: 0, minWidth: 0, textTransform: 'none' }}
              onClick={() => onSelectPin?.(null)}
            >
              {t('map.closeCard')}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  )
}
