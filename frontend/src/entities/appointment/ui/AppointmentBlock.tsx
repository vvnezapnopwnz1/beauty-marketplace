import { useMemo } from 'react'
import { Box, Typography, useTheme } from '@mui/material'
import { DashboardAppointment } from '@shared/api/dashboardApi'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import type { DashboardPalette } from '@shared/theme'
import { 
  appointmentStatusVariant, 
  calendarEventLightTextColors, 
  formatAppointmentTimeRangeWithDuration,
  type CalendarEventVariant
} from '@pages/dashboard/lib/calendarGridUtils'

function eventVariantSx(d: DashboardPalette): Record<CalendarEventVariant, object> {
  return {
    confirmed: {
      bgcolor: 'rgba(107,203,119,.15)',
      color: '#8fdf9a',
      borderLeft: '3px solid #6bcb77',
    },
    pending: {
      bgcolor: 'rgba(255,217,61,.12)',
      color: '#ffe566',
      borderLeft: '3px solid #ffd93d',
    },
    booked: {
      bgcolor: 'rgba(216,149,107,.18)',
      color: d.accent,
      borderLeft: `3px solid ${d.accent}`,
    },
    blocked: {
      bgcolor: 'rgba(255,107,107,.1)',
      color: '#ff8a8a',
      borderLeft: '3px solid #ff6b6b',
    },
  }
}

interface AppointmentBlockProps {
  apt: DashboardAppointment
  top: number
  height: number
  leftPct?: number
  widthPct?: number
  staffColor?: string | null
  dragging?: boolean
  onClick?: () => void
  dndRef?: (element: HTMLElement | null) => void
}

export function AppointmentBlock({
  apt,
  top,
  height,
  leftPct = 0,
  widthPct = 100,
  staffColor,
  dragging,
  onClick,
  dndRef
}: AppointmentBlockProps) {
  const theme = useTheme()
  const d = useDashboardPalette()
  const VARIANT_SX = useMemo(() => eventVariantSx(d), [d])
  const v = appointmentStatusVariant(apt.status)
  const lightLabels = theme.palette.mode === 'light' ? calendarEventLightTextColors(v, d) : null
  
  const variantSx = { ...VARIANT_SX[v] } as Record<string, any>
  if (staffColor) variantSx['borderLeft'] = `3px solid ${staffColor}`

  return (
    <Box
      ref={dndRef}
      data-appt-block
      onClick={(e) => {
        e.stopPropagation()
        onClick?.()
      }}
      sx={{
        position: 'absolute',
        top,
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        height,
        boxSizing: 'border-box',
        px: 0.5,
        py: 0.3,
        borderRadius: '4px',
        cursor: 'pointer',
        overflow: 'hidden',
        zIndex: dragging ? 10 : 3,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        opacity: dragging ? 0.45 : 1,
        outline: dragging ? `2px dashed ${d.accent}` : undefined,
        ...variantSx,
        '&:hover': { filter: 'brightness(1.08)', zIndex: 4 },
      }}
      title={`${apt.serviceName} · ${apt.clientLabel}`}
    >
      <Typography
        sx={{
          fontSize: 9,
          fontWeight: 700,
          lineHeight: 1.2,
          color: lightLabels ? lightLabels.service : 'inherit',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {apt.serviceName}
      </Typography>
      <Typography
        sx={{
          fontSize: 9,
          lineHeight: 1.15,
          color: lightLabels ? lightLabels.guest : 'inherit',
          opacity: lightLabels ? 1 : 0.9,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {apt.clientLabel}
      </Typography>
      {height > 40 && (
        <Typography
          sx={{
            fontSize: 8,
            color: d.mutedDark,
            mt: 0.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {formatAppointmentTimeRangeWithDuration(apt)}
        </Typography>
      )}
    </Box>
  )
}
