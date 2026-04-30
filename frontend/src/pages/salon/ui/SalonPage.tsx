import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Box, Button, CircularProgress, Divider, Stack, Typography } from '@mui/material'
import { NavBar } from '@shared/ui/Navbar/NavBar'
import { CARD_GRADIENTS, formatPrice } from '@entities/salon'
import type { SalonView, Service } from '@entities/salon'
import { fetchPlaceByExternalId } from '@shared/api/placesApi'
import { placeDetailToSalon } from '@entities/place'
import {
  fetchSalonByExternal,
  fetchSalonById,
  fetchSalonMasters,
  type ApiSalon,
  type SalonMasterPublic,
} from '@shared/api/salonApi'
import { GuestBookingDialog } from '@features/guest-booking/ui/GuestBookingDialog'
import { ClaimChip } from '@features/claim-salon/ui/ClaimChip'
import { ROUTES, masterPath } from '@shared/config/routes'
import { FEATURE_FLAGS } from '@shared/config/featureFlags'
import { SalonScheduleList } from '@entities/salon/ui/SalonScheduleList'
import { SalonContactList } from '@entities/salon/ui/SalonContactList'
import { SalonCallSidebar } from '@entities/salon/ui/SalonCallSidebar'
import { useBrandColors } from '@shared/theme'
import { StarRow } from '@shared/ui/StarRow'

function apiToView(a: ApiSalon): SalonView {
  return {
    mode: 'salon',
    salonId: a.id,
    externalId: undefined,
    name: a.name,
    address: a.address,
    district: a.district,
    rating: a.rating,
    reviewCount: a.reviewCount,
    photos: a.photos?.length ? a.photos : a.photoUrl ? [a.photoUrl] : [],
    description: a.description,
    badge: a.badge,
    cardGradient: a.cardGradient,
    emoji: a.emoji,
    services: a.services.map(s => ({
      id: s.id,
      name: s.name,
      durationMinutes: s.durationMinutes,
      priceCents: s.priceCents,
    })),
    workingHours: a.workingHours,
    schedule247: false,
    scheduleComment: undefined,
    contactRows: [...(a.phonePublic ? [{ type: 'phone' as const, value: a.phonePublic }] : [])],
    canBookOnline: a.onlineBooking && a.services.length > 0,
    hasOwner: true,
    timezone: a.timezone || 'Europe/Moscow',
  }
}

type Tab = 'overview' | 'services' | 'masters' | 'reviews' | 'promos' | 'photos'

