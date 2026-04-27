import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Alert, Box, Snackbar, Typography } from '@mui/material'
import { DragDropProvider, useDraggable, useDroppable } from '@dnd-kit/react'
import type { DragEndEvent, DragMoveEvent } from '@dnd-kit/dom'
import type { DashboardAppointment } from '@entities/appointment'
import { useDashboardPalette } from '@pages/dashboard/theme/useDashboardPalette'

import { AppointmentBlock } from '@entities/appointment/ui/AppointmentBlock'
import { useReschedule } from '@features/appointment/reschedule-appointment/model/useReschedule'
import { RescheduleDragOverlay } from '@features/appointment/reschedule-appointment/ui/RescheduleDragOverlay'

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
  parseWeekDropId,
  parseWeekCellDragId,
} from '../lib/dndCalendarUtils'
import { SxProps, Theme } from '@mui/material'
import { DropPreviewState } from '@features/appointment/reschedule-appointment/model/types'

type AppointmentMoveUpdate = {
  id: string
  startsAt: string
  endsAt: string
  salonMasterId?: string
  clearSalonMasterId?: boolean
}

type Props = {
  weekDays: Date[]
  items: DashboardAppointment[]
  timeColWidth: number
  onEventClick: (a: DashboardAppointment) => void
  onEmptyClick: (day: Date, slotStart: Date) => void
  onDayHeaderClick?: (day: Date) => void
  slotDurationMinutes?: number
  onAppointmentMoved?: (p: AppointmentMoveUpdate) => Promise<void>
  onWeekNavigateByDrag?: (direction: 'prev' | 'next') => void
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
      dndRef={el => ref(el as HTMLDivElement)}
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
  dropPreview: DropPreviewState | null
  sx: SxProps<Theme>
  onClick: (e: MouseEvent<HTMLDivElement>) => void
  children: ReactNode
}) {
  const d = useDashboardPalette()
  const { ref } = useDroppable({ id: dropId })
  const preview = dropPreview?.ymd === ymd ? dropPreview : null
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

export function CalendarWeekGrid({
  weekDays,
  items,
  timeColWidth,
  onEventClick,
  onEmptyClick,
  onDayHeaderClick,
  slotDurationMinutes = 15,
  onAppointmentMoved,
  onWeekNavigateByDrag,
}: Props) {
  const d = useDashboardPalette()
  const hours = hourRange()
  const timelineH = calendarTimelineTotalHeightPx()
  const template = `${timeColWidth}px repeat(${weekDays.length}, minmax(150px, 1fr))`
  const today = new Date()
  const visibleWeekYmdSet = useMemo(() => new Set(weekDays.map(day => toLocalYMD(day))), [weekDays])
  const EDGE_GUTTER_PX = 28
  const EDGE_ARROW_SIZE_PX = 22
  const EDGE_ARROW_HIT_RADIUS_PX = 16
  const EDGE_HOLD_MS = 700
  const EDGE_COOLDOWN_MS = 450
  const containerRef = useRef<HTMLDivElement | null>(null)
  const prevArrowRef = useRef<HTMLDivElement | null>(null)
  const nextArrowRef = useRef<HTMLDivElement | null>(null)
  const edgeHoldTimeoutRef = useRef<number | null>(null)
  const edgeCooldownUntilRef = useRef(0)
  const edgeShiftWeeksRef = useRef(0)
  const dragToCardCenterOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const dragCardHalfSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 })
  const [edgeIntent, setEdgeIntent] = useState<'prev' | 'next' | null>(null)
  const [edgeArrowX, setEdgeArrowX] = useState<{ prev: number; next: number } | null>(null)

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

  const clearEdgeHoldTimer = useCallback(() => {
    if (edgeHoldTimeoutRef.current !== null) {
      window.clearTimeout(edgeHoldTimeoutRef.current)
      edgeHoldTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    clearEdgeHoldTimer()
    if (!activeDragApt || !edgeIntent) return
    if (Date.now() < edgeCooldownUntilRef.current) return
    edgeHoldTimeoutRef.current = window.setTimeout(() => {
      onWeekNavigateByDrag?.(edgeIntent)
      edgeShiftWeeksRef.current += edgeIntent === 'next' ? 1 : -1
      edgeCooldownUntilRef.current = Date.now() + EDGE_COOLDOWN_MS
    }, EDGE_HOLD_MS)
    return clearEdgeHoldTimer
  }, [activeDragApt, clearEdgeHoldTimer, edgeIntent, onWeekNavigateByDrag])

  useEffect(() => {
    if (!activeDragApt) return
    const updateArrowX = () => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      setEdgeArrowX({
        prev: rect.left + EDGE_GUTTER_PX / 2,
        next: rect.right - EDGE_GUTTER_PX / 2,
      })
    }
    updateArrowX()
    window.addEventListener('resize', updateArrowX)
    window.addEventListener('scroll', updateArrowX, true)
    return () => {
      window.removeEventListener('resize', updateArrowX)
      window.removeEventListener('scroll', updateArrowX, true)
    }
  }, [activeDragApt])

  const updateEdgeIntentByPointer = useCallback((pointerX: number, pointerY: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) {
      setEdgeIntent(null)
      return
    }

    // Use actual rendered arrow positions to avoid math drift.
    const prevArrowRect = prevArrowRef.current?.getBoundingClientRect() ?? null
    const nextArrowRect = nextArrowRef.current?.getBoundingClientRect() ?? null
    const centerY = prevArrowRect
      ? prevArrowRect.top + prevArrowRect.height / 2
      : window.innerHeight / 2
    const prevCenterX = prevArrowRect
      ? prevArrowRect.left + prevArrowRect.width / 2
      : rect.left + EDGE_GUTTER_PX / 2
    const nextCenterX = nextArrowRect
      ? nextArrowRect.left + nextArrowRect.width / 2
      : rect.right - EDGE_GUTTER_PX / 2
    const hitX = pointerX + dragToCardCenterOffsetRef.current.x
    const hitY = pointerY + dragToCardCenterOffsetRef.current.y
    const prevDistance = Math.hypot(hitX - prevCenterX, hitY - centerY)
    const nextDistance = Math.hypot(hitX - nextCenterX, hitY - centerY)
    const prevHitsByCardBounds =
      Math.abs(hitX - prevCenterX) <= dragCardHalfSizeRef.current.w + EDGE_ARROW_HIT_RADIUS_PX &&
      Math.abs(hitY - centerY) <= dragCardHalfSizeRef.current.h + EDGE_ARROW_HIT_RADIUS_PX
    const nextHitsByCardBounds =
      Math.abs(hitX - nextCenterX) <= dragCardHalfSizeRef.current.w + EDGE_ARROW_HIT_RADIUS_PX &&
      Math.abs(hitY - centerY) <= dragCardHalfSizeRef.current.h + EDGE_ARROW_HIT_RADIUS_PX
    const nextIntent =
      prevHitsByCardBounds || prevDistance <= EDGE_ARROW_HIT_RADIUS_PX
        ? 'prev'
        : nextHitsByCardBounds || nextDistance <= EDGE_ARROW_HIT_RADIUS_PX
          ? 'next'
          : null
    if (nextIntent === 'prev') {
      setEdgeIntent('prev')
      return
    }
    if (nextIntent === 'next') {
      setEdgeIntent('next')
      return
    }
    setEdgeIntent(null)
  }, [EDGE_ARROW_HIT_RADIUS_PX, EDGE_GUTTER_PX])

  const handleDragMoveWithEdge = useCallback(
    (event: DragMoveEvent) => {
      handleDragMove(event)
      if (!activeDragApt) return
      updateEdgeIntentByPointer(
        event.operation.position.current.x,
        event.operation.position.current.y,
      )
    },
    [activeDragApt, handleDragMove, updateEdgeIntentByPointer],
  )

  const handleDragStartWithEdge = useCallback(
    (event: unknown) => {
      const dragEvent = event as DragEndEvent | DragMoveEvent
      const sourceEl = (dragEvent.operation.source as unknown as { element?: Element })?.element
      const pointer = dragEvent.operation.position.current
      if (sourceEl && pointer) {
        const rect = sourceEl.getBoundingClientRect()
        dragToCardCenterOffsetRef.current = {
          x: rect.left + rect.width / 2 - pointer.x,
          y: rect.top + rect.height / 2 - pointer.y,
        }
        dragCardHalfSizeRef.current = { w: rect.width / 2, h: rect.height / 2 }
      } else {
        dragToCardCenterOffsetRef.current = { x: 0, y: 0 }
        dragCardHalfSizeRef.current = { w: 0, h: 0 }
      }
      edgeShiftWeeksRef.current = 0
      clearEdgeHoldTimer()
      setEdgeIntent(null)
      handleDragStart(event as never)
    },
    [clearEdgeHoldTimer, handleDragStart],
  )

  const handleDragEndWithEdge = useCallback(
    async (event: DragEndEvent) => {
      const shiftYmdByDays = (ymd: string, days: number): string | null => {
        const [y, m, d] = ymd.split('-').map(Number)
        if (!y || !m || !d) return null
        const date = new Date(y, m - 1, d, 0, 0, 0, 0)
        if (Number.isNaN(date.getTime())) return null
        date.setDate(date.getDate() + days)
        return toLocalYMD(date)
      }

      clearEdgeHoldTimer()
      const targetId = event.operation.target?.id
      const hasWeekDayTarget = typeof targetId === 'string' && targetId.startsWith('week:')

      if (hasWeekDayTarget && edgeShiftWeeksRef.current !== 0 && typeof targetId === 'string') {
        const rawTargetYmd = parseWeekDropId(targetId)
        if (rawTargetYmd && !visibleWeekYmdSet.has(rawTargetYmd)) {
          const adjustedTargetYmd = shiftYmdByDays(rawTargetYmd, edgeShiftWeeksRef.current * 7)
          if (adjustedTargetYmd && visibleWeekYmdSet.has(adjustedTargetYmd)) {
            const patchedEvent = {
              ...event,
              operation: {
                ...event.operation,
                target: event.operation.target
                  ? { ...event.operation.target, id: dropIdWeekDay(adjustedTargetYmd) }
                  : event.operation.target,
              },
            } as unknown as DragEndEvent
            edgeShiftWeeksRef.current = 0
            setEdgeIntent(null)
            await handleDragEnd(patchedEvent)
            return
          }
        }
      }

      if (!hasWeekDayTarget && edgeIntent && onAppointmentMoved) {
        const source = parseWeekCellDragId(event.operation.source?.id)
        const apt = source ? items.find(x => x.id === source.appointmentId) : null
        if (apt) {
          const weeksShift =
            edgeShiftWeeksRef.current !== 0
              ? edgeShiftWeeksRef.current
              : edgeIntent === 'next'
                ? 1
                : -1
          const deltaMs = weeksShift * 7 * 864e5
          const startsAt = new Date(new Date(apt.startsAt).getTime() + deltaMs).toISOString()
          const endsAt = new Date(new Date(apt.endsAt).getTime() + deltaMs).toISOString()
          await onAppointmentMoved({ id: apt.id, startsAt, endsAt })
          if (edgeShiftWeeksRef.current === 0) onWeekNavigateByDrag?.(edgeIntent)
        }
        edgeShiftWeeksRef.current = 0
        setEdgeIntent(null)
        return
      }

      edgeShiftWeeksRef.current = 0
      dragToCardCenterOffsetRef.current = { x: 0, y: 0 }
      dragCardHalfSizeRef.current = { w: 0, h: 0 }
      setEdgeIntent(null)
      await handleDragEnd(event)
    },
    [
      clearEdgeHoldTimer,
      edgeIntent,
      handleDragEnd,
      items,
      onAppointmentMoved,
      onWeekNavigateByDrag,
      visibleWeekYmdSet,
    ],
  )

  const grid = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: template,
        gridTemplateRows: `auto ${timelineH}px`,
        gap: '1px',
        bgcolor: d.grid,
        minWidth: { xs: 900, sm: 1120 },
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

      <Box sx={{ bgcolor: d.timeColumn, position: 'relative', height: timelineH }}>
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
    <Box
      ref={containerRef}
      sx={{
        borderRadius: 1,
        border: `1px solid ${d.grid}`,
        position: 'relative',
        px: `${EDGE_GUTTER_PX}px`,
      }}
    >
      <DragDropProvider
        sensors={sensors}
        onDragStart={handleDragStartWithEdge}
        onDragMove={handleDragMoveWithEdge}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEndWithEdge}
      >
        {grid}
        <RescheduleDragOverlay
          activeDragApt={activeDragApt}
          pxPerMinute={CALENDAR_PX_PER_MINUTE}
          width={140}
        />
      </DragDropProvider>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: EDGE_GUTTER_PX,
          pointerEvents: 'none',
          bgcolor: d.timeColumn,
          borderRight:
            activeDragApt && edgeIntent === 'prev'
              ? `1px solid ${d.accent}`
              : '1px solid transparent',
          transition: 'background-color 0.12s ease, border-color 0.12s ease',
          zIndex: 25,
        }}
      >
      </Box>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: EDGE_GUTTER_PX,
          pointerEvents: 'none',
          bgcolor: d.timeColumn,
          borderLeft:
            activeDragApt && edgeIntent === 'next'
              ? `1px solid ${d.accent}`
              : '1px solid transparent',
          transition: 'background-color 0.12s ease, border-color 0.12s ease',
          zIndex: 25,
        }}
      >
      </Box>
      {activeDragApt && edgeArrowX && (
        <Box
          ref={prevArrowRef}
          sx={{
            position: 'fixed',
            top: '50vh',
            left: `${edgeArrowX.prev}px`,
            transform: 'translate(-50%, -50%)',
            width: EDGE_ARROW_SIZE_PX,
            height: EDGE_ARROW_SIZE_PX,
            borderRadius: '50%',
            border: `1px solid ${edgeIntent === 'prev' ? d.accent : d.border}`,
            bgcolor: edgeIntent === 'prev' ? `${d.accent}14` : '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1,
            color: edgeIntent === 'prev' ? d.accent : d.mutedDark,
            zIndex: 40,
            pointerEvents: 'none',
          }}
        >
          ←
        </Box>
      )}
      {activeDragApt && edgeArrowX && (
        <Box
          ref={nextArrowRef}
          sx={{
            position: 'fixed',
            top: '50vh',
            left: `${edgeArrowX.next}px`,
            transform: 'translate(-50%, -50%)',
            width: EDGE_ARROW_SIZE_PX,
            height: EDGE_ARROW_SIZE_PX,
            borderRadius: '50%',
            border: `1px solid ${edgeIntent === 'next' ? d.accent : d.border}`,
            bgcolor: edgeIntent === 'next' ? `${d.accent}14` : '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1,
            color: edgeIntent === 'next' ? d.accent : d.mutedDark,
            zIndex: 40,
            pointerEvents: 'none',
          }}
        >
          →
        </Box>
      )}
      {activeDragApt && edgeIntent && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: '50%',
            transform: 'translateX(-50%)',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            fontSize: 11,
            color: d.onAccent,
            bgcolor: d.accent,
            zIndex: 30,
            pointerEvents: 'none',
          }}
        >
          {edgeIntent === 'next' ? 'Листаю на следующую неделю…' : 'Листаю на предыдущую неделю…'}
        </Box>
      )}
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
