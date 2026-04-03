import { Box, Typography, Stack, Button } from '@mui/material'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Salon } from '../model/types'
import { formatPrice, CARD_GRADIENTS } from '../model/mockData'
import { salonPath } from '@shared/config/routes'
import { COLORS } from '@shared/theme'

interface Props {
  salon: Salon
}

const BADGE_STYLES: Record<string, { bgcolor: string; color: string; labelKey: string }> = {
  popular: { bgcolor: COLORS.accent, color: COLORS.white, labelKey: 'salon.badgePopular' },
  top:     { bgcolor: COLORS.sage,   color: COLORS.white, labelKey: 'salon.badgeTop' },
  new:     { bgcolor: COLORS.ink,    color: COLORS.white, labelKey: 'salon.badgeNew' },
}

export function SalonCard({ salon }: Props) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const price = Math.min(...salon.services.map(s => s.priceCents))
  const gradient = CARD_GRADIENTS[salon.cardGradient] ?? CARD_GRADIENTS.bg1
  const badge = salon.badge ? BADGE_STYLES[salon.badge] : null

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
            <Stack direction="row" alignItems="center" gap={0.4} sx={{ fontWeight: 500, color: COLORS.ink }}>
              <Box component="span" sx={{ color: '#F5A623', fontSize: 11 }}>★</Box>
              {salon.rating.toFixed(1)}
            </Stack>
            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: COLORS.inkFaint }} />
            <span>{salon.reviewCount} reviews</span>
            <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: COLORS.inkFaint }} />
            <span>{salon.distanceKm} {t('salon.km')}</span>
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
            <Typography sx={{ fontSize: 13, color: COLORS.inkSoft }}>
              от <Box component="strong" sx={{ fontSize: 15, fontWeight: 500, color: COLORS.ink }}>{formatPrice(price)} ₽</Box>
            </Typography>
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
                  bgcolor: COLORS.ink,
                  color: COLORS.white,
                  borderRadius: 100,
                  px: 2,
                  py: 1,
                  '&:hover': { bgcolor: COLORS.accent },
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
