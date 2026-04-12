import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Box, Typography, Grid, Button, CircularProgress, useMediaQuery } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { NavBar } from '@shared/ui/NavBar'
import {
  SearchResultCard,
  SearchResultCardSkeleton,
  type SearchResultCardVariant,
} from '@entities/search'
import { PlaceCard } from '@entities/place'
import { SearchBar } from '@features/search-salons/ui/SearchBar'
import { CategoryFilter } from '@features/search-salons/ui/CategoryFilter'
import { FilterRow } from '@features/search-salons/ui/FilterRow'
import { useAppDispatch, useAppSelector } from '@app/store'
import {
  resetFilters,
  selectSearchQuery,
  selectSearchCategory,
  selectOnlineOnly,
  selectSortBy,
  selectOpenNow,
  selectHighRating,
  selectOnlyAvailableToday,
} from '@features/search-salons/model/searchSlice'
import { usePlacesSearch } from '@shared/api/placesApi'
import { useSearch } from '@shared/api/searchApi'
import type { SearchResultItem } from '@shared/api/searchApi'
import type { PlaceItem } from '@shared/api/placesApi'
import { effectiveSearchCoords } from '@features/location/lib/effectiveSearchCoords'
import { selectActiveCity, selectDeviceLocation } from '@features/location/model/locationSlice'
import { MapSidebar, pickCardGradientKey, pickMapEmoji, type MapSidebarPin } from './MapSidebar'
import { PromoBanner } from './PromoBanner'
import { MapToggleButton } from './MapToggleButton'
import { assignFeaturedVariants } from '../lib/calcFeaturedScore'
import { useBrandColors } from '@shared/theme'

/** Скелетон под первый батч: featured-vertical + 4 normal (чётные батчи в assignFeaturedVariants). */
const SEARCH_LOADING_SKELETON_VARIANTS: SearchResultCardVariant[] = [
  'featured-vertical',
  'normal',
  'normal',
  'normal',
  'normal',
]

const CONTENT_MAX = 1280
const PROMO_SIDEBAR_WIDTH = 280

function pinsFromSearchItems(items: SearchResultItem[]): MapSidebarPin[] {
  return items.map(item => ({
    id: item.salonId ?? item.externalId,
    name: item.name,
    rating: item.rating ?? 0,
    reviewCount: item.reviewCount ?? 0,
    distanceKm: item.distanceKm,
    emoji: pickMapEmoji(item.name),
    cardGradient: pickCardGradientKey(item.name),
    servicePricesCents: (item.services ?? []).map(s => s.priceCents).filter(p => p > 0),
    lat: item.lat,
    lon: item.lon,
  }))
}

function pinsFromPlaceItems(items: PlaceItem[]): MapSidebarPin[] {
  return items.map(p => ({
    id: p.externalId,
    name: p.name,
    rating: p.rating ?? 0,
    reviewCount: p.reviewCount ?? 0,
    distanceKm: 0,
    emoji: pickMapEmoji(p.name),
    cardGradient: pickCardGradientKey(p.name),
    servicePricesCents: [],
    lat: p.lat,
    lon: p.lon,
  }))
}

type ViewMode = 'list' | 'map'

