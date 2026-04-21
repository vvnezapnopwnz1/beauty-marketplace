import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { Alert, Box, Snackbar, Typography } from '@mui/material'
import { DragDropProvider, useDraggable, useDroppable } from '@dnd-kit/react'
import type { DashboardAppointment } from '@shared/api/dashboardApi'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'

import { AppointmentBlock } from '@entities/appointment/ui/AppointmentBlock'
import { useReschedule } from '@features/reschedule-appointment/model/useReschedule'
import { RescheduleDragOverlay } from '@features/reschedule-appointment/ui/RescheduleDragOverlay'

import {
  aptOverlapsLocalDay,
  CALENDAR_HOUR_HEIGHT_PX,
  CALENDAR_HOUR_START,
  CALENDAR_PX_PER_MINUTE,
  calendarTimelineTotalHeightPx,
  hourRange,
  layoutTimelineEventsForDay,
  nowLineTopPx,
  snapClickYToQuarterHour,
  toLocalYMD,
} from '../lib/calendarGridUtils'
import {
  canDragAppointmentStatus,
  dragIdForWeekCell,
  dropIdWeekDay,
} from '../lib/dndCalendarUtils'

type Props = {
  weekDays: Date[]
  items: DashboardAppointment[]
  timeColWidth: number
  onEventClick: (a: DashboardAppointment) => void
  onEmptyClick: (day: Date, slotStart: Date) => void
  onDayHeaderClick?: (day: Date) => void
  slotDurationMinutes?: number
  onAppointmentMoved?: (p: any) => Promise<void>
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
    <Box sx={{ position: 'absolute', left: 0, right: 0, top, zIndex: 10, pointerEvents: 'none' }}>
      <Box sx={{ position: 'absolute', left: -3, top: -4, width: 8, height: 8, borderRadius: '50%', bgcolor: d.red }} />
      <Box sx={{ position: 'absolute', left: 6, right: 0, top: -1, height: 2, bgcolor: d.red }} />
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
    data: { apt },
  })

  return (
    <AppointmentBlock
      apt={apt}
      top={top}
      height={height}
      leftPct={leftPct}
      widthPct={widthPct}
      dragging={isDragging}
      dndRef={(el) => ref(el as any)}
      onClick={() => onEventClick(apt)}
    />
  )
}

