import { useMemo } from 'react'
import { Box, Typography, Stack, Button } from '@mui/material'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Salon } from '../model/types'
import { formatPrice, CARD_GRADIENTS } from '../model/mockData'
import { salonPath } from '@shared/config/routes'
import { useBrandColors } from '@shared/theme'

interface Props {
  salon: Salon
}

function formatDistance(km: number): string | null {
  if (!km) return null
  if (km < 1) return `${Math.round(km * 1000)} м`
  return `${km.toFixed(1)} км`
}

export function SalonCard({ salon }: Props) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const COLORS = useBrandColors()
  const badgeStyles = useMemo(
    () =>
      ({
        popular: { bgcolor: COLORS.accent, color: COLORS.onAccent, labelKey: 'salon.badgePopular' },
        top: { bgcolor: COLORS.sage, color: COLORS.onAccent, labelKey: 'salon.badgeTop' },
        new: { bgcolor: COLORS.ink, color: COLORS.onAccent, labelKey: 'salon.badgeNew' },
      }) as Record<string, { bgcolor: string; color: string; labelKey: string }>,
    [COLORS],
  )

  const prices = salon.services.map(s => s.priceCents)
  const price = prices.length > 0 ? Math.min(...prices) : null
  const gradient = CARD_GRADIENTS[salon.cardGradient] ?? CARD_GRADIENTS.bg1
  const badge = salon.badge ? badgeStyles[salon.badge] : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ height: '100%' }}
    >
      <Box
        onClick={() => navigate(salonPath(salon.id))}
        sx={{
          bgcolor: 'background.paper',
          borderRadius: '16px',
          overflow: 'hidden',
          border: `1px solid ${COLORS.border}`,
          cursor: 'pointer',
          transition: 'box-shadow 0.2s, transform 0.2s',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          '&:hover': {
            boxShadow: '0 2px 16px rgba(26,22,18,0.07)',
            transform: 'translateY(-2px)',
          },
        }}
      >
        {/* Image */}
        <Box
          sx={{
            width: '100%',
            height: 160,
            background: gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {salon.photoUrl ? (
            <Box
              component="img"
              src={salon.photoUrl}
              alt={salon.name}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <Typography sx={{ fontSize: 52, lineHeight: 1 }}>{salon.emoji}</Typography>
          )}

          {badge && (
            <Box
              sx={{
                position: 'absolute',
                top: 12,
                left: 12,
                fontSize: 11,
                fontWeight: 500,
                px: '10px',
                py: '4px',
                borderRadius: 100,
                letterSpacing: '0.3px',
                bgcolor: badge.bgcolor,
                color: badge.color,
              }}
            >
              {t(badge.labelKey)}
            </Box>
          )}

          <Box
            component="button"
            onClick={e => e.stopPropagation()}
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.9)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            ♡
          </Box>
        </Box>

        {/* Body */}
        <Box sx={{ p: '14px 16px 16px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          <Typography
            sx={{
              fontFamily: "'Fraunces', serif",
              fontSize: 16,
              fontWeight: 500,
              color: COLORS.ink,
              mb: '4px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {salon.name}
          </Typography>

          <Stack direction="row" alignItems="center" gap={1} sx={{ fontSize: 12, color: COLORS.inkSoft, mb: '10px' }}>
            <Stack direction="row" alignItems="center" gap={0.4}>
              <Box component="span" sx={{ color: '#E8A020', fontSize: 12 }}>★</Box>
              <Box component="span" sx={{ fontWeight: 600, color: COLORS.ink, fontSize: 13 }}>{salon.rating.toFixed(1)}</Box>
            </Stack>
            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: COLORS.inkFaint }} />
            <span>{salon.reviewCount} {t('salon.reviewsCount')}</span>
            {formatDistance(salon.distanceKm) && (
              <>
                <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: COLORS.inkFaint }} />
                <span>{formatDistance(salon.distanceKm)}</span>
              </>
            )}
          </Stack>

          <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: '12px' }}>
            {salon.services.slice(0, 3).map(s => (
              <Box
                key={s.name}
                sx={{
                  fontSize: 11,
                  color: COLORS.accent,
                  bgcolor: COLORS.accentLight,
                  px: '9px',
                  py: '3px',
                  borderRadius: 100,
                  fontWeight: 500,
                }}
              >
                {s.name}
              </Box>
            ))}
          </Stack>

          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 'auto' }}>
            {price != null ? (
              <Typography sx={{ fontSize: 13, color: COLORS.inkSoft }}>
                от <Box component="strong" sx={{ fontSize: 15, fontWeight: 500, color: COLORS.ink }}>{formatPrice(price)} ₽</Box>
              </Typography>
            ) : (
              <Box />
            )}
            {salon.onlineBooking ? (
              <Button
                variant="contained"
                size="small"
                onClick={e => {
                  e.stopPropagation()
                  navigate(salonPath(salon.id))
                }}
                sx={{
                  fontSize: 12,
                  fontWeight: 500,
                  bgcolor: '#6B0606',
                  color: '#DFBFA8',
                  borderRadius: 100,
                  px: 2,
                  py: 1,
                  '&:hover': { bgcolor: '#8a0707' },
                }}
              >
                {t('salon.bookOnline')}
              </Button>
            ) : (
              <Typography sx={{ fontSize: 12, color: COLORS.inkSoft }}>{t('salon.bookByPhone')}</Typography>
            )}
          </Stack>
        </Box>
      </Box>
    </motion.div>
  )
}
