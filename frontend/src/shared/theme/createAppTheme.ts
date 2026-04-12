import { createTheme } from '@mui/material/styles'
import type { BrandColors } from './palettes'

export type ThemeMode = 'light' | 'dark'

const FRAUNCES = "'Fraunces', serif"
const DM_SANS = "'DM Sans', system-ui, sans-serif"

export function createAppTheme(mode: ThemeMode, c: BrandColors) {
  const isDark = mode === 'dark'
  const cardHoverShadow = isDark
    ? '0 2px 16px rgba(216,149,107,0.12)'
    : '0 2px 16px rgba(26,22,18,0.07)'

  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: {
        main: c.accent,
        light: c.accentLight,
        dark: isDark ? '#C17F57' : '#b0622f',
        contrastText: c.onAccent,
      },
      secondary: {
        main: c.sage,
        light: c.sageLight,
        contrastText: '#FFFFFF',
      },
      background: {
        default: c.cream,
        paper: c.white,
      },
      text: {
        primary: c.ink,
        secondary: c.inkSoft,
        disabled: c.inkFaint,
      },
      divider: c.border,
    },
    shape: { borderRadius: 16 },
    typography: {
      fontFamily: DM_SANS,
      fontWeightLight: 300,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      fontWeightBold: 600,
      h1: { fontFamily: FRAUNCES, fontWeight: 500, letterSpacing: '-1.5px' },
      h2: { fontFamily: FRAUNCES, fontWeight: 500, letterSpacing: '-1px' },
      h3: { fontFamily: FRAUNCES, fontWeight: 500, letterSpacing: '-0.5px' },
      h4: { fontFamily: FRAUNCES, fontWeight: 500, letterSpacing: '-0.5px' },
      h5: { fontFamily: FRAUNCES, fontWeight: 500 },
      h6: { fontFamily: DM_SANS, fontWeight: 500 },
      button: { textTransform: 'none', fontWeight: 500 },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 100,
            fontFamily: DM_SANS,
            fontWeight: 500,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
          containedPrimary: {
            backgroundColor: isDark ? c.accent : c.ink,
            color: isDark ? c.onAccent : c.white,
            '&:hover': {
              backgroundColor: isDark ? '#C17F57' : '#2e2a26',
            },
          },
          outlinedPrimary: {
            borderColor: c.borderLight,
            color: c.ink,
            '&:hover': {
              backgroundColor: c.blushLight,
              borderColor: c.inkSoft,
            },
          },
          text: {
            '&:hover': { backgroundColor: c.blushLight },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            border: `1px solid ${c.border}`,
            borderRadius: 16,
            transition: 'box-shadow 0.2s, transform 0.2s',
            '&:hover': {
              boxShadow: cardHoverShadow,
              transform: 'translateY(-2px)',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 100, fontFamily: DM_SANS, fontWeight: 500 },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            fontFamily: DM_SANS,
            '& fieldset': { borderColor: c.borderLight },
          },
        },
      },
    },
  })
}
