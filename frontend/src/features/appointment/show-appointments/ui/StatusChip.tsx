import { Box } from '@mui/material'
import { V } from '@shared/theme/palettes'
import { STATUS_COLORS } from '@entities/appointment'
import { STATUS_LABELS } from '@entities/appointment'

function StatusChip({ status }: { status: string }) {
  const sc = STATUS_COLORS[status] ?? { color: V.textMuted, bg: 'rgba(160,120,144,0.09)' }
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        px: 1.25,
        py: 0.35,
        borderRadius: '20px',
        fontSize: 11,
        fontWeight: 600,
        bgcolor: sc.bg,
        color: sc.color,
        whiteSpace: 'nowrap',
        lineHeight: 1.5,
      }}
    >
      {STATUS_LABELS[status] ?? status}
    </Box>
  )
}
export default StatusChip
