import { createTheme } from '@mui/material/styles'

export const COLORS = {
  cream: '#FAF7F2',
  ink: '#1A1612',
  inkSoft: '#6B6460',
  inkFaint: '#C2BDB8',
  blush: '#E8C4B0',
  blushLight: '#F5EBE4',
  sage: '#8FAF8A',
  sageLight: '#EAF0E9',
  accent: '#C4703F',
  accentLight: '#F2E6DC',
  white: '#FFFFFF',
  border: '#EDE8E2',
  borderLight: '#E0D8D0',
} as const

const FRAUNCES = "'Fraunces', serif"
const DM_SANS = "'DM Sans', system-ui, sans-serif"

export const theme = createTheme({
  palette: {
    primary: {
      main: COLORS.accent,
      light: COLORS.accentLight,
      dark: '#b0622f',
      contrastText: COLORS.white,
    },
    secondary: {
      main: COLORS.sage,
      light: COLORS.sageLight,
      contrastText: COLORS.white,
    },
    background: {
      default: COLORS.cream,
      paper: COLORS.white,
    },
    text: {
      primary: COLORS.ink,
      secondary: COLORS.inkSoft,
      disabled: COLORS.inkFaint,
    },
    divider: COLORS.border,
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
          backgroundColor: COLORS.ink,
          '&:hover': { backgroundColor: '#2e2a26' },
        },
        outlinedPrimary: {
          borderColor: COLORS.borderLight,
          color: COLORS.ink,
          '&:hover': {
            backgroundColor: COLORS.blushLight,
            borderColor: COLORS.inkSoft,
          },
        },
        text: {
          '&:hover': { backgroundColor: COLORS.blushLight },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          transition: 'box-shadow 0.2s, transform 0.2s',
          '&:hover': {
            boxShadow: '0 2px 16px rgba(26,22,18,0.07)',
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
          '& fieldset': { borderColor: COLORS.borderLight },
        },
      },
    },
  },
})