function WeekDroppableDayColumn({
  dropId,
  ymd,
  highlight,
  dropPreview,
  sx,
  onClick,
  children,
}: {
  dropId: string
  ymd: string
  highlight: boolean
  dropPreview: any
  sx: object
  onClick: (e: MouseEvent<HTMLDivElement>) => void
  children: ReactNode
}) {
  const d = useDashboardPalette()
  const { ref } = useDroppable({ id: dropId })
  const preview = dropPreview?.ymd === ymd ? dropPreview : null
  return (
    <Box
      ref={(el) => ref(el as any)}
      onClick={onClick}
      sx={{
        ...sx,
        ...(highlight ? { boxShadow: `inset 0 0 0 2px ${d.accent}` } : {}),
      }}
    >
      {children}
      {preview && (
        <Box
          sx={{
            position: 'absolute',
            top: preview.topPx,
            left: 0,
            right: 0,
            height: preview.heightPx,
            bgcolor: preview.isValid ? `${d.accent}1e` : `${d.red}1a`,
            border: `1px dashed ${preview.isValid ? d.accent : d.red}`,
            borderRadius: '4px',
            zIndex: 5,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'top 80ms ease-out',
          }}
        >
          {!preview.isValid && <Typography sx={{ fontSize: 12, color: 'error.main' }}>⊘</Typography>}
        </Box>
      )}
    </Box>
  )
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
  const today = new Date()

  const {
    activeDragApt,
    dropHighlightId,
    dropPreview,
    sensors,
    snackMsg,
    setSnackMsg,
    handleDragStart,
    handleDragMove,
    handleDragOver,
    handleDragEnd,
  } = useReschedule({
    items,
    day: today, // dummy for week
    onAppointmentMoved,
    slotDurationMinutes,
    pxPerMinute: CALENDAR_PX_PER_MINUTE,
    hourStart: CALENDAR_HOUR_START,
    viewMode: 'week',
  })

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
        const isToday = day.getFullYear() === today.getFullYear() && day.getMonth() === today.getMonth() && day.getDate() === today.getDate()
        return (
          <Box key={toLocalYMD(day)} onClick={() => onDayHeaderClick?.(day)} sx={{ bgcolor: isToday ? `${d.accent}18` : d.gridHeader, p: 1, textAlign: 'center', cursor: onDayHeaderClick ? 'pointer' : 'default', transition: 'background 0.15s', '&:hover': onDayHeaderClick ? { bgcolor: isToday ? `${d.accent}28` : d.controlHover } : {} }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: isToday ? d.accent : d.text, lineHeight: 1.2 }}>{day.toLocaleDateString('ru-RU', { weekday: 'short' }).toUpperCase()}</Typography>
            <Typography sx={{ fontSize: isToday ? 13 : 11, fontWeight: isToday ? 700 : 400, color: isToday ? d.accent : d.mutedDark, lineHeight: 1.2 }}>{day.getDate()}</Typography>
          </Box>
        )
      })}

      <Box sx={{ bgcolor: d.timeColumn, position: 'relative', height: timelineH }}>
        {hours.map(h => (
          <Box key={h} sx={{ position: 'absolute', left: 0, right: 0, top: (h - CALENDAR_HOUR_START) * CALENDAR_HOUR_HEIGHT_PX, height: CALENDAR_HOUR_HEIGHT_PX, pl: 0.5, pr: 0.25, fontSize: 10, color: d.mutedDark, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', pt: 0.25, pointerEvents: 'none' }}>
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
            ymd={ymd}
            highlight={dropHighlightId === dropId}
            dropPreview={dropPreview}
            sx={{ bgcolor: d.cell, position: 'relative', height: timelineH, cursor: 'pointer' }}
            onClick={e => {
              if ((e.target as HTMLElement).closest('[data-appt-block]')) return
              const rect = e.currentTarget.getBoundingClientRect()
              const y = e.clientY - rect.top
              const slot = snapClickYToQuarterHour(day, y, timelineH)
              onEmptyClick(day, slot)
            }}
          >
            {hours.map(h => (
              <Box key={h} sx={{ position: 'absolute', left: 0, right: 0, top: (h - CALENDAR_HOUR_START) * CALENDAR_HOUR_HEIGHT_PX, height: CALENDAR_HOUR_HEIGHT_PX, borderTop: `1px solid ${d.grid}`, pointerEvents: 'none' }} />
            ))}
            {layouts.map(l => (
              <DraggableWeekAppointment key={`${ymd}-${l.apt.id}`} apt={l.apt} top={l.top} height={l.height} leftPct={l.leftPct} widthPct={l.widthPct} columnYmd={ymd} onEventClick={onEventClick} />
            ))}
            <NowLine day={day} />
          </WeekDroppableDayColumn>
        )
      })}
    </Box>
  )

  return (
    <Box sx={{ overflowX: 'auto', borderRadius: 1, border: `1px solid ${d.grid}` }}>
      <DragDropProvider sensors={sensors} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        {grid}
        <RescheduleDragOverlay activeDragApt={activeDragApt} pxPerMinute={CALENDAR_PX_PER_MINUTE} width={140} />
      </DragDropProvider>
      <Snackbar open={snackMsg.open} autoHideDuration={3500} onClose={() => setSnackMsg(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackMsg.severity} onClose={() => setSnackMsg(s => ({ ...s, open: false }))} sx={{ width: '100%' }}>{snackMsg.message}</Alert>
      </Snackbar>
    </Box>
  )
}
