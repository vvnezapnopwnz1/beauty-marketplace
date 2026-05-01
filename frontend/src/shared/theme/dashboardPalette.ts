import type { VelaTheme } from './themes'

// DashboardPalette is now the full VelaTheme — every theme has all dashboard tokens built in.
export type DashboardPalette = VelaTheme

// getDashboardPalette kept for backward compat — just returns the theme itself.
export function getDashboardPalette(theme: VelaTheme): DashboardPalette {
  return theme
}
