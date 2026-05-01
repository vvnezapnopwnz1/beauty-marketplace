import '@mui/material/styles'
import type { VelaTheme } from './themes'

declare module '@mui/material/styles' {
  interface Palette {
    dashboard: VelaTheme
  }
  interface PaletteOptions {
    dashboard: VelaTheme
  }
}
