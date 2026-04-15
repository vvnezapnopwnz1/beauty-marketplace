import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { COLORS_DARK, COLORS_LIGHT, type BrandColors } from './palettes'
import { createAppTheme, type ThemeMode } from './createAppTheme'
import { getDashboardPalette } from './dashboardPalette'

const STORAGE_KEY = 'beautica-theme'

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === 'light' || v === 'dark') return v
  return 'dark'
}

type ThemeModeContextValue = {
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  toggleMode: () => void
  colors: BrandColors
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null)

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode)

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    try {
      localStorage.setItem(STORAGE_KEY, m)
    } catch {
      /* ignore */
    }
  }, [])

  const toggleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark')
  }, [mode, setMode])

  const colors = mode === 'dark' ? COLORS_DARK : COLORS_LIGHT
  const dashboard = useMemo(() => getDashboardPalette(mode), [mode])
  const muiTheme = useMemo(() => createAppTheme(mode, colors, dashboard), [mode, colors, dashboard])

  const value = useMemo<ThemeModeContextValue>(
    () => ({ mode, setMode, toggleMode, colors }),
    [mode, setMode, toggleMode, colors],
  )

  return (
    <ThemeModeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </ThemeModeContext.Provider>
  )
}

export function useBrandColors(): BrandColors {
  const ctx = useContext(ThemeModeContext)
  if (!ctx) {
    throw new Error('useBrandColors must be used within ThemeModeProvider')
  }
  return ctx.colors
}

export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext)
  if (!ctx) {
    throw new Error('useThemeMode must be used within ThemeModeProvider')
  }
  return ctx
}
