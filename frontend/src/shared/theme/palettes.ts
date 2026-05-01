import type { VelaTheme } from './themes'
import { THEMES_MAP, DEFAULT_DARK_ID, DEFAULT_LIGHT_ID } from './themes'

export type BrandColors = VelaTheme

let _activeTheme: VelaTheme = THEMES_MAP[DEFAULT_DARK_ID]

export function _setActiveTheme(t: VelaTheme): void {
  _activeTheme = t
}

// V is a dynamic proxy that always reads from the currently active theme.
// Used by non-React module-level code that can't call hooks.
// V.rSm / V.rMd / V.rLg are static radius shortcuts.
export const V = new Proxy({} as VelaTheme & { rSm: string; rMd: string; rLg: string }, {
  get(_: unknown, key: string) {
    if (key === 'rSm') return '8px'
    if (key === 'rMd') return '14px'
    if (key === 'rLg') return '20px'
    return _activeTheme[key as keyof VelaTheme]
  },
}) as VelaTheme & { rSm: string; rMd: string; rLg: string }

// backward compat exports
export const COLORS_DARK: VelaTheme = THEMES_MAP[DEFAULT_DARK_ID]
export const COLORS_LIGHT: VelaTheme = THEMES_MAP[DEFAULT_LIGHT_ID]
