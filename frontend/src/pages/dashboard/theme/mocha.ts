export type { DashboardPalette } from '@shared/theme'
export { getDashboardPalette } from '@shared/theme'
import { THEMES_MAP, DEFAULT_DARK_ID } from '@shared/theme'

/** Legacy export kept for gradual migration to theme.palette.dashboard. */
export const mocha = THEMES_MAP[DEFAULT_DARK_ID]
