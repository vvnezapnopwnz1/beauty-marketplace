import { useEffect, useState } from 'react'
import { Box, Typography } from '@mui/material'
import type { DashboardAppointment } from '@shared/api/dashboardApi'
import { mocha } from '@pages/dashboard/theme/mocha'
import {
  appointmentStatusVariant,
  breakBlockLayout,
  CALENDAR_DAY_COMBINED_COLUMN,
  CALENDAR_HOUR_END,
  CALENDAR_HOUR_HEIGHT_PX,
  CALENDAR_HOUR_START,
  CALENDAR_PX_PER_MINUTE,
  CALENDAR_UNASSIGNED_STAFF_KEY,
  calendarTimelineTotalHeightPx,
  filterAppointmentsForStaffColumn,
  formatAppointmentTimeRangeWithDuration,
  hourRange,
  layoutTimelineEventsForDay,
  nowLineTopPx,
  snapClickYToQuarterHour,
  toLocalYMD,
  type CalendarEventVariant,
  type StaffScheduleInfo,
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

const HATCH_OVERLAY = `repeating-linear-gradient(
  45deg,
  transparent,
  transparent 4px,
  rgba(42,42,50,.15) 4px,
  rgba(42,42,50,.15) 5px
)`

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(w => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
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
  staffColor,
  onClick,
}: {
  apt: DashboardAppointment
  top: number
  height: number
  leftPct: number
  widthPct: number
  staffColor?: string | null
  onClick: () => void
}) {
  const v = appointmentStatusVariant(apt.status)
  const variantSx = { ...VARIANT_SX[v] } as Record<string, unknown>
  if (staffColor) variantSx['borderLeft'] = `3px solid ${staffColor}`

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

export type StaffColumn = { id: string; label: string; color?: string | null }

type Props = {
  day: Date
  staffColumns: StaffColumn[]
  items: DashboardAppointment[]
  timeColWidth: number
  onEventClick: (a: DashboardAppointment) => void
  onEmptyClick: (staffId: string | null, slotStart: Date) => void
  staffSchedules?: Map<string, StaffScheduleInfo>
}

export function CalendarDayStaffGrid({
  day,
  staffColumns,
  items,
  timeColWidth,
  onEventClick,
  onEmptyClick,
  staffSchedules,
}: Props) {
  const ymd = toLocalYMD(day)
  const timelineH = calendarTimelineTotalHeightPx()
  const hours = hourRange()
  const template = `${timeColWidth}px repeat(${staffColumns.length}, minmax(100px, 1fr))`
  const gridStartMins = CALENDAR_HOUR_START * 60
  const gridEndMins = (CALENDAR_HOUR_END + 1) * 60

  return (
    <Box sx={{ overflowX: 'auto', borderRadius: 1, border: `1px solid ${mocha.grid}` }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: template,
          gridTemplateRows: `auto ${timelineH}px`,
          gap: '1px',
          bgcolor: mocha.grid,
          minWidth: { xs: Math.max(400, 120 + staffColumns.length * 100), sm: 560 },
        }}
      >
        {/* Time column header */}
        <Box sx={{ bgcolor: mocha.gridHeader, p: 1, minHeight: 44 }} />

        {/* Staff column headers with avatars */}
        {staffColumns.map(c => {
          const isSpecial =
            c.id === CALENDAR_DAY_COMBINED_COLUMN || c.id === CALENDAR_UNASSIGNED_STAFF_KEY
          const avatarColor = c.color && !isSpecial ? c.color : mocha.muted
          const avatarBg =
            c.color && !isSpecial ? hexToRgba(c.color, 0.2) : 'rgba(184,168,150,0.12)'
          return (
            <Box
              key={c.id}
              sx={{
                bgcolor: mocha.gridHeader,
                p: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
                minHeight: 44,
              }}
            >
              {!isSpecial && (
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: avatarBg,
                    border: `1.5px solid ${avatarColor}50`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    sx={{ fontSize: 10, fontWeight: 700, color: avatarColor, lineHeight: 1 }}
                  >
                    {getInitials(c.label)}
                  </Typography>
                </Box>
              )}
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: mocha.text,
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {c.label}
              </Typography>
            </Box>
          )
        })}

        {/* Time column body */}
        <Box
          sx={{
            bgcolor: mocha.timeColumn,
            position: 'relative',
            height: timelineH,
            flexShrink: 0,
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

        {/* Staff columns */}
        {staffColumns.map(col => {
          const schedule = staffSchedules?.get(col.id)
          const colItems = filterAppointmentsForStaffColumn(
            items,
            day,
            col.id,
            CALENDAR_DAY_COMBINED_COLUMN,
            CALENDAR_UNASSIGNED_STAFF_KEY,
          )
          const layouts = layoutTimelineEventsForDay(colItems, day, CALENDAR_PX_PER_MINUTE)
          const staffIdForClick =
            col.id === CALENDAR_DAY_COMBINED_COLUMN
              ? null
              : col.id === CALENDAR_UNASSIGNED_STAFF_KEY
                ? null
                : col.id

          // Before-work and after-work shading
          const beforeWorkH =
            schedule && !schedule.isOff && schedule.opensMins > gridStartMins
              ? Math.min((schedule.opensMins - gridStartMins) * CALENDAR_PX_PER_MINUTE, timelineH)
              : 0
          const afterWorkTop =
            schedule && !schedule.isOff && schedule.closesMins < gridEndMins
              ? (schedule.closesMins - gridStartMins) * CALENDAR_PX_PER_MINUTE
              : null
          const afterWorkH = afterWorkTop !== null ? timelineH - afterWorkTop : 0

          // Break block
          const brk =
            schedule && !schedule.isOff
              ? breakBlockLayout(schedule.breakStartsAt, schedule.breakEndsAt, CALENDAR_PX_PER_MINUTE)
              : null

          return (
            <Box
              key={`${col.id}-${ymd}`}
              sx={{
                bgcolor: schedule?.isOff ? mocha.cellAlt : mocha.cell,
                position: 'relative',
                height: timelineH,
                cursor: 'pointer',
              }}
              onClick={e => {
                if ((e.target as HTMLElement).closest('[data-appt-block]')) return
                const rect = e.currentTarget.getBoundingClientRect()
                const y = e.clientY - rect.top
                const slot = snapClickYToQuarterHour(day, y, timelineH)
                onEmptyClick(staffIdForClick, slot)
              }}
            >
              {/* Hour grid lines */}
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

              {/* Day-off full overlay */}
              {schedule?.isOff && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: HATCH_OVERLAY,
                    zIndex: 1,
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* Before-work overlay */}
              {!schedule?.isOff && beforeWorkH > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: beforeWorkH,
                    background: HATCH_OVERLAY,
                    zIndex: 1,
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* After-work overlay */}
              {!schedule?.isOff && afterWorkTop !== null && afterWorkH > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: afterWorkTop,
                    left: 0,
                    right: 0,
                    height: afterWorkH,
                    background: HATCH_OVERLAY,
                    zIndex: 1,
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* Break block */}
              {brk && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: brk.top,
                    left: 0,
                    right: 0,
                    height: brk.height,
                    background: `repeating-linear-gradient(
                      45deg,
                      rgba(42,42,50,.2), rgba(42,42,50,.2) 3px,
                      transparent 3px, transparent 6px
                    )`,
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <Typography sx={{ fontSize: 10, color: mocha.muted }}>☕ Перерыв</Typography>
                </Box>
              )}

              {/* Event blocks */}
              {layouts.map(l => (
                <TimelineEventBlock
                  key={`${ymd}-${l.apt.id}`}
                  apt={l.apt}
                  top={l.top}
                  height={l.height}
                  leftPct={l.leftPct}
                  widthPct={l.widthPct}
                  staffColor={col.color}
                  onClick={() => onEventClick(l.apt)}
                />
              ))}

              {/* Now line */}
              <NowLine day={day} />
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
