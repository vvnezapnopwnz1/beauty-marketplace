/** Semantic brand colors (light cream theme + Warm Mocha dark). */
export type BrandColors = {
  cream: string
  ink: string
  inkSoft: string
  inkFaint: string
  blush: string
  blushLight: string
  sage: string
  sageLight: string
  accent: string
  accentLight: string
  white: string
  border: string
  borderLight: string
  onAccent: string
  hoverOverlay: string
  fabBg: string
  fabBgHover: string
  fabColor: string
}

export const COLORS_LIGHT: BrandColors = {
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
  onAccent: '#FFFFFF',
  hoverOverlay: 'rgba(0,0,0,0.06)',
  fabBg: '#1A1612',
  fabBgHover: '#2a2420',
  fabColor: '#FFFFFF',
}

/** Warm Mocha — default dark (docs/beautica-v2-redesign.html). */
export const COLORS_DARK: BrandColors = {
  cream: '#2B241F',
  ink: '#F0EAE3',
  inkSoft: '#B8A896',
  inkFaint: '#8a8278',
  blush: 'rgba(216,149,107,0.28)',
  blushLight: 'rgba(216,149,107,0.12)',
  sage: '#8FAF8A',
  sageLight: 'rgba(143,175,138,0.18)',
  accent: '#D8956B',
  accentLight: 'rgba(216,149,107,0.15)',
  white: '#3A3028',
  border: '#4A423A',
  borderLight: '#5a5348',
  onAccent: '#1a0e09',
  hoverOverlay: 'rgba(255,255,255,0.08)',
  fabBg: '#2B241F',
  fabBgHover: '#3A3028',
  fabColor: '#F0EAE3',
}


export const V = {
  surface: '#FFFFFF',
  surfaceEl: '#FFF0F6',
  surfaceHi: '#FFE6EF',
  border: '#EDD8E5',
  borderSub: 'rgba(212,84,122,0.08)',
  text: '#18080E',
  textSub: '#6B4055',
  textMuted: '#A07890',
  accent: '#D4547A',
  accentHov: '#C0406A',
  accentSoft: 'rgba(212,84,122,0.08)',
  success: '#2A9E6A',
  successSoft: 'rgba(42,158,106,0.09)',
  warning: '#C4800A',
  warnSoft: 'rgba(196,128,10,0.09)',
  info: '#4A90D4',
  infoSoft: 'rgba(74,144,212,0.09)',
  error: '#C04040',
  errorSoft: 'rgba(192,64,64,0.09)',
  rSm: '8px',
  rMd: '14px',
  rLg: '20px',
} as const

// ─── VELA Ivory Day — theme-independent tokens ────────────────────────────────
// Hardcoded so the table looks identical in both light and dark app themes.

// Passed to DataGridTable styled-component so it overrides MUI dark-theme defaults.
export const VELA_IVORY_PALETTE = {
  page: V.surface,
  sidebar: V.surfaceEl,
  card: V.surface,
  cardAlt: V.surfaceEl,
  dialog: V.surface,
  border: V.border,
  borderLight: V.border,
  borderSubtle: V.borderSub,
  borderHairline: 'rgba(212,84,122,0.05)',
  borderFocus: V.accent,
  control: V.surfaceEl,
  controlHover: V.surfaceEl,
  input: V.surface,
  inputBorder: V.border,
  card2: V.surfaceEl,
  grid: V.border,
  gridHeader: V.surfaceEl,
  timeColumn: V.surfaceEl,
  cell: V.surface,
  cellAlt: V.surfaceEl,
  text: V.text,
  muted: V.textMuted,
  mutedDark: V.textSub,
  accent: V.accent,
  accentDark: V.accentHov,
  onAccent: '#FFFFFF',
  red: V.error,
  green: V.success,
  yellow: V.warning,
  blue: V.info,
  purple: '#7A5AC4',
  pink: V.accent,
  errorBg: V.errorSoft,
  warningBg: V.warnSoft,
  navHover: V.accentSoft,
  shadowDeep: 'rgba(212,84,122,0.10)',
  backdrop: 'rgba(212,84,122,0.15)',
  bg: V.surface,
  surface: V.surface,
  shadowLight: '0px 4px 20px rgba(212,84,122,0.07)',
  tableHeader: V.surfaceEl,
  tableBorder: V.border,
} as const