import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { type VelaTheme, THEMES, THEMES_MAP, DEFAULT_DARK_ID, DEFAULT_LIGHT_ID } from './themes'
import { createAppTheme } from './createAppTheme'
import { _setActiveTheme } from './palettes'

const STORAGE_KEY = 'beautica-theme-id'

function readStoredThemeId(): string {
  if (typeof window === 'undefined') return DEFAULT_DARK_ID
  const v = localStorage.getItem(STORAGE_KEY)
  if (v && THEMES_MAP[v]) return v
  return DEFAULT_DARK_ID
}

export type AppThemeContextValue = {
  themeId: string
  theme: VelaTheme
  themes: VelaTheme[]
  setThemeId: (id: string) => void
  // backward compat
  mode: 'dark' | 'light'
  setMode: (m: 'dark' | 'light') => void
  toggleMode: () => void
  colors: VelaTheme
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null)

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<string>(readStoredThemeId)

  const theme = THEMES_MAP[themeId] ?? THEMES_MAP[DEFAULT_DARK_ID]

  useEffect(() => {
    _setActiveTheme(theme)
  }, [theme])

  const setThemeId = useCallback((id: string) => {
    if (!THEMES_MAP[id]) return
    setThemeIdState(id)
    _setActiveTheme(THEMES_MAP[id])
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      /* ignore */
    }
  }, [])

  const mode: 'dark' | 'light' = theme.dark ? 'dark' : 'light'

  const setMode = useCallback(
    (m: 'dark' | 'light') => {
      if (m === 'dark' && !theme.dark) setThemeId(DEFAULT_DARK_ID)
      else if (m === 'light' && theme.dark) setThemeId(DEFAULT_LIGHT_ID)
    },
    [theme.dark, setThemeId],
  )

  const toggleMode = useCallback(() => {
    setMode(theme.dark ? 'light' : 'dark')
  }, [theme.dark, setMode])

  const muiTheme = useMemo(() => createAppTheme(theme), [theme])

  const value = useMemo<AppThemeContextValue>(
    () => ({ themeId, theme, themes: THEMES, setThemeId, mode, setMode, toggleMode, colors: theme }),
    [themeId, theme, setThemeId, mode, setMode, toggleMode],
  )

  return (
    <AppThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </AppThemeContext.Provider>
  )
}

export function useAppTheme(): AppThemeContextValue {
  const ctx = useContext(AppThemeContext)
  if (!ctx) throw new Error('useAppTheme must be used within ThemeModeProvider')
  return ctx
}

export function useBrandColors(): VelaTheme {
  return useAppTheme().theme
}

export function useThemeMode(): AppThemeContextValue {
  return useAppTheme()
}
