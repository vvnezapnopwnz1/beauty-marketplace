import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import { NavBar } from '@shared/ui/NavBar'
import { StarRow } from '@shared/ui/StarRow'
import { fetchMasterProfile, type MasterProfilePublic } from '@shared/api/salonApi'
import { salonPath } from '@shared/config/routes'
import { useBrandColors } from '@shared/theme'

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0][0] ?? ''
    const b = parts[1][0] ?? ''
    return (a + b).toUpperCase()
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

export function MasterPage() {
  const { masterProfileId } = useParams<{ masterProfileId: string }>()
  const navigate = useNavigate()
  const COLORS = useBrandColors()
  const [data, setData] = useState<MasterProfilePublic | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!masterProfileId) {
      setLoading(false)
      setError('Некорректная ссылка')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const m = await fetchMasterProfile(masterProfileId)
      setData(m)
    } catch (e) {
      if (e instanceof Error && e.message === 'not_found') {
        setError('Мастер не найден')
      } else {
        setError('Не удалось загрузить профиль')
      }
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [masterProfileId])

  useEffect(() => {
    void load()
  }, [load])

  const ringColor = data?.headerCalendarColor?.trim() || COLORS.accent

  if (loading) {
    return (
      <Box minHeight="100vh" bgcolor="background.default">
        <NavBar />
        <Box sx={{ maxWidth: 720, mx: 'auto', px: 2, py: 4 }}>
          <Stack direction="row" gap={2} alignItems="center" sx={{ mb: 3 }}>
            <Skeleton variant="circular" width={88} height={88} />
            <Box sx={{ flex: 1 }}>
              <Skeleton width="60%" height={36} sx={{ mb: 1 }} />
              <Skeleton width="40%" height={24} />
            </Box>
          </Stack>
          <Skeleton variant="rounded" height={80} sx={{ mb: 2, borderRadius: 2 }} />
          <Skeleton variant="rounded" height={140} sx={{ borderRadius: 2 }} />
        </Box>
      </Box>
    )
  }

  if (error || !data) {
    return (
      <Box minHeight="100vh" bgcolor="background.default">
        <NavBar />
        <Box sx={{ maxWidth: 560, mx: 'auto', px: 2, py: 8 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error ?? 'Мастер не найден'}
          </Alert>
          <Button variant="contained" onClick={() => navigate('/')}>
            На главную
          </Button>
        </Box>
      </Box>
    )
  }

  const specs = data.specializations ?? []
  const showRating = (data.cachedReviewCount ?? 0) > 0 && data.cachedRating != null

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <NavBar />
      <Box sx={{ maxWidth: 800, mx: 'auto', px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 5 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={3} alignItems={{ xs: 'center', sm: 'flex-start' }} sx={{ mb: 3 }}>
          {data.avatarUrl ? (
            <Avatar
              src={data.avatarUrl}
              alt={data.displayName}
              sx={{
                width: 88,
                height: 88,
                border: `3px solid ${ringColor}`,
                boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
              }}
            />
          ) : (
            <Avatar
              sx={{
                width: 88,
                height: 88,
                fontSize: 28,
                fontWeight: 700,
                bgcolor: ringColor,
                color: '#fff',
                border: `3px solid ${ringColor}`,
              }}
            >
              {initialsFromName(data.displayName)}
            </Avatar>
          )}
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' }, flex: 1 }}>
            <Typography
              sx={{
                fontFamily: "'Fraunces', serif",
                fontSize: { xs: 28, sm: 34 },
                fontWeight: 500,
                color: COLORS.ink,
                mb: 1,
              }}
            >
              {data.displayName}
            </Typography>
            {specs.length > 0 && (
              <Stack direction="row" gap={0.75} flexWrap="wrap" justifyContent={{ xs: 'center', sm: 'flex-start' }} sx={{ mb: 1.5 }}>
                {specs.map(s => (
                  <Chip key={s} label={s} size="small" sx={{ fontWeight: 500 }} />
                ))}
              </Stack>
            )}
            {showRating && (
              <Stack direction="row" alignItems="center" gap={1} justifyContent={{ xs: 'center', sm: 'flex-start' }} sx={{ mb: 1 }}>
                <StarRow rating={data.cachedRating!} size={16} />
                <Typography sx={{ fontSize: 15, fontWeight: 600, color: COLORS.ink }}>
                  {data.cachedRating!.toFixed(1)}
                </Typography>
                <Typography sx={{ fontSize: 14, color: COLORS.inkSoft }}>
                  · {data.cachedReviewCount} отзывов
                </Typography>
              </Stack>
            )}
            {data.yearsExperience != null && data.yearsExperience > 0 && (
              <Typography sx={{ fontSize: 14, color: COLORS.inkSoft }}>
                Опыт: {data.yearsExperience}{' '}
                {data.yearsExperience === 1 ? 'год' : data.yearsExperience < 5 ? 'года' : 'лет'}
              </Typography>
            )}
          </Box>
        </Stack>

        {data.bio?.trim() && (
          <Typography sx={{ fontSize: 15, color: COLORS.inkSoft, lineHeight: 1.7, mb: 4, whiteSpace: 'pre-wrap' }}>
            {data.bio.trim()}
          </Typography>
        )}

        <Typography
          sx={{
            fontFamily: "'Fraunces', serif",
            fontSize: 20,
            fontWeight: 500,
            color: COLORS.ink,
            mb: 2,
          }}
        >
          Работает в
        </Typography>

        <Stack gap={2}>
          {data.salons.length === 0 && (
            <Typography sx={{ color: COLORS.inkSoft, fontSize: 15 }}>Нет активных салонов в профиле.</Typography>
          )}
          {data.salons.map(s => (
            <Card
              key={s.salonMasterId}
              elevation={0}
              sx={{
                border: `1px solid ${COLORS.border}`,
                borderRadius: '16px',
                overflow: 'hidden',
                bgcolor: COLORS.white,
              }}
            >
              <Box sx={{ p: 2.5 }}>
                <Typography sx={{ fontSize: 18, fontWeight: 600, color: COLORS.ink, mb: 0.5 }}>{s.salonName}</Typography>
                {s.salonAddress ? (
                  <Typography sx={{ fontSize: 14, color: COLORS.inkSoft, mb: 1.5 }}>{s.salonAddress}</Typography>
                ) : null}
                <Typography sx={{ fontSize: 13, color: COLORS.inkFaint, mb: 1 }}>
                  Как в салоне: {s.displayNameInSalon}
                </Typography>
                {s.services.length > 0 && (
                  <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mb: 2 }}>
                    {s.services.map(name => (
                      <Chip key={name} label={name} size="small" variant="outlined" />
                    ))}
                  </Stack>
                )}
                <Button
                  variant="contained"
                  onClick={() => navigate(salonPath(s.salonId))}
                  sx={{
                    borderRadius: 100,
                    bgcolor: '#6B0606',
                    color: '#DFBFA8',
                    '&:hover': { bgcolor: '#8a0707' },
                  }}
                >
                  Записаться
                </Button>
              </Box>
            </Card>
          ))}
        </Stack>
      </Box>
    </Box>
  )
}
