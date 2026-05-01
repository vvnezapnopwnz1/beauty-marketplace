import { createTheme } from '@mui/material/styles'
import type { VelaTheme } from './themes'

export type ThemeMode = 'light' | 'dark'

const DISPLAY_FONT = "'Cormorant', serif"
const UI_FONT = "'Plus Jakarta Sans', sans-serif"

export function createAppTheme(t: VelaTheme) {
  return createTheme({
    palette: {
      mode: t.dark ? 'dark' : 'light',
      primary: {
        main: t.accent,
        light: t.accentSoft,
        dark: t.accentDark,
        contrastText: t.onAccent,
      },
      secondary: {
        main: t.sage,
        light: t.sageLight,
        contrastText: t.onAccent,
      },
      background: {
        default: t.bg,
        paper: t.surface,
      },
      text: {
        primary: t.text,
        secondary: t.textSub,
        disabled: t.textMuted,
      },
      divider: t.border,
      dashboard: t,
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: UI_FONT,
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 600,
      h1: { fontFamily: DISPLAY_FONT, fontWeight: 500, letterSpacing: '-1.5px' },
      h2: { fontFamily: DISPLAY_FONT, fontWeight: 500, letterSpacing: '-1px' },
      h3: { fontFamily: DISPLAY_FONT, fontWeight: 500, letterSpacing: '-0.5px' },
      h4: { fontFamily: DISPLAY_FONT, fontWeight: 500, letterSpacing: '-0.5px' },
      h5: { fontFamily: DISPLAY_FONT, fontWeight: 500 },
      h6: { fontFamily: UI_FONT, fontWeight: 500 },
      button: { textTransform: 'none', fontWeight: 500 },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 100,
            fontFamily: UI_FONT,
            fontWeight: 500,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
          containedPrimary: {
            backgroundColor: t.accent,
            color: t.onAccent,
            '&:hover': { backgroundColor: t.accentDark },
          },
          outlinedPrimary: {
            borderColor: t.borderLight,
            color: t.text,
            '&:hover': { backgroundColor: t.accentSoft, borderColor: t.textSub },
          },
          text: {
            '&:hover': { backgroundColor: t.hoverOverlay },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            border: `1px solid ${t.border}`,
            borderRadius: 16,
            transition: 'box-shadow 0.2s, transform 0.2s',
            '&:hover': { boxShadow: t.shadowLight, transform: 'translateY(-2px)' },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 100, fontFamily: UI_FONT, fontWeight: 500 },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            fontFamily: UI_FONT,
            '& fieldset': { borderColor: t.inputBorder },
          },
        },
      },
    },
  })
}
