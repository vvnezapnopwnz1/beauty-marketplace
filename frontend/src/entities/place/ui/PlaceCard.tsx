import { Box, Typography, Stack } from '@mui/material'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useBrandColors } from '@shared/theme'
import type { PlaceItem } from '@shared/api/placesApi'
import { CARD_GRADIENTS } from '@entities/salon'
import { placePath } from '@shared/config/routes'

interface Props {
  place: PlaceItem
}

const GRADIENT_KEYS = Object.keys(CARD_GRADIENTS)

function pickGradient(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0
  const key = GRADIENT_KEYS[Math.abs(hash) % GRADIENT_KEYS.length]
  return CARD_GRADIENTS[key]
}

const EMOJIS = ['✂', '💅', '✦', '🪒', '✻', '💆']

function pickEmoji(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 37 + name.charCodeAt(i)) | 0
  return EMOJIS[Math.abs(hash) % EMOJIS.length]
}

export function PlaceCard({ place }: Props) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const COLORS = useBrandColors()
  const gradient = pickGradient(place.name)
  const emoji = pickEmoji(place.name)
  const photo = place.photoUrl?.trim()

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ height: '100%' }}
    >
      <Box
        onClick={() => navigate(placePath(place.externalId))}
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
        <Box
          sx={{
            width: '100%',
            height: 140,
            background: photo ? undefined : gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {photo ? (
            <Box
              component="img"
              src={photo}
              alt=""
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Typography sx={{ fontSize: 48, lineHeight: 1 }}>{emoji}</Typography>
          )}
        </Box>

        <Box sx={{ p: '14px 16px 16px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
          <Typography
            sx={{
              fontFamily: "'Fraunces', serif",
              fontSize: 15,
              fontWeight: 500,
              color: COLORS.ink,
              mb: '6px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {place.name}
          </Typography>

          {place.address && (
            <Typography sx={{ fontSize: 12, color: COLORS.inkSoft, mb: '8px' }}>
              {place.address}
            </Typography>
          )}

          {(place.rating != null || place.reviewCount != null) && (
            <Typography sx={{ fontSize: 12, color: COLORS.inkSoft, mb: '8px' }}>
              {place.rating != null && `${place.rating.toFixed(1)} ★`}
              {place.rating != null && place.reviewCount != null && ' · '}
              {place.reviewCount != null && t('place.cardReviews', { count: place.reviewCount })}
            </Typography>
          )}

          <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 'auto' }}>
            <Box
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
              2ГИС
            </Box>
          </Stack>
        </Box>
      </Box>
    </motion.div>
  )
}