export function SalonPage() {
  const COLORS = useBrandColors()
  const { id, externalId: externalIdParam } = useParams<{ id?: string; externalId?: string }>()
  const navigate = useNavigate()
  const placeExternalId = externalIdParam ? decodeURIComponent(externalIdParam) : ''
  const [view, setView] = useState<SalonView | null>(null)
  const [masters, setMasters] = useState<SalonMasterPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (placeExternalId) {
        const [placeResult, linkedResult] = await Promise.allSettled([
          fetchPlaceByExternalId(placeExternalId),
          fetchSalonByExternal('2gis', placeExternalId),
        ])
        const linkedSalon = linkedResult.status === 'fulfilled' ? linkedResult.value : null
        if (linkedSalon?.salonId) {
          navigate(`/salon/${linkedSalon.salonId}`, { replace: true })
          return
        }
        if (placeResult.status !== 'fulfilled') {
          throw new Error('place_not_found')
        }
        const place = placeResult.value
        setView(placeDetailToSalon(place))
        setMasters([])
        return
      }
      if (!id) {
        setView(null)
        return
      }
      const salon = await fetchSalonById(id)
      const nextView = apiToView(salon)
      setView(nextView)
      const rows = await fetchSalonMasters(id).catch(() => [])
      setMasters(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
      setView(null)
    } finally {
      setLoading(false)
    }
  }, [id, navigate, placeExternalId])

  useEffect(() => {
    void load()
  }, [load])

  const guestBookingServices = useMemo(() => {
    if (!view || view.mode !== 'salon') return []
    return view.services
      .filter((s): s is Service & { id: string } => Boolean(s.id))
      .map(s => ({
        id: s.id,
        name: s.name,
        durationMinutes: s.durationMinutes,
        priceCents: s.priceCents,
      }))
  }, [view])

  const tabs = useMemo(() => {
    if (!view) return [] as { id: Tab; label: string }[]
    const list: { id: Tab; label: string }[] = [
      { id: 'overview', label: 'Обзор' },
      { id: 'services', label: 'Услуги' },
    ]
    if (view.mode === 'salon') list.push({ id: 'masters', label: 'Мастера' })
    if (FEATURE_FLAGS.reviews) list.push({ id: 'reviews', label: 'Отзывы' })
    if (FEATURE_FLAGS.promos) list.push({ id: 'promos', label: 'Акции' })
    if (FEATURE_FLAGS.photos) list.push({ id: 'photos', label: 'Фото' })
    return list
  }, [view])

  if (loading) {
    return (
      <Box minHeight="100vh">
        <NavBar />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </Box>
    )
  }

  if (!view) {
    return (
      <Box>
        <NavBar />
        <Box sx={{ maxWidth: 720, mx: 'auto', py: 8 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error ?? 'Салон не найден'}
          </Alert>
          <Button variant="contained" onClick={() => navigate(ROUTES.HOME)}>
            Назад к поиску
          </Button>
        </Box>
      </Box>
    )
  }

  const phone = view.contactRows.find(c => c.type === 'phone')?.value

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <NavBar />
      <Box
        sx={{
          position: 'relative',
          height: { xs: 220, sm: 300 },
          background:
            CARD_GRADIENTS[(view.cardGradient as keyof typeof CARD_GRADIENTS) ?? 'bg1'] ??
            CARD_GRADIENTS.bg1,
          overflow: 'hidden',
        }}
      >
        {view.photos[0] ? (
          <Box
            component="img"
            src={view.photos[0]}
            alt={view.name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Box sx={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
            <Typography sx={{ fontSize: { xs: 88, sm: 136 }, opacity: 0.18 }}>
              {view.emoji ?? '✂'}
            </Typography>
          </Box>
        )}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(10,10,10,0.62) 0%, rgba(10,10,10,0.1) 65%, transparent 100%)',
          }}
        />
        <Box
          sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, px: { xs: 2, sm: 4 }, pb: 2.5 }}
        >
          <Typography
            sx={{
              color: 'white',
              fontFamily: "'Fraunces', serif",
              fontSize: { xs: 28, sm: 36 },
              fontWeight: 500,
            }}
          >
            {view.name}
          </Typography>
          <Stack direction="row" alignItems="center" gap={1.2} flexWrap="wrap" mt={0.8}>
            <Stack direction="row" alignItems="center" gap={0.6}>
              <StarRow rating={view.rating ?? 0} />
              <Typography sx={{ color: 'white', fontSize: 14, fontWeight: 700 }}>
                {(view.rating ?? 0).toFixed(1)}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.72)', fontSize: 13 }}>
                ({view.reviewCount ?? 0} отзывов)
              </Typography>
            </Stack>
            <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>
              📍 {view.address}
            </Typography>
            {view.mode === 'place' && (
              <Box
                sx={{
                  px: 1.2,
                  py: 0.35,
                  borderRadius: 100,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                2GIS карточка
              </Box>
            )}
            {view.mode === 'place' && placeExternalId && (
              <ClaimChip source="2gis" externalId={placeExternalId} />
            )}
          </Stack>
          {view.mode === 'salon' && view.canBookOnline && (
            <Button
              variant="contained"
              size="medium"
              sx={{ mt: 1.5, alignSelf: 'flex-start', borderRadius: '12px', fontWeight: 600 }}
              onClick={() => setBookingDialogOpen(true)}
            >
              Записаться
            </Button>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          bgcolor: COLORS.white,
          borderBottom: `1px solid ${COLORS.border}`,
          position: 'sticky',
          top: 64,
          zIndex: 9,
        }}
      >
        <Box
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            px: { xs: 2, sm: 3 },
            display: 'flex',
            gap: 0.5,
            overflowX: 'auto',
          }}
        >
          {tabs.map(t => {
            const active = activeTab === t.id
            return (
              <Box
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                sx={{
                  px: 2.5,
                  py: 1.8,
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  color: active ? COLORS.accent : COLORS.inkSoft,
                  borderBottom: `2px solid ${active ? COLORS.accent : 'transparent'}`,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.label}
              </Box>
            )
          })}
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3 }, py: 3.5 }}>
        <Box
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 340px' }, gap: 3.5 }}
        >
          <Box>
            {activeTab === 'overview' && (
              <Stack gap={3}>
                {!!view.description && (
                  <Box
                    sx={{
                      bgcolor: COLORS.white,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '16px',
                      p: 2.5,
                    }}
                  >
                    <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 20, mb: 1 }}>
                      О салоне
                    </Typography>
                    <Typography sx={{ color: COLORS.inkSoft, lineHeight: 1.7 }}>
                      {view.description}
                    </Typography>
                  </Box>
                )}
                {!!view.workingHours && (
                  <Box
                    sx={{
                      bgcolor: COLORS.white,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '16px',
                      p: 2.5,
                    }}
                  >
                    <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 20, mb: 1.4 }}>
                      Режим работы
                    </Typography>
                    <SalonScheduleList
                      workingHours={view.workingHours}
                      schedule247={view.schedule247}
                      tz={view.timezone || 'Europe/Moscow'}
                    />
                  </Box>
                )}
                <Box
                  sx={{
                    bgcolor: COLORS.white,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '16px',
                    p: 2.5,
                  }}
                >
                  <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 20, mb: 1.4 }}>
                    Контакты
                  </Typography>
                  <Typography sx={{ color: COLORS.inkSoft, mb: 1 }}>{view.address}</Typography>
                  <SalonContactList contactRows={view.contactRows} />
                </Box>
              </Stack>
            )}

            {activeTab === 'services' && (
              <Stack gap={1.4}>
                {view.services.length === 0 && (
                  <Typography color="text.secondary">Услуги пока недоступны</Typography>
                )}
                {view.services.map(s => (
                  <Box
                    key={s.id ?? s.name}
                    sx={{
                      bgcolor: COLORS.white,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '14px',
                      p: 2.2,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: 15 }}>{s.name}</Typography>
                        <Typography sx={{ color: 'text.secondary', fontSize: 13.5 }}>
                          {s.durationMinutes} мин
                        </Typography>
                      </Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
                        {formatPrice(s.priceCents)} ₽
                      </Typography>
                    </Box>
                    {view.mode === 'salon' && view.canBookOnline && s.id && (
                      <Button
                        sx={{ mt: 1.2 }}
                        variant="contained"
                        onClick={() => setBookingDialogOpen(true)}
                      >
                        Записаться
                      </Button>
                    )}
                  </Box>
                ))}
              </Stack>
            )}

            {activeTab === 'masters' && view.mode === 'salon' && (
              <Stack gap={1.2}>
                {masters.length === 0 && (
                  <Typography color="text.secondary">Нет мастеров для отображения</Typography>
                )}
                {masters.map(m => (
                  <Box
                    key={m.id}
                    sx={{
                      bgcolor: COLORS.white,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: '14px',
                      p: 2.2,
                    }}
                  >
                    <Typography sx={{ fontWeight: 600, mb: 0.8 }}>{m.displayName}</Typography>
                    {m.masterProfile?.id && (
                      <Button onClick={() => navigate(masterPath(m.masterProfile!.id))}>
                        Профиль мастера
                      </Button>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>

          <Box>
            {view.mode === 'salon' && view.canBookOnline ? (
              <Box
                sx={{
                  bgcolor: COLORS.white,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '18px',
                  p: 2.2,
                  position: { md: 'sticky' },
                  top: { md: 86 },
                }}
              >
                <Typography sx={{ fontFamily: "'Fraunces', serif", fontSize: 20, mb: 1 }}>
                  Запись онлайн
                </Typography>
                <Stack direction="row" alignItems="center" gap={0.8} mb={1.5}>
                  <StarRow rating={view.rating ?? 0} />
                  <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                    {(view.rating ?? 0).toFixed(1)}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: COLORS.inkSoft }}>
                    · {view.reviewCount ?? 0} отзывов
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 1.5 }} />
                <Button fullWidth variant="contained" onClick={() => setBookingDialogOpen(true)}>
                  Записаться онлайн
                </Button>
              </Box>
            ) : (
              <SalonCallSidebar phone={phone} />
            )}
          </Box>
        </Box>
      </Box>

      {bookingDialogOpen && view.salonId && (
        <GuestBookingDialog
          open
          onClose={() => setBookingDialogOpen(false)}
          salonId={view.salonId}
          services={guestBookingServices}
          onSuccess={() => setBookingDialogOpen(false)}
        />
      )}

      {view.mode === 'place' && phone && (
        <Box
          sx={{
            display: { xs: 'block', md: 'none' },
            p: 2,
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'background.paper',
            borderTop: '1px solid #E5DFD5',
          }}
        >
          <Button fullWidth component="a" href={`tel:${phone}`} variant="contained">
            Позвонить
          </Button>
        </Box>
      )}
    </Box>
  )
}
