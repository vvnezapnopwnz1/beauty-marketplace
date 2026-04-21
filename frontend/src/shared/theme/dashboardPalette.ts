import type { ThemeMode } from './createAppTheme'

export type DashboardPalette = {
  page: string
  sidebar: string
  card: string
  cardAlt: string
  dialog: string
  border: string
  borderLight: string
  borderSubtle: string
  borderHairline: string
  borderFocus: string
  control: string
  controlHover: string
  input: string
  inputBorder: string
  card2: string
  grid: string
  gridHeader: string
  timeColumn: string
  cell: string
  cellAlt: string
  text: string
  muted: string
  mutedDark: string
  accent: string
  accentDark: string
  onAccent: string
  red: string
  green: string
  yellow: string
  blue: string
  purple: string
  pink: string
  errorBg: string
  warningBg: string
  navHover: string
  shadowDeep: string
  backdrop: string
  bg: string
  surface: string
  shadowLight: string
  tableHeader: string
  tableBorder: string
}

export const DASHBOARD_DARK: DashboardPalette = {
  page: '#171310',
  sidebar: '#3A3028',
  card: '#252119',
  cardAlt: '#2B2720',
  dialog: '#1F1B17',
  border: '#38322C',
  borderLight: '#4d4640',
  borderSubtle: 'rgba(255,255,255,0.06)',
  borderHairline: 'rgba(255,255,255,0.04)',
  borderFocus: '#7A6655',
  control: '#2B2720',
  controlHover: '#332e28',
  input: '#252119',
  inputBorder: '#38322C',
  card2: '#2B2720',
  grid: '#38322C',
  gridHeader: '#252119',
  timeColumn: '#1F1B17',
  cell: '#2B2720',
  cellAlt: '#1F1B17',
  text: '#EDE7DF',
  muted: '#A89280',
  mutedDark: '#6C5E52',
  accent: '#C8855A',
  accentDark: '#b5714a',
  onAccent: '#1a0e09',
  red: '#E06060',
  green: '#6BCB77',
  yellow: '#FFD93D',
  blue: '#4ECDC4',
  purple: '#B088F9',
  pink: '#FF8FAB',
  errorBg: '#2e1f1f',
  warningBg: '#2e2a1a',
  navHover: 'rgba(255,255,255,0.05)',
  shadowDeep: 'rgba(0,0,0,0.5)',
  backdrop: 'rgba(20, 16, 12, 0.82)',

  bg: '#fff',
  surface: '#fff',
  shadowLight: '0px 4px 20px rgba(0, 0, 0, 0.08)',
  tableHeader: '#fff',
  tableBorder: 'rgba(0, 0, 0, 0.1)',
}

export const DASHBOARD_LIGHT: DashboardPalette = {
  page: '#FAF7F2',
  sidebar: '#F2ECE5',
  card: '#FFFFFF',
  cardAlt: '#F5EFE8',
  dialog: '#FFFFFF',
  border: '#E0D8D0',
  borderLight: '#D2C8BD',
  borderSubtle: 'rgba(26,22,18,0.08)',
  borderHairline: 'rgba(26,22,18,0.05)',
  borderFocus: '#C4703F',
  control: '#EFE7DE',
  controlHover: '#E8DED3',
  input: '#FFFFFF',
  inputBorder: '#DCCFC1',
  card2: '#F6F0E8',
  grid: '#E5DDD3',
  gridHeader: '#F2ECE5',
  timeColumn: '#F7F2EC',
  cell: '#FFFFFF',
  cellAlt: '#F5EFE8',
  text: '#1A1612',
  muted: '#6B6460',
  mutedDark: '#5C5550',
  accent: '#C4703F',
  accentDark: '#AB5F34',
  onAccent: '#FFFFFF',
  red: '#C74B4B',
  green: '#3F9A52',
  yellow: '#A27C12',
  blue: '#2F91A5',
  purple: '#7D5CC1',
  pink: '#B85684',
  errorBg: '#F9E8E5',
  warningBg: '#FAF1DE',
  navHover: 'rgba(26,22,18,0.05)',
  shadowDeep: 'rgba(26,22,18,0.16)',
  backdrop: 'rgba(26, 22, 18, 0.30)',

  bg: '#fff',
  surface: '#fff',
  shadowLight: '0px 4px 20px rgba(0, 0, 0, 0.08)',
  tableHeader: '#fff',
  tableBorder: 'rgba(0, 0, 0, 0.1)',
}

export function getDashboardPalette(mode: ThemeMode): DashboardPalette {
  return mode === 'dark' ? DASHBOARD_DARK : DASHBOARD_LIGHT
}
