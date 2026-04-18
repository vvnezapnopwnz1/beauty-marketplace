import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { Box, Typography, useTheme } from '@mui/material'
import { DragDropProvider, useDraggable, useDroppable } from '@dnd-kit/react'
import type { DragEndEvent, DragOverEvent } from '@dnd-kit/dom'
import type { DashboardAppointment } from '@shared/api/dashboardApi'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'
import type { DashboardPalette } from '@shared/theme'
import {
  appointmentStatusVariant,
  aptOverlapsLocalDay,
  calendarEventLightTextColors,
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
import {
  buildWeekViewReschedule,
  canDragAppointmentStatus,
  dragIdForWeekCell,
  dropIdWeekDay,
  parseWeekCellDragId,
  parseWeekDropId,
} from '../lib/dndCalendarUtils'

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

function NowLine({ day }: { day: Date }) {
  const d = useDashboardPalette()
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
          bgcolor: d.red,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          left: 6,
          right: 0,
          top: -1,
          height: 2,
          bgcolor: d.red,
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
  dndRef,
  dragging,
}: {
  apt: DashboardAppointment
  top: number
  height: number
  leftPct: number
  widthPct: number
  onClick: () => void
  dndRef?: (node: Element | null) => void
  dragging?: boolean
}) {
  const theme = useTheme()
  const d = useDashboardPalette()
  const VARIANT_SX = useMemo(() => eventVariantSx(d), [d])
  const v = appointmentStatusVariant(apt.status)
  const lightLabels = theme.palette.mode === 'light' ? calendarEventLightTextColors(v, d) : null
  const draggable = canDragAppointmentStatus(apt.status)
  return (
    <Box
      ref={dndRef}
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
        cursor: draggable ? 'grab' : 'pointer',
        overflow: 'hidden',
        zIndex: 3,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        opacity: dragging ? 0.45 : 1,
        outline: dragging ? `2px dashed ${d.accent}` : undefined,
        ...VARIANT_SX[v],
        '&:hover': { filter: 'brightness(1.08)', zIndex: 4 },
        '&:active': draggable ? { cursor: 'grabbing' } : {},
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

function DraggableWeekAppointment({
  apt,
  top,
  height,
  leftPct,
  widthPct,
  columnYmd,
  onEventClick,
}: {
  apt: DashboardAppointment
  top: number
  height: number
  leftPct: number
  widthPct: number
  columnYmd: string
  onEventClick: (a: DashboardAppointment) => void
}) {
  const { ref, isDragging } = useDraggable({
    id: dragIdForWeekCell(apt.id, columnYmd),
    disabled: !canDragAppointmentStatus(apt.status),
  })
  return (
    <TimelineEventBlock
      apt={apt}
      top={top}
      height={height}
      leftPct={leftPct}
      widthPct={widthPct}
      dndRef={ref}
      dragging={isDragging}
      onClick={() => onEventClick(apt)}
    />
  )
}

function WeekDroppableDayColumn({
  dropId,
  highlight,
  sx,
  onClick,
  children,
}: {
  dropId: string
  highlight: boolean
  sx: object
  onClick: (e: MouseEvent<HTMLDivElement>) => void
  children: ReactNode
}) {
  const d = useDashboardPalette()
  const { ref } = useDroppable({ id: dropId })
  return (
    <Box
      ref={ref}
      onClick={onClick}
      sx={{
        ...sx,
        ...(highlight ? { boxShadow: `inset 0 0 0 2px ${d.accent}` } : {}),
      }}
    >
      {children}
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
  slotDurationMinutes?: number
  onAppointmentMoved?: (p: { id: string; startsAt: string; endsAt: string }) => void | Promise<void>
}

export function CalendarWeekGrid({
  weekDays,
  items,
  timeColWidth,
  onEventClick,
  onEmptyClick,
  onDayHeaderClick,
  slotDurationMinutes = 15,
  onAppointmentMoved,
}: Props) {
  const d = useDashboardPalette()
  const hours = hourRange()
  const timelineH = calendarTimelineTotalHeightPx()
  const template = `${timeColWidth}px repeat(${weekDays.length}, minmax(96px, 1fr))`
  const [dropHighlightId, setDropHighlightId] = useState<string | null>(null)

  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (event.defaultPrevented) return
    const id = event.operation.target?.id
    setDropHighlightId(id != null ? String(id) : null)
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setDropHighlightId(null)
      if (event.canceled || !onAppointmentMoved) return
      const op = event.operation
      const parsedSource = parseWeekCellDragId(op.source?.id)
      const targetId = op.target?.id
      if (!parsedSource || targetId == null) return
      const { appointmentId: aptId, columnYmd: sourceYmd } = parsedSource
      const targetYmd = parseWeekDropId(targetId)
      if (!targetYmd) return
      const apt = items.find(a => a.id === aptId)
      if (!apt) return
      const deltaY = op.transform?.y ?? 0
      const draft = buildWeekViewReschedule(
        aptId,
        apt,
        deltaY,
        CALENDAR_PX_PER_MINUTE,
        slotDurationMinutes,
        sourceYmd,
        targetYmd,
      )
      if (!draft) return
      await onAppointmentMoved(draft)
    },
    [items, onAppointmentMoved, slotDurationMinutes],
  )

  const today = new Date()

  const grid = (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: template,
          gridTemplateRows: `auto ${timelineH}px`,
          gap: '1px',
          bgcolor: d.grid,
          minWidth: { xs: 640, sm: 720 },
        }}
      >
        <Box sx={{ bgcolor: d.gridHeader, p: 1, minHeight: 44 }} />
        {weekDays.map(day => {
          const isToday =
            day.getFullYear() === today.getFullYear() &&
            day.getMonth() === today.getMonth() &&
            day.getDate() === today.getDate()
          return (
            <Box
              key={toLocalYMD(day)}
              onClick={() => onDayHeaderClick?.(day)}
              sx={{
                bgcolor: isToday ? `${d.accent}18` : d.gridHeader,
                p: 1,
                textAlign: 'center',
                cursor: onDayHeaderClick ? 'pointer' : 'default',
                transition: 'background 0.15s',
                '&:hover': onDayHeaderClick
                  ? { bgcolor: isToday ? `${d.accent}28` : d.controlHover }
                  : {},
              }}
            >
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: isToday ? d.accent : d.text,
                  lineHeight: 1.2,
                }}
              >
                {day.toLocaleDateString('ru-RU', { weekday: 'short' }).toUpperCase()}
              </Typography>
              <Typography
                sx={{
                  fontSize: isToday ? 13 : 11,
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? d.accent : d.mutedDark,
                  lineHeight: 1.2,
                }}
              >
                {day.getDate()}
              </Typography>
            </Box>
          )
        })}

        <Box
          sx={{
            bgcolor: d.timeColumn,
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
                color: d.mutedDark,
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
          const dropId = dropIdWeekDay(ymd)
          return (
            <WeekDroppableDayColumn
              key={ymd}
              dropId={dropId}
              highlight={dropHighlightId === dropId}
              sx={{
                bgcolor: d.cell,
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
                    borderTop: `1px solid ${d.grid}`,
                    pointerEvents: 'none',
                  }}
                />
              ))}
              {layouts.map(l => (
                <DraggableWeekAppointment
                  key={`${ymd}-${l.apt.id}`}
                  apt={l.apt}
                  top={l.top}
                  height={l.height}
                  leftPct={l.leftPct}
                  widthPct={l.widthPct}
                  columnYmd={ymd}
                  onEventClick={onEventClick}
                />
              ))}
              <NowLine day={day} />
            </WeekDroppableDayColumn>
          )
        })}
      </Box>
  )

  return (
    <Box sx={{ overflowX: 'auto', borderRadius: 1, border: `1px solid ${d.grid}` }}>
      <DragDropProvider onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
        {grid}
      </DragDropProvider>
    </Box>
  )
}
