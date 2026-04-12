import { Button } from '@mui/material'
import MapOutlinedIcon from '@mui/icons-material/MapOutlined'
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined'
import { useTranslation } from 'react-i18next'
import { useBrandColors } from '@shared/theme'

type ViewMode = 'list' | 'map'

interface Props {
  viewMode: ViewMode
  onToggle: () => void
}

export function MapToggleButton({ viewMode, onToggle }: Props) {
  const { t } = useTranslation()
  const COLORS = useBrandColors()
  const isMap = viewMode === 'map'

  return (
    <Button
      type="button"
      variant="contained"
      disableElevation
      onClick={onToggle}
      startIcon={isMap ? <ViewListOutlinedIcon sx={{ fontSize: 20 }} /> : <MapOutlinedIcon sx={{ fontSize: 20 }} />}
      sx={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        borderRadius: '100px',
        px: 3,
        py: 1.5,
        textTransform: 'none',
        fontWeight: 600,
        fontSize: 15,
        bgcolor: COLORS.fabBg,
        color: COLORS.fabColor,
        boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          bgcolor: COLORS.fabBgHover,
          transform: 'translateX(-50%) scale(1.05)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
        },
      }}
    >
      {isMap ? t('search.showList') : t('search.showMap')}
    </Button>
  )
}
