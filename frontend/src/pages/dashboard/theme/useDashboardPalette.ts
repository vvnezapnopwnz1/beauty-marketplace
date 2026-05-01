import { useMemo } from 'react'
import { useTheme } from '@mui/material'
import type { DashboardPalette } from '@shared/theme'

export function useDashboardPalette(): DashboardPalette {
  return useTheme().palette.dashboard
}

export function useDashboardListCardSurface() {
  const d = useDashboardPalette()
  return useMemo(
    () => ({
      isLight: !d.dark,
      bg: d.card,
      border: d.borderHairline,
      shadow: 'none',
      hoverBg: d.cardAlt,
    }),
    [d],
  )
}
