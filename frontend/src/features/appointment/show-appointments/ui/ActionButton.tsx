import { Button } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'

const ON_SOLID = '#FFFFFF'

export default function ActionBtn({
  label,
  color,
  bg: _bg,
  disabled,
  onClick,
}: {
  label: string
  /** Основной цвет заливки (напр. `d.green` / `d.red`) */
  color: string
  /** Оставлен для совместимости с вызовами из колонок; заливка = `color` */
  bg: string
  disabled?: boolean
  onClick?: () => void
}) {
  const theme = useTheme()
  const d = useDashboardPalette()
  const isDark = theme.palette.mode === 'dark'

  return (
    <Button
      variant="contained"
      size="small"
      disableElevation
      disabled={disabled}
      onClick={onClick}
      sx={{
        minWidth: 0,
        px: 1.5,
        py: 0.45,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.02em',
        lineHeight: 1.35,
        textTransform: 'none',
        borderRadius: '999px',
        color: ON_SOLID,
        bgcolor: color,
        border: `1px solid ${alpha(color, 0.35)}`,
        boxShadow: isDark
          ? `inset 0 1px 0 ${alpha('#fff', 0.14)}`
          : `0 1px 2px ${alpha('#000', 0.12)}`,
        transition: theme.transitions.create(['background-color', 'filter', 'box-shadow', 'opacity'], {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': {
          bgcolor: color,
          filter: 'brightness(1.12)',
          boxShadow: isDark
            ? `inset 0 1px 0 ${alpha('#fff', 0.18)}`
            : `0 2px 6px ${alpha(color, 0.35)}`,
        },
        '&:focus-visible': {
          outline: `2px solid ${alpha('#fff', 0.85)}`,
          outlineOffset: 2,
        },
        '&.Mui-disabled': {
          opacity: 1,
          color: d.muted,
          bgcolor: isDark ? alpha(d.text, 0.12) : d.control,
          borderColor: isDark ? alpha(d.text, 0.1) : d.borderLight,
          filter: 'none',
          boxShadow: 'none',
        },
      }}
    >
      {label}
    </Button>
  )
}
