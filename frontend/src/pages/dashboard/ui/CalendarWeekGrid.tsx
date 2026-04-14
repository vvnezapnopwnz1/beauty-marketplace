import { useEffect, useState } from 'react'
import { Box, Typography } from '@mui/material'
import type { DashboardAppointment } from '@shared/api/dashboardApi'
import { mocha } from '@pages/dashboard/theme/mocha'
import {
  appointmentStatusVariant,
  aptOverlapsLocalDay,
  CALENDAR_HOUR_HEIGHT_PX,
  CALENDAR_HOUR_START,
  CALENDAR_PX_PER_MINUTE,
  calendarTimelineTotalHeightPx,
  formatAppointmentTimeRangeWithDuration,
  hourRange,
  layoutTimelineEventsForDay,
  nowLineTopPx,
  snapClickYToQuarterHour,
  toLocalYMD,
  type CalendarEventVariant,
} from '../lib/calendarGridUtils'

const VARIANT_SX: Record<CalendarEventVariant, object> = {
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
    color: mocha.accent,
    borderLeft: `3px solid ${mocha.accent}`,
  },
  blocked: {
    bgcolor: 'rgba(255,107,107,.1)',
    color: '#ff8a8a',
    borderLeft: '3px solid #ff6b6b',
  },
}

function NowLine({ day }: { day: Date }) {
  const [top, setTop] = useState<number | null>(() => nowLineTopPx(day, CALENDAR_PX_PER_MINUTE))
  useEffect(() => {
    const update = () => setTop(nowLineTopPx(day, CALENDAR_PX_PER_MINUTE))
    const id = window.setInterval(update, 60000)
    return () => window.clearInterval(id)
  }, [day])
  if (top === null) return null
  return (
    <Box
      sx={{
        position: 'absolute',
        left: 0,
        right: 0,
        top,
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: -3,
          top: -4,
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: mocha.red,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          left: 6,
          right: 0,
          top: -1,
          height: 2,
          bgcolor: mocha.red,
        }}
      />
    </Box>
  )
}

function TimelineEventBlock({
  apt,
  top,
  height,
  leftPct,
  widthPct,
  onClick,
}: {
  apt: DashboardAppointment
  top: number
  height: number
  leftPct: number
  widthPct: number
  onClick: () => void
}) {
  const v = appointmentStatusVariant(apt.status)
  return (
    <Box
      data-appt-block
      onClick={e => {
        e.stopPropagation()
        onClick()
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
        zIndex: 3,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        ...VARIANT_SX[v],
        '&:hover': { filter: 'brightness(1.08)', zIndex: 4 },
      }}
      title={`${apt.serviceName} · ${apt.clientLabel}`}
    >
      <Typography
        sx={{
          fontSize: 9,
          fontWeight: 700,
          lineHeight: 1.2,
          color: 'inherit',
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
          color: 'inherit',
          opacity: 0.9,
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
            color: mocha.muted,
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

type Props = {
  weekDays: Date[]
  items: DashboardAppointment[]
  timeColWidth: number
  onEventClick: (a: DashboardAppointment) => void
  onEmptyClick: (day: Date, slotStart: Date) => void
  onDayHeaderClick?: (day: Date) => void
}

export function CalendarWeekGrid({
  weekDays,
  items,
  timeColWidth,
  onEventClick,
  onEmptyClick,
  onDayHeaderClick,
}: Props) {
  const hours = hourRange()
  const timelineH = calendarTimelineTotalHeightPx()
  const template = `${timeColWidth}px repeat(${weekDays.length}, minmax(96px, 1fr))`

  const today = new Date()

  return (
    <Box sx={{ overflowX: 'auto', borderRadius: 1, border: `1px solid ${mocha.grid}` }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: template,
          gridTemplateRows: `auto ${timelineH}px`,
          gap: '1px',
          bgcolor: mocha.grid,
          minWidth: { xs: 640, sm: 720 },
        }}
      >
        <Box sx={{ bgcolor: mocha.gridHeader, p: 1, minHeight: 44 }} />
        {weekDays.map(d => {
          const isToday =
            d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth() &&
            d.getDate() === today.getDate()
          return (
            <Box
              key={toLocalYMD(d)}
              onClick={() => onDayHeaderClick?.(d)}
              sx={{
                bgcolor: isToday ? `${mocha.accent}18` : mocha.gridHeader,
                p: 1,
                textAlign: 'center',
                cursor: onDayHeaderClick ? 'pointer' : 'default',
                transition: 'background 0.15s',
                '&:hover': onDayHeaderClick ? { bgcolor: isToday ? `${mocha.accent}28` : mocha.controlHover } : {},
              }}
            >
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: isToday ? mocha.accent : mocha.text,
                  lineHeight: 1.2,
                }}
              >
                {d.toLocaleDateString('ru-RU', { weekday: 'short' }).toUpperCase()}
              </Typography>
              <Typography
                sx={{
                  fontSize: isToday ? 13 : 11,
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? mocha.accent : mocha.muted,
                  lineHeight: 1.2,
                }}
              >
                {d.getDate()}
              </Typography>
            </Box>
          )
        })}

        <Box
          sx={{
            bgcolor: mocha.timeColumn,
            position: 'relative',
            height: timelineH,
          }}
        >
          {hours.map(h => (
            <Box
              key={h}
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: (h - CALENDAR_HOUR_START) * CALENDAR_HOUR_HEIGHT_PX,
                height: CALENDAR_HOUR_HEIGHT_PX,
                pl: 0.5,
                pr: 0.25,
                fontSize: 10,
                color: mocha.muted,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                pt: 0.25,
                pointerEvents: 'none',
              }}
            >
              {String(h).padStart(2, '0')}:00
            </Box>
          ))}
        </Box>

        {weekDays.map(day => {
          const ymd = toLocalYMD(day)
          const dayItems = items.filter(a => aptOverlapsLocalDay(a, day))
          const layouts = layoutTimelineEventsForDay(dayItems, day, CALENDAR_PX_PER_MINUTE)
          return (
            <Box
              key={ymd}
              sx={{
                bgcolor: mocha.cell,
                position: 'relative',
                height: timelineH,
                cursor: 'pointer',
              }}
              onClick={e => {
                if ((e.target as HTMLElement).closest('[data-appt-block]')) return
                const rect = e.currentTarget.getBoundingClientRect()
                const y = e.clientY - rect.top
                const slot = snapClickYToQuarterHour(day, y, timelineH)
                onEmptyClick(day, slot)
              }}
            >
              {hours.map(h => (
                <Box
                  key={h}
                  sx={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: (h - CALENDAR_HOUR_START) * CALENDAR_HOUR_HEIGHT_PX,
                    height: CALENDAR_HOUR_HEIGHT_PX,
                    borderTop: `1px solid ${mocha.grid}`,
                    pointerEvents: 'none',
                  }}
                />
              ))}
              {layouts.map(l => (
                <TimelineEventBlock
                  key={`${ymd}-${l.apt.id}`}
                  apt={l.apt}
                  top={l.top}
                  height={l.height}
                  leftPct={l.leftPct}
                  widthPct={l.widthPct}
                  onClick={() => onEventClick(l.apt)}
                />
              ))}
              <NowLine day={day} />
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
