import { useMemo } from 'react'
import { useTheme } from '@mui/material'
import type { DashboardPalette } from '@shared/theme'

/** Текущая палитра дашборда (светлая/тёмная), не статический `mocha` из legacy-файла. */
export function useDashboardPalette(): DashboardPalette {
  const theme = useTheme()
  const dashboard = theme.palette.dashboard
  const isLight = theme.palette.mode === 'light'

  // Уменьшаем интенсивность фоновых цветов в светлой теме
  if (isLight) {
    return {
      ...dashboard,
      bg: '#fff', // Делаем фон полностью белым
      surface: '#fff', // Фон карточек и секций
      control: 'rgba(245, 240, 235, 0.3)', // Светлее control
      input: 'rgba(245, 240, 235, 0.3)', // Светлее input
      inputBorder: 'rgba(0, 0, 0, 0.2)', // Более светлая border
      muted: 'rgba(0, 0, 0, 0.6)',
      mutedDark: 'rgba(0, 0, 0, 0.7)',
      borderLight: 'rgba(0, 0, 0, 0.15)',
      text: '#000', // Черный текст
      borderHairline: 'rgba(0, 0, 0, 0.1)',
      shadowLight: '0px 4px 20px rgba(0, 0, 0, 0.08)',
      shadowDeep: '0px 4px 20px rgba(0, 0, 0, 0.12)',
      tableHeader: '#fff',
      tableBorder: 'rgba(0, 0, 0, 0.1)',
      yellow: '#F2C94C',
      red: '#E06060',
      green: '#27AE60',
      blue: '#2D9CDB',
    }
  }

  return dashboard
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
