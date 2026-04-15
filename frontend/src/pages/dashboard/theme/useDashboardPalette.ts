import { useMemo } from 'react'
import { useTheme } from '@mui/material'
import type { DashboardPalette } from '@shared/theme'

/** Текущая палитра дашборда (светлая/тёмная), не статический `mocha` из legacy-файла. */
export function useDashboardPalette(): DashboardPalette {
  return useTheme().palette.dashboard
}

/** Карточки списков (записи, услуги) — те же фон/граница/тень, что в профиле мастера. */
export function useDashboardListCardSurface() {
  const theme = useTheme()
  const d = useDashboardPalette()
  return useMemo(() => {
    const isLight = theme.palette.mode === 'light'
    return {
      isLight,
      bg: isLight ? '#F2ECE5' : d.card,
      border: isLight ? d.borderLight : d.borderHairline,
      shadow: isLight ? '0 2px 10px rgba(26,22,18,0.08)' : 'none',
      hoverBg: isLight ? '#EDE6DD' : d.cardAlt,
    }
  }, [d, theme.palette.mode])
}
