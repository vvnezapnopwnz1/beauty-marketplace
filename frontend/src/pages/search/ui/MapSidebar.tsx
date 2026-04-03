import { Box, Typography, Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { Salon } from '@entities/salon'
import { CARD_GRADIENTS } from '@entities/salon'
import { COLORS } from '@shared/theme'

interface Props {
  salons: Salon[]
}

const PIN_POSITIONS = [
  { top: '76px', left: '72px'  },
  { top: '56px', left: '185px' },
  { top: '96px', right: '64px' },
  { bottom: '100px', left: '52px' },
  { bottom: '80px', right: '80px' },
]

export function MapSidebar({ salons }: Props) {
  const { t } = useTranslation()
  const nearby = salons.slice(0, 4)

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderRadius: '16px',
        border: `1px solid ${COLORS.border}`,
        overflow: 'hidden',
        position: 'sticky',
        top: 88,
      }}
    >
      {/* Map placeholder */}
      <Box
        sx={{
          height: 320,
          bgcolor: '#E8EBE4',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Grid */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Roads SVG */}
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

        {/* Map pins */}
        {salons.slice(0, 5).map((salon, i) => {
          const pos = PIN_POSITIONS[i] ?? PIN_POSITIONS[0]
          const isFirst = i === 0
          const pinColor = isFirst ? COLORS.accent : COLORS.ink
          const label = isFirst ? salon.name : `${Math.round(Math.min(...salon.services.map(s => s.priceCents)) / 100)} ₽`

          return (
            <Box
              key={salon.id}
              sx={{
                position: 'absolute',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s',
                '&:hover': { transform: 'scale(1.1)' },
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

        {/* Zoom controls */}
        <Box sx={{ position: 'absolute', right: 12, bottom: 12, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {['+', '−'].map(ctrl => (
            <Box
              key={ctrl}
              component="button"
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

      {/* Nearby list */}
      <Box sx={{ p: 2 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: COLORS.ink, mb: '12px' }}>
          {t('map.closestToYou')}
        </Typography>

        <Stack gap='10px'>
          {nearby.map(salon => (
            <Box
              key={salon.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                p: '10px',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'background 0.1s',
                '&:hover': { bgcolor: COLORS.cream },
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '10px',
                  background: CARD_GRADIENTS[salon.cardGradient],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {salon.emoji}
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
                  {salon.name}
                </Typography>
                <Typography sx={{ fontSize: 11, color: COLORS.inkSoft, mt: '2px' }}>
                  ⭑ {salon.rating} · {salon.reviewCount} reviews
                </Typography>
              </Box>

              <Typography sx={{ fontSize: 12, color: COLORS.inkFaint, whiteSpace: 'nowrap' }}>
                {salon.distanceKm} km
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  )
}
