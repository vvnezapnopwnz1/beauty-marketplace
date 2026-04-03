import { Box, Typography, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { COLORS } from '@shared/theme'

export function PromoBanner() {
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        bgcolor: COLORS.ink,
        borderRadius: '16px',
        p: '20px',
        mb: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: '12px',
          bgcolor: 'rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        🎁
      </Box>

      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 500, color: COLORS.white, mb: '2px' }}>
          {t('promo.title')}
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
          {t('promo.subtitle')}
        </Typography>
      </Box>

      <Button
        sx={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          fontWeight: 500,
          color: COLORS.ink,
          bgcolor: COLORS.white,
          borderRadius: 100,
          px: '14px',
          py: 1,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
        }}
      >
        {t('promo.cta')}
      </Button>
    </Box>
  )
}