export function SearchPage() {
  const { t } = useTranslation()
  const COLORS = useBrandColors()
  const dispatch = useAppDispatch()
  const isBentoDesktop = useMediaQuery('(min-width:768px)')

  const query = useAppSelector(selectSearchQuery)
  const category = useAppSelector(selectSearchCategory)
  const onlineOnly = useAppSelector(selectOnlineOnly)
  const sortBy = useAppSelector(selectSortBy)
  const openNow = useAppSelector(selectOpenNow)
  const highRating = useAppSelector(selectHighRating)
  const onlyAvailableToday = useAppSelector(selectOnlyAvailableToday)
  const activeCity = useAppSelector(selectActiveCity)
  const device = useAppSelector(selectDeviceLocation)

  const locationReady = useMemo(
    () => Boolean(device.ready || activeCity != null),
    [device.ready, activeCity],
  )

  const { lat, lon } = useMemo(
    () => effectiveSearchCoords(activeCity, device),
    [activeCity, device],
  )
  const regionId = activeCity?.regionId
  const locationTag = activeCity ? activeCity.source : device.source

  const {
    data: searchResult,
    isFetching: searchFetching,
    error: searchError,
    search: runSearch,
  } = useSearch()
  const {
    data: placesResult,
    isFetching: placesFetching,
    search: triggerSearch,
  } = usePlacesSearch()

  const [page, setPage] = useState(1)
  const [activePinId, setActivePinId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const listScrollYRef = useRef(0)

  const showPlaces = placesResult !== null && placesResult.items.length > 0

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewMode('list')
  }, [showPlaces])

  useEffect(() => {
    if (!locationReady) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
    void runSearch({
      lat,
      lon,
      region_id: regionId,
      category,
      sort: sortBy,
      open_now: openNow,
      high_rating: highRating,
      online_booking: onlineOnly,
      page: 1,
      page_size: 10,
      clientAction: `search_page_auto_refresh_${locationTag}`,
    })
  }, [
    locationReady,
    lat,
    lon,
    regionId,
    category,
    sortBy,
    openNow,
    highRating,
    onlineOnly,
    locationTag,
    runSearch,
  ])

  const loadMore = useCallback(() => {
    if (searchFetching || !searchResult || searchResult.items.length >= searchResult.total) return
    const nextPage = page + 1
    setPage(nextPage)
    void runSearch(
      {
        lat,
        lon,
        region_id: regionId,
        category,
        sort: sortBy,
        open_now: openNow,
        high_rating: highRating,
        online_booking: onlineOnly,
        page: nextPage,
        page_size: 10,
        clientAction: `search_page_load_more_${locationTag}`,
      },
      { append: true },
    )
  }, [
    page,
    searchFetching,
    searchResult,
    lat,
    lon,
    regionId,
    category,
    sortBy,
    openNow,
    highRating,
    onlineOnly,
    locationTag,
    runSearch,
  ])

  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const current = sentinelRef.current
    if (!current) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(current)
    return () => observer.disconnect()
  }, [loadMore])

  const handleSearch = useCallback(() => {
    const q = query.trim()
    if (!q) return
    triggerSearch({
      q,
      lat,
      lon,
      region_id: regionId,
      radius: 15000,
      page_size: 10,
      category,
      clientAction: `search_button_click_${locationTag}`,
    })
  }, [query, lat, lon, regionId, category, locationTag, triggerSearch])

  const displaySearchItems = useMemo(() => {
    const items = searchResult?.items ?? []
    if (!onlineOnly) return items
    return [...items].sort((a, b) => {
      if (a.onlineBooking === b.onlineBooking) return 0
      return a.onlineBooking ? -1 : 1
    })
  }, [searchResult, onlineOnly])

  const bentoRows = useMemo(() => assignFeaturedVariants(displaySearchItems), [displaySearchItems])

  const sidebarPins = useMemo(() => {
    if (showPlaces) return pinsFromPlaceItems(placesResult?.items ?? [])
    return pinsFromSearchItems(displaySearchItems)
  }, [showPlaces, placesResult?.items, displaySearchItems])

  /** Пока нет первого ответа search — скелетон (раньше было только searchFetching&&null → «пусто» до старта fetch). */
  const loading = showPlaces
    ? placesFetching
    : !locationReady || (searchResult === null && !searchError)

  const mainEmpty =
    !showPlaces && locationReady && !searchFetching && displaySearchItems.length === 0

  const canShowMapToggle =
    !loading &&
    !mainEmpty &&
    (showPlaces ? (placesResult?.items.length ?? 0) > 0 : displaySearchItems.length > 0)

  const toggleViewMode = useCallback(() => {
    setViewMode(prev => {
      if (prev === 'list') {
        listScrollYRef.current =
          typeof window !== 'undefined' ? window.scrollY || document.documentElement.scrollTop : 0
        return 'map'
      }
      requestAnimationFrame(() => {
        window.scrollTo({ top: listScrollYRef.current, behavior: 'auto' })
      })
      return 'list'
    })
  }, [])

  const userGeo =
    device.ready && device.source === 'gps' ? { lat: device.lat, lon: device.lon } : null

  const countRow = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        mb: '20px',
      }}
    >
      {showPlaces ? (
        <Typography sx={{ fontSize: 14, color: COLORS.inkSoft }}>
          <Box component="strong" sx={{ color: COLORS.ink }}>
            {placesResult!.total.toLocaleString('ru-RU')}
          </Box>{' '}
          {t('places.foundInCity')}
        </Typography>
      ) : (
        <Typography sx={{ fontSize: 14, color: COLORS.inkSoft }}>
          <Box component="strong" sx={{ color: COLORS.ink }}>
            {(searchResult?.total ?? 0).toLocaleString('ru-RU')}
          </Box>{' '}
          {t('places.foundInCity')}
        </Typography>
      )}
    </Box>
  )

  const renderResults = () =>
    loading ? (
      showPlaces ? (
        <Grid container spacing={2.5}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <SearchResultCardSkeleton variant="normal" staggerIndex={i} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: isBentoDesktop ? 'repeat(3, 1fr)' : '1fr',
            gap: 2,
            gridAutoFlow: isBentoDesktop ? 'dense' : 'row',
          }}
        >
          {SEARCH_LOADING_SKELETON_VARIANTS.map((variant, i) => (
            <Box
              key={i}
              sx={{
                gridColumn:
                  isBentoDesktop && variant === 'featured-horizontal' ? 'span 2' : undefined,
                gridRow: isBentoDesktop && variant === 'featured-vertical' ? 'span 2' : undefined,
                minWidth: 0,
              }}
            >
              <SearchResultCardSkeleton variant={variant} staggerIndex={i} paletteIndex={i} />
            </Box>
          ))}
        </Box>
      )
    ) : showPlaces ? (
      <>
        <Box
          sx={{
            display: viewMode === 'map' ? 'none' : 'block',
            transition: 'opacity 0.2s ease',
          }}
        >
          <Grid container spacing={2.5}>
            {placesResult!.items.map(place => (
              <Grid key={place.externalId} size={{ xs: 12, sm: 6, md: 4 }}>
                <PlaceCard place={place} />
              </Grid>
            ))}
          </Grid>
        </Box>
        <Box
          sx={{
            display: viewMode === 'map' ? 'block' : 'none',
            opacity: viewMode === 'map' ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        >
          <MapSidebar
            pins={sidebarPins}
            activePinId={activePinId}
            onSelectPin={setActivePinId}
            mapCenterLat={lat}
            mapCenterLon={lon}
            userGeo={userGeo}
            layout="fullscreen"
          />
        </Box>
      </>
    ) : mainEmpty ? (
      <Box textAlign="center" py={8}>
        <Typography color="text.secondary" mb={2}>
          {t('search.noResultsHint')}
        </Typography>
        <Button
          variant="outlined"
          onClick={() => dispatch(resetFilters())}
          sx={{ borderRadius: 100 }}
        >
          {t('search.resetFilters')}
        </Button>
      </Box>
    ) : (
      <>
        <Box
          sx={{
            display: viewMode === 'map' ? 'none' : 'block',
            transition: 'opacity 0.2s ease',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: isBentoDesktop ? 'repeat(3, 1fr)' : '1fr',
              gap: 2,
              gridAutoFlow: isBentoDesktop ? 'dense' : 'row',
            }}
          >
            {bentoRows.map(({ item, variant, bentoSlot }) => (
              <Box
                key={item.externalId}
                sx={{
                  gridColumn:
                    isBentoDesktop && variant === 'featured-horizontal' ? 'span 2' : undefined,
                  gridRow: isBentoDesktop && variant === 'featured-vertical' ? 'span 2' : undefined,
                  minWidth: 0,
                }}
              >
                <SearchResultCard
                  item={item}
                  variant={variant}
                  bentoPaletteIndex={bentoSlot}
                  showAvailableNowBadge={onlyAvailableToday}
                />
              </Box>
            ))}
          </Box>
          {searchResult && displaySearchItems.length < searchResult.total && (
            <Box
              ref={sentinelRef}
              sx={{ height: 40, mt: 4, display: 'flex', justifyContent: 'center' }}
            >
              {searchFetching && <CircularProgress size={24} sx={{ color: COLORS.accent }} />}
            </Box>
          )}
        </Box>
        <Box
          sx={{
            display: viewMode === 'map' ? 'block' : 'none',
            transition: 'opacity 0.2s ease',
          }}
        >
          <MapSidebar
            pins={sidebarPins}
            activePinId={activePinId}
            onSelectPin={setActivePinId}
            mapCenterLat={lat}
            mapCenterLon={lon}
            userGeo={userGeo}
            layout="fullscreen"
          />
        </Box>
      </>
    )

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <NavBar />

      <Box
        sx={{
          background: 'linear-gradient(180deg, #35271E 0%, #2B241F 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          py: { xs: '32px', sm: '40px' },
          px: 3,
          textAlign: 'center',
        }}
      >
        {/* Badge */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: 11,
            fontWeight: 600,
            color: '#D8956B',
            bgcolor: 'rgba(216,149,107,0.15)',
            border: '1px solid rgba(216,149,107,0.3)',
            px: '14px',
            py: '6px',
            borderRadius: 100,
            mb: { xs: '16px', sm: '20px' },
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          ✦ {t('hero.tag')}
        </Box>

        {/* Title */}
        <Typography
          variant="h1"
          sx={{
            fontFamily: "'Fraunces', serif",
            fontSize: { xs: 28, sm: 36, md: 42 },
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: { xs: '-0.5px', sm: '-1px' },
            color: '#F0EAE3',
            mb: { xs: '8px', sm: '8px' },
            maxWidth: 700,
            mx: 'auto',
          }}
        >
          {t('hero.h1')}{' '}
          <Box component="em" sx={{ fontStyle: 'italic', color: '#D8956B' }}>
            {t('hero.h1accent')}
          </Box>
        </Typography>

        {/* Subtitle */}
        <Typography
          sx={{
            fontSize: { xs: 14, sm: 15 },
            color: '#B8A896',
            mb: { xs: '20px', sm: '28px' },
            fontWeight: 400,
            maxWidth: 480,
            mx: 'auto',
            lineHeight: 1.5,
          }}
        >
          {t('hero.subtitle')}
        </Typography>

        <SearchBar onSearch={handleSearch} />
      </Box>

      <Box sx={{ maxWidth: CONTENT_MAX, mx: 'auto', width: '100%' }}>
        <CategoryFilter />
      </Box>

      <Box
        sx={{
          maxWidth: CONTENT_MAX,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          py: 4,
          width: '100%',
        }}
      >
        <FilterRow />

        {viewMode === 'list' ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: { xs: 2.5, md: 3 },
              mt: 2,
              alignItems: { md: 'flex-start' },
            }}
          >
            <Box sx={{ flex: '1 1 0%', minWidth: 0, width: '100%' }}>
              {countRow}
              {renderResults()}
            </Box>
            <Box
              sx={{
                width: { xs: '100%', md: PROMO_SIDEBAR_WIDTH },
                flexShrink: 0,
                position: { md: 'sticky' },
                top: { md: 88 },
                alignSelf: 'flex-start',
              }}
            >
              <PromoBanner layout="sidebar" />
            </Box>
          </Box>
        ) : (
          <>
            <Box sx={{ mt: 2 }}>{countRow}</Box>
            {renderResults()}
          </>
        )}
      </Box>

      {canShowMapToggle && <MapToggleButton viewMode={viewMode} onToggle={toggleViewMode} />}
    </Box>
  )
}
