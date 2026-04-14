/**
 * Warm Mocha — палитра дашборда салона (согласована с COLORS_DARK в shared/theme/palettes).
 * Поверхности тёплые коричневые, без «чистого чёрного» #111 / #1a1a1a.
 */
export const mocha = {
  page: '#2B241F',
  /** Боковая панель и шапка */
  sidebar: '#3A3028',
  /** Карточки, таблицы, крупные блоки */
  card: '#3A3028',
  cardAlt: '#352d26',
  /** Диалоги, выпадающие панели */
  dialog: '#383028',
  /** Разделители */
  border: '#4A423A',
  borderLight: '#5a5348',
  borderSubtle: 'rgba(255,255,255,0.08)',
  borderHairline: 'rgba(255,255,255,0.06)',

  /** Вторичные кнопки, тулбар (вместо #333 / #444) */
  control: '#4a4238',
  controlHover: '#554a40',

  input: '#342d26',
  inputBorder: '#5a5348',

  /** Сетка календаря */
  grid: '#454038',
  gridHeader: '#3d362f',
  timeColumn: '#2f2822',
  cell: '#403830',
  cellAlt: '#2a2520',

  text: '#F0EAE3',
  muted: '#B8A896',
  accent: '#D8956B',
  accentDark: '#c07a50',
  onAccent: '#1a0e09',

  red: '#FF6B6B',
  green: '#6BCB77',
  yellow: '#FFD93D',
  blue: '#4ECDC4',
  purple: '#B088F9',
  pink: '#FF8FAB',

  errorBg: '#3d2a28',
  warningBg: '#3d3428',

  navHover: 'rgba(255,255,255,0.06)',
  shadowDeep: 'rgba(0,0,0,0.35)',
  backdrop: 'rgba(45, 38, 32, 0.78)',
} as const
