import '@mui/material/styles'
import type { DashboardPalette } from './dashboardPalette'

declare module '@mui/material/styles' {
  interface Palette {
    dashboard: DashboardPalette
  }

  interface PaletteOptions {
    dashboard: DashboardPalette
  }
}
