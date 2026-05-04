import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { Alert, Box, Snackbar, Typography } from '@mui/material'
import { DragDropProvider, useDraggable, useDroppable } from '@dnd-kit/react'
import type { DashboardAppointment } from '@entities/appointment'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'

import { AppointmentBlock } from '@entities/appointment/ui/AppointmentBlock'
import { useReschedule } from '@features/appointment/reschedule-appointment/model/useReschedule'
import { RescheduleDragOverlay } from '@features/appointment/reschedule-appointment/ui/RescheduleDragOverlay'

import {
  breakBlockLayout,
  CALENDAR_DAY_COMBINED_COLUMN,
  CALENDAR_HOUR_END,
  CALENDAR_HOUR_HEIGHT_PX,
  CALENDAR_HOUR_START,
  CALENDAR_PX_PER_MINUTE,
  CALENDAR_UNASSIGNED_STAFF_KEY,
  calendarTimelineTotalHeightPx,
  filterAppointmentsForStaffColumn,
  hourRange,
  layoutTimelineEventsForDay,
  nowLineTopPx,
  snapClickYToQuarterHour,
  toLocalYMD,
  type StaffScheduleInfo,
} from '../lib/calendarGridUtils'
import {
  canDragAppointmentStatus,
  dragIdForAppointment,
  dropIdStaffColumn,
} from '../lib/dndCalendarUtils'
import { DropPreviewState } from '@features/appointment/reschedule-appointment/model/types'
import { SxProps, Theme } from '@mui/material'

export type StaffColumn = { id: string; label: string; color?: string | null }
type AppointmentMoveUpdate = {
  id: string
  startsAt: string
  endsAt: string
  salonMasterId?: string
  clearSalonMasterId?: boolean
}

type Props = {
  day: Date
  staffColumns: StaffColumn[]
  items: DashboardAppointment[]
  timeColWidth: number
  onEventClick: (a: DashboardAppointment) => void
  onEmptyClick: (staffId: string | null, slotStart: Date) => void
  staffSchedules?: Map<string, StaffScheduleInfo>
  slotDurationMinutes?: number
  onAppointmentMoved?: (update: AppointmentMoveUpdate) => Promise<void>
}

const HATCH_OVERLAY = `repeating-linear-gradient(
  45deg,
  transparent,
  transparent 4px,
  rgba(42,42,50,.15) 4px,
  rgba(42,42,50,.15) 5px
)`

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(w => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
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
      <Box sx={{ position: 'absolute', left: 6, right: 0, top: -1, height: 2, bgcolor: d.red }} />
    </Box>
  )
}

function DraggableDayAppointment({
  apt,
  top,
  height,
  leftPct,
  widthPct,
  staffColor,
  columnId,
  onEventClick,
}: {
  apt: DashboardAppointment
  top: number
  height: number
  leftPct: number
  widthPct: number
  staffColor?: string | null
  columnId: string
  onEventClick: (a: DashboardAppointment) => void
}) {
  const { ref, isDragging } = useDraggable({
    id: dragIdForAppointment(apt.id),
    disabled: !canDragAppointmentStatus(apt.status),
    data: { sourceColumnId: columnId, apt },
  })

  return (
    <AppointmentBlock
      apt={apt}
      top={top}
      height={height}
      leftPct={leftPct}
      widthPct={widthPct}
      staffColor={staffColor}
      dragging={isDragging}
      dndRef={el => ref(el as HTMLDivElement)}
      onClick={() => onEventClick(apt)}
    />
  )
}

function DayStaffDroppableColumn({
  dropId,
  columnId,
  disabled,
  highlight,
  dropPreview,
  sx,
  onClick,
  children,
}: {
  dropId: string
  columnId: string
  disabled?: boolean
  highlight: boolean
  dropPreview: DropPreviewState | null
  sx: SxProps<Theme>
  onClick: (e: MouseEvent<HTMLDivElement>) => void
  children: ReactNode
}) {
  const d = useDashboardPalette()
  const { ref } = useDroppable({ id: dropId, disabled })
  const preview = dropPreview?.columnId === columnId ? dropPreview : null
  return (
    <Box
      ref={el => ref(el as HTMLDivElement)}
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
          {!preview.isValid && (
            <Typography sx={{ fontSize: 12, color: 'error.main' }}>⊘</Typography>
          )}
        </Box>
      )}
    </Box>
  )
}

