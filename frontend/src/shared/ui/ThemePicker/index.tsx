import { Box, Typography } from '@mui/material'
import { useAppTheme } from '@shared/theme'
import type { ReactNode } from 'react'
import type { VelaTheme } from '@shared/theme'

function ThemeSwatch({ theme, active, onClick }: { theme: VelaTheme; active: boolean; onClick: () => void }) {
  const { theme: t } = useAppTheme()
  return (
    <Box
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        p: '10px 8px',
        borderRadius: '12px',
        border: active ? `2px solid ${t.accent}` : `2px solid transparent`,
        bgcolor: active ? t.accentSoft : 'transparent',
        transition: 'all 0.15s',
        '&:hover': { bgcolor: active ? t.accentSoft : t.hoverOverlay },
        minWidth: 72,
      }}
    >
      {/* Mini preview */}
      <Box sx={{ position: 'relative', width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
        {/* bg quadrant */}
        <Box sx={{ position: 'absolute', inset: 0, bgcolor: theme.bg }} />
        {/* sidebar strip */}
        <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '40%', bgcolor: theme.sidebar }} />
        {/* accent dot */}
        <Box sx={{ position: 'absolute', bottom: 8, right: 8, width: 12, height: 12, borderRadius: '50%', bgcolor: theme.accent }} />
        {/* surface card hint */}
        <Box sx={{ position: 'absolute', top: 8, right: 6, width: 14, height: 10, borderRadius: '3px', bgcolor: theme.card, opacity: 0.9 }} />
        {/* active ring */}
        {active && (
          <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${theme.accent}` }} />
        )}
      </Box>

      <Typography
        sx={{
          fontSize: 11,
          fontWeight: active ? 600 : 400,
          color: active ? t.accent : t.textSub,
          textAlign: 'center',
          lineHeight: 1.3,
          letterSpacing: '-0.1px',
        }}
      >
        {theme.name}
      </Typography>
    </Box>
  )
}

function GroupLabel({ children }: { children: ReactNode }) {
  const { theme: t } = useAppTheme()

  return (
    <Typography
      sx={{
        fontSize: 12,
        fontWeight: 600,
        color: t.textSub,
        mb: 1,
        letterSpacing: '-0.2px',
      }}
    >
      {children}
    </Typography>
  )
}

export function ThemePicker() {
  const { theme: t, themes, themeId, setThemeId } = useAppTheme()

  const light = themes.filter(th => !th.dark)
  const dark = themes.filter(th => th.dark)

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: '16px',
        border: `1px solid ${t.border}`,
        bgcolor: t.surface,
      }}
    >
      <Typography
        sx={{ fontFamily: "'Cormorant', serif", fontSize: 18, fontWeight: 500, color: t.text, mb: 2.5, letterSpacing: '-0.3px' }}
      >
        Тема оформления
      </Typography>

      <GroupLabel>☀ Светлые</GroupLabel>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2.5 }}>
        {light.map(th => (
          <ThemeSwatch key={th.id} theme={th} active={themeId === th.id} onClick={() => setThemeId(th.id)} />
        ))}
      </Box>

      <GroupLabel>☾ Тёмные</GroupLabel>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {dark.map(th => (
          <ThemeSwatch key={th.id} theme={th} active={themeId === th.id} onClick={() => setThemeId(th.id)} />
        ))}
      </Box>
    </Box>
  )
}
