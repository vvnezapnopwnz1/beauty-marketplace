import { Box, Typography, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useBrandColors } from '@shared/theme'

type PromoLayout = 'default' | 'sidebar'

interface Props {
  /** Узкая колонка справа: вертикальный стек, кнопка на всю ширину */
  layout?: PromoLayout
}

export function PromoBanner({ layout = 'default' }: Props) {
  const { t } = useTranslation()
  const COLORS = useBrandColors()
  const isSidebar = layout === 'sidebar'

  return (
    <Box
      sx={{
        bgcolor: COLORS.ink,
        borderRadius: '16px',
        p: isSidebar ? '16px' : '20px',
        mb: isSidebar ? 0 : '20px',
        display: 'flex',
        flexDirection: isSidebar ? 'column' : 'row',
        alignItems: isSidebar ? 'stretch' : 'center',
        gap: isSidebar ? '12px' : '14px',
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
          alignSelf: isSidebar ? 'center' : undefined,
        }}
      >
        🎁
      </Box>

      <Box
        sx={{
          flex: isSidebar ? undefined : 1,
          minWidth: 0,
          textAlign: isSidebar ? 'center' : 'left',
        }}
      >
        <Typography
          sx={{
            fontSize: isSidebar ? 13 : 14,
            fontWeight: 500,
            color: COLORS.white,
            mb: '2px',
          }}
        >
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
          width: isSidebar ? '100%' : 'auto',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
        }}
      >
        {t('promo.cta')}
      </Button>
    </Box>
  )
}
