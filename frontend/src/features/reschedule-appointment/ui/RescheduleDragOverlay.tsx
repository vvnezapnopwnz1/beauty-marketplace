import { DragOverlay } from '@dnd-kit/react'
import { Box, Typography } from '@mui/material'
import { DashboardAppointment } from '@shared/api/dashboardApi'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import { formatAppointmentTimeRangeRu } from '@pages/dashboard/lib/calendarGridUtils'
import { appointmentDurationMinutes } from '@pages/dashboard/lib/dndCalendarUtils'

interface RescheduleDragOverlayProps {
  activeDragApt: DashboardAppointment | null
  pxPerMinute: number
  width?: number
}

export function RescheduleDragOverlay({ activeDragApt, pxPerMinute, width = 180 }: RescheduleDragOverlayProps) {
  const d = useDashboardPalette()
  
  if (!activeDragApt) return null

  const ghostHeight = appointmentDurationMinutes(activeDragApt.startsAt, activeDragApt.endsAt) * pxPerMinute

  return (
    <DragOverlay dropAnimation={null}>
      <Box
        sx={{
          width,
          height: ghostHeight,
          bgcolor: `rgba(200,133,90,0.28)`,
          border: `2px dashed ${d.accent}`,
          borderRadius: '8px',
          opacity: 0.78,
          boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
          pointerEvents: 'none',
          zIndex: 1000,
          p: 0.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.2,
          overflow: 'hidden',
          animation: 'dndGhostIn 150ms ease-out forwards',
          '@keyframes dndGhostIn': {
            from: { opacity: 0, transform: 'scale(1.0)' },
            to: { opacity: 0.78, transform: 'scale(1.02)' },
          },
        }}
      >
        <Typography variant="caption" noWrap fontWeight={700} sx={{ fontSize: 9 }}>
          {activeDragApt.serviceName}
        </Typography>
        <Typography variant="caption" noWrap sx={{ fontSize: 9 }}>
          {activeDragApt.clientLabel}
        </Typography>
        <Typography variant="caption" noWrap sx={{ fontSize: 8, color: d.muted }}>
          {formatAppointmentTimeRangeRu(activeDragApt)} ·{' '}
          {appointmentDurationMinutes(activeDragApt.startsAt, activeDragApt.endsAt)} мин
        </Typography>
      </Box>
    </DragOverlay>
  )
}