export function CalendarDayStaffGrid({
  day,
  staffColumns,
  items,
  timeColWidth,
  onEventClick,
  onEmptyClick,
  staffSchedules,
  slotDurationMinutes = 15,
  onAppointmentMoved,
}: Props) {
  const d = useDashboardPalette()
  const ymd = toLocalYMD(day)
  const timelineH = calendarTimelineTotalHeightPx()
  const hours = hourRange()
  const template = `${timeColWidth}px repeat(${staffColumns.length}, minmax(160px, 1fr))`
  const gridStartMins = CALENDAR_HOUR_START * 60
  const gridEndMins = (CALENDAR_HOUR_END + 1) * 60

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
    day,
    onAppointmentMoved,
    slotDurationMinutes,
    pxPerMinute: CALENDAR_PX_PER_MINUTE,
    hourStart: CALENDAR_HOUR_START,
    staffSchedules,
    viewMode: 'day',
  })

  const grid = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: template,
        gridTemplateRows: `auto ${timelineH}px`,
        gap: '1px',
        bgcolor: d.grid,
        minWidth: { xs: Math.max(520, 140 + staffColumns.length * 160), sm: 760 },
      }}
    >
      {/* Time column header */}
      <Box
        sx={{
          bgcolor: d.gridHeader,
          p: 1,
          minHeight: 44,
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      />

      {/* Staff column headers */}
      {staffColumns.map(c => {
        const isSpecial =
          c.id === CALENDAR_DAY_COMBINED_COLUMN || c.id === CALENDAR_UNASSIGNED_STAFF_KEY
        const avatarColor = c.color && !isSpecial ? c.color : d.mutedDark
        const avatarBg = c.color && !isSpecial ? hexToRgba(c.color, 0.2) : 'rgba(184,168,150,0.12)'
        return (
          <Box
            key={c.id}
            sx={{
              bgcolor: d.gridHeader,
              p: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              minHeight: 44,
              position: 'sticky',
              top: 0,
              zIndex: 20,
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
                color: d.text,
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
      <Box sx={{ bgcolor: d.timeColumn, position: 'relative', height: timelineH, flexShrink: 0 }}>
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

        const beforeWorkH =
          schedule && !schedule.isOff && schedule.opensMins > gridStartMins
            ? Math.min((schedule.opensMins - gridStartMins) * CALENDAR_PX_PER_MINUTE, timelineH)
            : 0
        const afterWorkTop =
          schedule && !schedule.isOff && schedule.closesMins < gridEndMins
            ? (schedule.closesMins - gridStartMins) * CALENDAR_PX_PER_MINUTE
            : null
        const afterWorkH = afterWorkTop !== null ? timelineH - afterWorkTop : 0

        const brk =
          schedule && !schedule.isOff
            ? breakBlockLayout(schedule.breakStartsAt, schedule.breakEndsAt, CALENDAR_PX_PER_MINUTE)
            : null
        const dropId = dropIdStaffColumn(col.id, ymd)
        const droppableDisabled =
          !(col.id === CALENDAR_DAY_COMBINED_COLUMN || col.id === CALENDAR_UNASSIGNED_STAFF_KEY) &&
          schedule?.isOff

        return (
          <DayStaffDroppableColumn
            key={`${col.id}-${ymd}`}
            dropId={dropId}
            columnId={col.id}
            disabled={droppableDisabled}
            highlight={dropHighlightId === dropId}
            dropPreview={dropPreview}
            sx={{
              bgcolor: schedule?.isOff ? d.cellAlt : d.cell,
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
            {schedule?.isOff && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  background: HATCH_OVERLAY,
                  zIndex: 1,
                  pointerEvents: 'none',
                }}
              />
            )}
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
            {brk && (
              <Box
                sx={{
                  position: 'absolute',
                  top: brk.top,
                  left: 0,
                  right: 0,
                  height: brk.height,
                  background: `repeating-linear-gradient(45deg, rgba(42,42,50,.2), rgba(42,42,50,.2) 3px, transparent 3px, transparent 6px)`,
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <Typography sx={{ fontSize: 10, color: d.mutedDark }}>☕ Перерыв</Typography>
              </Box>
            )}
            {layouts.map(l => (
              <DraggableDayAppointment
                key={`${ymd}-${l.apt.id}`}
                apt={l.apt}
                top={l.top}
                height={l.height}
                leftPct={l.leftPct}
                widthPct={l.widthPct}
                staffColor={col.color}
                columnId={col.id}
                onEventClick={onEventClick}
              />
            ))}
            <NowLine day={day} />
          </DayStaffDroppableColumn>
        )
      })}
    </Box>
  )

  return (
    <Box
      sx={{
        borderRadius: 1,
        border: `1px solid ${d.grid}`,
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <DragDropProvider
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            overflow: 'auto',
          }}
        >
          {grid}
        </Box>
        <RescheduleDragOverlay activeDragApt={activeDragApt} pxPerMinute={CALENDAR_PX_PER_MINUTE} />
      </DragDropProvider>
      <Snackbar
        open={snackMsg.open}
        autoHideDuration={3500}
        onClose={() => setSnackMsg(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackMsg.severity}
          onClose={() => setSnackMsg(s => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {snackMsg.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
