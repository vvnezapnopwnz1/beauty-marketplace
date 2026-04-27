import { useCallback, useMemo, useState } from 'react'
import { DragEndEvent, DragMoveEvent, DragOverEvent, DragStartEvent, KeyboardSensor, PointerActivationConstraints, PointerSensor } from '@dnd-kit/dom'
import { DashboardAppointment } from '@shared/api/dashboardApi'
import { 
  appointmentDurationMinutes, 
  buildDayViewRescheduleFromPointer, 
  buildDayViewReschedule,
  buildWeekViewRescheduleFromPointer,
  buildWeekViewReschedule,
  getDropPreview, 
  parseDragAppointmentId, 
  parseStaffDropId,
  parseWeekCellDragId,
  parseWeekDropId,
} from '@pages/dashboard/lib/dndCalendarUtils'
import { 
  CALENDAR_DAY_COMBINED_COLUMN, 
  CALENDAR_UNASSIGNED_STAFF_KEY, 
  parseHhmmToMins, 
  StaffScheduleInfo,
  toLocalYMD
} from '@pages/dashboard/lib/calendarGridUtils'

interface UseRescheduleProps {
  items: DashboardAppointment[]
  day: Date
  onAppointmentMoved?: (update: any) => Promise<void>
  slotDurationMinutes: number
  pxPerMinute: number
  hourStart: number
  staffSchedules?: Map<string, StaffScheduleInfo>
  viewMode: 'day' | 'week'
}

