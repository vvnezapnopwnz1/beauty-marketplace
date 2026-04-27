import { Box } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { STATUS_LABELS } from '@entities/appointment'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'

const ON_SOLID = '#FFFFFF'
const ON_WARNING = '#1a1612'

function StatusChip({ status }: { status: string }) {
  const theme = useTheme()
  const d = useDashboardPalette()
  const isDark = theme.palette.mode === 'dark'

  let bg: string
  let color: string

  switch (status) {
    case 'pending':
      bg = isDark ? alpha(d.yellow, 0.92) : d.yellow
      color = isDark ? '#141008' : ON_WARNING
      break
    case 'confirmed':
      bg = d.green
      color = ON_SOLID
      break
    case 'cancelled_by_salon':
      bg = d.red
      color = ON_SOLID
      break
    case 'completed':
    case 'no_show':
      bg = isDark ? alpha(d.text, 0.2) : alpha(d.text, 0.1)
      color = d.text
      break
    default:
      bg = isDark ? alpha(d.text, 0.12) : alpha(d.text, 0.08)
      color = d.muted
  }

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1.5,
        py: 0.45,
        borderRadius: '999px',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.02em',
        bgcolor: bg,
        color,
        whiteSpace: 'nowrap',
        lineHeight: 1.35,
        boxShadow: isDark
          ? `inset 0 1px 0 ${alpha('#fff', 0.12)}`
          : `0 1px 1px ${alpha('#000', 0.08)}`,
        border: `1px solid ${alpha(isDark ? '#fff' : '#000', isDark ? 0.1 : 0.06)}`,
      }}
    >
      {STATUS_LABELS[status] ?? status}
    </Box>
  )
}

export default StatusChip