export function useReschedule({
  items,
  day,
  onAppointmentMoved,
  slotDurationMinutes,
  pxPerMinute,
  hourStart,
  staffSchedules,
  viewMode,
}: UseRescheduleProps) {
  const [activeDragApt, setActiveDragApt] = useState<DashboardAppointment | null>(null)
  const [dropHighlightId, setDropHighlightId] = useState<string | null>(null)
  const [dropPreview, setDropPreview] = useState<any>(null)
  const [snackMsg, setSnackMsg] = useState<{ open: boolean; message: string; severity: 'warning' | 'error' }>({
    open: false,
    message: '',
    severity: 'warning',
  })

  const ymd = useMemo(() => toLocalYMD(day), [day])

  const sensors = useMemo(
    () => [
      PointerSensor.configure({
        activationConstraints: [new PointerActivationConstraints.Distance({ value: 8 })],
      }),
      KeyboardSensor,
    ],
    []
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.operation.source?.data as { apt?: DashboardAppointment } | undefined
    setActiveDragApt(data?.apt ?? null)
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const id = event.operation.target?.id
    setDropHighlightId(id != null ? String(id) : null)
  }, [])

  const handleDragMove = useCallback(
    (event: DragMoveEvent) => {
      const targetId = event.operation.target?.id
      const apt = (event.operation.source?.data as { apt?: DashboardAppointment } | undefined)?.apt
      if (!targetId || !apt) { setDropPreview(null); return }

      const el = (event.operation.target as unknown as { element?: Element }).element
      if (!el) { setDropPreview(null); return }

      const pointerY = event.operation.position.current.y
      const dur = appointmentDurationMinutes(apt.startsAt, apt.endsAt)

      if (viewMode === 'day') {
        const parsed = parseStaffDropId(targetId)
        if (!parsed) { setDropPreview(null); return }
        const sch = staffSchedules?.get(parsed.columnId)
        const masterBreak = sch && !sch.isOff && sch.breakStartsAt && sch.breakEndsAt
          ? { startMinutes: parseHhmmToMins(sch.breakStartsAt) ?? 0, endMinutes: parseHhmmToMins(sch.breakEndsAt) ?? 0 }
          : null
        const masterWorkingHours = sch && !sch.isOff ? { opensMinutes: sch.opensMins, closesMinutes: sch.closesMins } : null
        
        const prev = getDropPreview(pointerY, el, dur, slotDurationMinutes, pxPerMinute, hourStart, masterBreak, masterWorkingHours)
        setDropPreview({ columnId: parsed.columnId, ...prev })
      } else {
        const targetYmd = parseWeekDropId(targetId)
        if (!targetYmd) { setDropPreview(null); return }
        const prev = getDropPreview(pointerY, el, dur, slotDurationMinutes, pxPerMinute, hourStart, null, null)
        setDropPreview({ ymd: targetYmd, ...prev })
      }
    },
    [viewMode, staffSchedules, slotDurationMinutes, pxPerMinute, hourStart]
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const activeDragAptSnapshot = activeDragApt
      setDropHighlightId(null)
      setDropPreview(null)
      setActiveDragApt(null)
      if (event.canceled || !onAppointmentMoved) return

      const op = event.operation
      const targetId = op.target?.id
      const targetEl = (op.target as unknown as { element?: Element }).element
      const pointerY = op.position.current.y

      if (viewMode === 'day') {
        const aptId = parseDragAppointmentId(op.source?.id)
        if (!aptId || !targetId) return
        const parsed = parseStaffDropId(targetId)
        if (!parsed || parsed.ymd !== ymd) return
        const apt = items.find(a => a.id === aptId)
        if (!apt) return

        const dur = appointmentDurationMinutes(apt.startsAt, apt.endsAt)
        const sch = staffSchedules?.get(parsed.columnId)
        const masterBreak = sch && !sch.isOff && sch.breakStartsAt && sch.breakEndsAt
          ? { startMinutes: parseHhmmToMins(sch.breakStartsAt) ?? 0, endMinutes: parseHhmmToMins(sch.breakEndsAt) ?? 0 }
          : null
        const masterWorkingHours = sch && !sch.isOff ? { opensMinutes: sch.opensMins, closesMinutes: sch.closesMins } : null
        
        const prev = getDropPreview(pointerY, targetEl!, dur, slotDurationMinutes, pxPerMinute, hourStart, masterBreak, masterWorkingHours)
        if (!prev.isValid) {
          setSnackMsg({ open: true, message: 'Нельзя перенести на время перерыва или нерабочего времени', severity: 'warning' })
          return
        }

        const draft = targetEl
          ? buildDayViewRescheduleFromPointer(aptId, apt, pointerY, targetEl, pxPerMinute, slotDurationMinutes, day, parsed.columnId, CALENDAR_DAY_COMBINED_COLUMN, CALENDAR_UNASSIGNED_STAFF_KEY, staffSchedules)
          : buildDayViewReschedule(aptId, apt, op.transform?.y ?? 0, pxPerMinute, slotDurationMinutes, day, parsed.columnId, CALENDAR_DAY_COMBINED_COLUMN, CALENDAR_UNASSIGNED_STAFF_KEY, staffSchedules)
        
        if (draft) await onAppointmentMoved(draft)
      } else {
        const parsedSource = parseWeekCellDragId(op.source?.id)
        if (!parsedSource || !targetId) return
        const { appointmentId: aptId, columnYmd: sourceYmd } = parsedSource
        const aptFromItems = items.find(a => a.id === aptId)
        const aptFromSnapshot =
          !aptFromItems && activeDragAptSnapshot?.id === aptId ? activeDragAptSnapshot : null
        const apt = aptFromItems ?? aptFromSnapshot
        if (!apt) return
        const targetYmd = parseWeekDropId(targetId)
        if (!targetYmd) return

        const draft = targetEl
          ? buildWeekViewRescheduleFromPointer(aptId, apt, pointerY, targetEl, pxPerMinute, slotDurationMinutes, targetYmd)
          : buildWeekViewReschedule(aptId, apt, op.transform?.y ?? 0, pxPerMinute, slotDurationMinutes, sourceYmd, targetYmd)
        if (draft) await onAppointmentMoved(draft)
      }
    },
    [
      viewMode,
      items,
      day,
      ymd,
      onAppointmentMoved,
      slotDurationMinutes,
      pxPerMinute,
      hourStart,
      staffSchedules,
      activeDragApt,
    ]
  )

  return {
    activeDragApt,
    dropHighlightId,
    dropPreview,
    sensors,
    snackMsg,
    setSnackMsg,
    handleDragStart,
    handleDragMove,
    handleDragOver,
    handleDragEnd
  }
}
