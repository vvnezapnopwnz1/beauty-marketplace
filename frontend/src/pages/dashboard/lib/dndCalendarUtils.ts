import { CALENDAR_HOUR_END, CALENDAR_HOUR_START } from './calendarGridUtils'
import type { StaffScheduleInfo } from './calendarGridUtils'

/** Draggable id for dashboard timeline appointments. */
export const DRAG_APPT_PREFIX = 'appt:'

const WEEK_CELL_MARKER = ':cell:'

/** Droppable id: staff / unassigned / combined column for a local calendar day. */
export const DROP_STAFF_PREFIX = 'staff:'

/** Droppable id: one day column in week mode. */
export const DROP_WEEK_PREFIX = 'week:'

/** Week grid: bottom strip «перенести на другую дату» (must not use `week:` prefix — see `parseWeekDropId`). */
export const CALENDAR_WEEK_RESCHEDULE_STRIP_DROP_ID = 'calendar:week-reschedule-strip'

const GRID_START_ABS_MINS = CALENDAR_HOUR_START * 60
const GRID_END_ABS_MINS = (CALENDAR_HOUR_END + 1) * 60
const VISIBLE_SPAN_MINS = GRID_END_ABS_MINS - GRID_START_ABS_MINS

export function dragIdForAppointment(appointmentId: string): string {
  return `${DRAG_APPT_PREFIX}${appointmentId}`
}

export function parseDragAppointmentId(id: unknown): string | null {
  if (typeof id !== 'string' || !id.startsWith(DRAG_APPT_PREFIX)) return null
  const rest = id.slice(DRAG_APPT_PREFIX.length)
  if (rest.includes(WEEK_CELL_MARKER)) return null
  return rest
}

/** Week grid: one draggable per (appointment, day column) so ids stay unique when an apt spans days. */
export function dragIdForWeekCell(appointmentId: string, columnYmd: string): string {
  return `${DRAG_APPT_PREFIX}${appointmentId}${WEEK_CELL_MARKER}${columnYmd}`
}

export function parseWeekCellDragId(id: unknown): { appointmentId: string; columnYmd: string } | null {
  if (typeof id !== 'string' || !id.startsWith(DRAG_APPT_PREFIX)) return null
  const rest = id.slice(DRAG_APPT_PREFIX.length)
  const i = rest.indexOf(WEEK_CELL_MARKER)
  if (i <= 0) return null
  return { appointmentId: rest.slice(0, i), columnYmd: rest.slice(i + WEEK_CELL_MARKER.length) }
}

export function dropIdStaffColumn(columnId: string, ymd: string): string {
  return `${DROP_STAFF_PREFIX}${columnId}:${ymd}`
}

export function parseStaffDropId(id: unknown): { columnId: string; ymd: string } | null {
  if (typeof id !== 'string' || !id.startsWith(DROP_STAFF_PREFIX)) return null
  const rest = id.slice(DROP_STAFF_PREFIX.length)
  const i = rest.lastIndexOf(':')
  if (i <= 0) return null
  return { columnId: rest.slice(0, i), ymd: rest.slice(i + 1) }
}

export function dropIdWeekDay(ymd: string): string {
  return `${DROP_WEEK_PREFIX}${ymd}`
}

export function parseWeekDropId(id: unknown): string | null {
  if (typeof id !== 'string' || !id.startsWith(DROP_WEEK_PREFIX)) return null
  return id.slice(DROP_WEEK_PREFIX.length)
}

export function pixelDeltaToMinutes(deltaY: number, pxPerMinute: number): number {
  if (!pxPerMinute) return 0
  return deltaY / pxPerMinute
}

export function roundToSlot(minutes: number, slotDurationMinutes: number): number {
  const step = Math.max(1, Math.round(slotDurationMinutes))
  return Math.round(minutes / step) * step
}

/** Minutes from visible grid start (CALENDAR_HOUR_START) on the given local calendar day. */
export function minutesFromGridStartOnDay(day: Date, at: Date): number {
  const gridStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), CALENDAR_HOUR_START, 0, 0, 0)
  return (at.getTime() - gridStart.getTime()) / 60000
}

export function dateAtGridMinutesFromDayStart(day: Date, minutesFromGridStart: number): Date {
  const gridStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), CALENDAR_HOUR_START, 0, 0, 0)
  return new Date(gridStart.getTime() + minutesFromGridStart * 60000)
}

export function parseYmdToLocalDay(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return new Date(NaN)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

export function appointmentDurationMinutes(startsAt: string, endsAt: string): number {
  const ms = new Date(endsAt).getTime() - new Date(startsAt).getTime()
  return Math.max(1, Math.round(ms / 60000))
}

export function canDragAppointmentStatus(status: string): boolean {
  const s = status.toLowerCase()
  if (s === 'completed') return false
  if (s === 'no_show') return false
  if (s.includes('cancel')) return false
  return true
}

/**
 * Allowed vertical range for appointment *start* (minutes from grid 08:00 on that column day).
 * Returns null if the column is a day-off for a specific master.
 */
export function gridStartMinuteWindowForDayColumn(
  columnId: string,
  combinedColumnId: string,
  unassignedKey: string,
  staffSchedules: Map<string, StaffScheduleInfo> | undefined,
  durationMins: number,
): { minRel: number; maxRel: number } | null {
  const dur = Math.max(1, durationMins)
  if (columnId === combinedColumnId || columnId === unassignedKey) {
    return { minRel: 0, maxRel: Math.max(0, VISIBLE_SPAN_MINS - dur) }
  }
  const sch = staffSchedules?.get(columnId)
  if (sch?.isOff) return null
  const opensRel = sch ? Math.max(0, sch.opensMins - GRID_START_ABS_MINS) : 0
  const closesRel = sch ? Math.min(VISIBLE_SPAN_MINS, sch.closesMins - GRID_START_ABS_MINS) : VISIBLE_SPAN_MINS
  const minRel = Math.max(0, opensRel)
  const maxRel = Math.min(VISIBLE_SPAN_MINS - dur, closesRel - dur)
  if (maxRel < minRel) return null
  return { minRel, maxRel }
}

export function weekColumnStartMinuteWindow(durationMins: number): { minRel: number; maxRel: number } {
  const dur = Math.max(1, durationMins)
  return { minRel: 0, maxRel: Math.max(0, VISIBLE_SPAN_MINS - dur) }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

export type DayReschedulePayload = {
  id: string
  startsAt: string
  endsAt: string
  salonMasterId?: string
  clearSalonMasterId?: boolean
}

/**
 * Build PUT payload for day view after a drag-drop, or null if nothing changes / invalid drop.
 */
export function buildDayViewReschedule(
  appointmentId: string,
  appointment: { startsAt: string; endsAt: string; status: string; salonMasterId?: string | null },
  deltaY: number,
  pxPerMinute: number,
  slotDurationMinutes: number,
  dayAnchor: Date,
  targetColumnId: string,
  combinedColumnId: string,
  unassignedKey: string,
  staffSchedules: Map<string, StaffScheduleInfo> | undefined,
): DayReschedulePayload | null {
  if (!canDragAppointmentStatus(appointment.status)) return null
  const dur = appointmentDurationMinutes(appointment.startsAt, appointment.endsAt)
  const targetWin = gridStartMinuteWindowForDayColumn(
    targetColumnId,
    combinedColumnId,
    unassignedKey,
    staffSchedules,
    dur,
  )
  if (!targetWin) return null

  const deltaMin = roundToSlot(pixelDeltaToMinutes(deltaY, pxPerMinute), slotDurationMinutes)
  const startRel = minutesFromGridStartOnDay(dayAnchor, new Date(appointment.startsAt))
  const nextRel = clamp(startRel + deltaMin, targetWin.minRel, targetWin.maxRel)
  const nextStart = dateAtGridMinutesFromDayStart(dayAnchor, nextRel)
  const nextEnd = new Date(nextStart.getTime() + dur * 60000)

  let salonMasterId: string | undefined
  let clearSalonMasterId: boolean | undefined
  if (targetColumnId !== combinedColumnId) {
    if (targetColumnId === unassignedKey) {
      if (appointment.salonMasterId?.trim()) clearSalonMasterId = true
    } else if (targetColumnId !== (appointment.salonMasterId ?? '').trim()) {
      salonMasterId = targetColumnId
    }
  }

  const sameTime = nextStart.getTime() === new Date(appointment.startsAt).getTime()
  const sameEnd = nextEnd.getTime() === new Date(appointment.endsAt).getTime()
  const masterChanged = Boolean(clearSalonMasterId || salonMasterId)
  if (sameTime && sameEnd && !masterChanged) return null

  const out: DayReschedulePayload = {
    id: appointmentId,
    startsAt: nextStart.toISOString(),
    endsAt: nextEnd.toISOString(),
  }
  if (clearSalonMasterId) out.clearSalonMasterId = true
  else if (salonMasterId) out.salonMasterId = salonMasterId
  return out
}

export type WeekReschedulePayload = { id: string; startsAt: string; endsAt: string }

/**
 * Week view: move start time by vertical delta; optionally move to another day column.
 */
// ─── New utilities for DnD polish (Tasks 3, 4, 6) ───────────────────────────

/**
 * Returns true if [startMinutes, endMinutes) overlaps the master break interval.
 */
export function isBreakZone(
  startMinutes: number,
  endMinutes: number,
  masterBreak: { startMinutes: number; endMinutes: number } | null,
): boolean {
  if (!masterBreak) return false
  return startMinutes < masterBreak.endMinutes && endMinutes > masterBreak.startMinutes
}

/**
 * Computes drop-target preview from live pointer position.
 * Returns absolute top/height (px within column timeline) and validity flag.
 */
export function getDropPreview(
  pointerClientY: number,
  columnElement: Element,
  durationMinutes: number,
  slotDurationMinutes: number,
  pxPerMinute: number,
  hourStart: number,
  masterBreak: { startMinutes: number; endMinutes: number } | null,
  masterWorkingHours: { opensMinutes: number; closesMinutes: number } | null,
): { topPx: number; heightPx: number; startMinutes: number; isValid: boolean } {
  const rect = columnElement.getBoundingClientRect()
  const relativeY = pointerClientY - rect.top
  const rawMinutes = relativeY / pxPerMinute + hourStart * 60
  const snappedStart = roundToSlot(rawMinutes, slotDurationMinutes)
  const topPx = (snappedStart - hourStart * 60) * pxPerMinute
  const heightPx = durationMinutes * pxPerMinute
  const endMinutes = snappedStart + durationMinutes

  let isValid = true
  if (masterWorkingHours) {
    if (snappedStart < masterWorkingHours.opensMinutes || endMinutes > masterWorkingHours.closesMinutes) {
      isValid = false
    }
  }
  if (masterBreak && isBreakZone(snappedStart, endMinutes, masterBreak)) {
    isValid = false
  }
  return { topPx, heightPx, startMinutes: snappedStart, isValid }
}

/**
 * Day view: build PUT payload using real pointer Y position (Task 4).
 */
export function buildDayViewRescheduleFromPointer(
  appointmentId: string,
  appointment: { startsAt: string; endsAt: string; status: string; salonMasterId?: string | null },
  pointerClientY: number,
  columnElement: Element,
  pxPerMinute: number,
  slotDurationMinutes: number,
  dayAnchor: Date,
  targetColumnId: string,
  combinedColumnId: string,
  unassignedKey: string,
  staffSchedules: Map<string, StaffScheduleInfo> | undefined,
): DayReschedulePayload | null {
  if (!canDragAppointmentStatus(appointment.status)) return null
  const dur = appointmentDurationMinutes(appointment.startsAt, appointment.endsAt)
  const targetWin = gridStartMinuteWindowForDayColumn(
    targetColumnId,
    combinedColumnId,
    unassignedKey,
    staffSchedules,
    dur,
  )
  if (!targetWin) return null

  const rect = columnElement.getBoundingClientRect()
  const relativeY = pointerClientY - rect.top
  const rawRel = relativeY / pxPerMinute
  const snappedRel = roundToSlot(rawRel, slotDurationMinutes)

  function clamp(n: number, lo: number, hi: number) {
    return Math.min(hi, Math.max(lo, n))
  }
  const nextRel = clamp(snappedRel, targetWin.minRel, targetWin.maxRel)
  const nextStart = dateAtGridMinutesFromDayStart(dayAnchor, nextRel)
  const nextEnd = new Date(nextStart.getTime() + dur * 60000)

  let salonMasterId: string | undefined
  let clearSalonMasterId: boolean | undefined
  if (targetColumnId !== combinedColumnId) {
    if (targetColumnId === unassignedKey) {
      if (appointment.salonMasterId?.trim()) clearSalonMasterId = true
    } else if (targetColumnId !== (appointment.salonMasterId ?? '').trim()) {
      salonMasterId = targetColumnId
    }
  }

  const sameTime = nextStart.getTime() === new Date(appointment.startsAt).getTime()
  const sameEnd = nextEnd.getTime() === new Date(appointment.endsAt).getTime()
  const masterChanged = Boolean(clearSalonMasterId || salonMasterId)
  if (sameTime && sameEnd && !masterChanged) return null

  const out: DayReschedulePayload = {
    id: appointmentId,
    startsAt: nextStart.toISOString(),
    endsAt: nextEnd.toISOString(),
  }
  if (clearSalonMasterId) out.clearSalonMasterId = true
  else if (salonMasterId) out.salonMasterId = salonMasterId
  return out
}

/**
 * Week view: build PUT payload using real pointer Y position (Task 4).
 */
export function buildWeekViewRescheduleFromPointer(
  appointmentId: string,
  appointment: { startsAt: string; endsAt: string; status: string },
  pointerClientY: number,
  columnElement: Element,
  pxPerMinute: number,
  slotDurationMinutes: number,
  targetYmd: string,
): WeekReschedulePayload | null {
  if (!canDragAppointmentStatus(appointment.status)) return null
  const dur = appointmentDurationMinutes(appointment.startsAt, appointment.endsAt)
  const win = weekColumnStartMinuteWindow(dur)

  const rect = columnElement.getBoundingClientRect()
  const relativeY = pointerClientY - rect.top
  const rawRel = relativeY / pxPerMinute
  const snappedRel = roundToSlot(rawRel, slotDurationMinutes)

  function clamp(n: number, lo: number, hi: number) {
    return Math.min(hi, Math.max(lo, n))
  }
  const nextRel = clamp(snappedRel, win.minRel, win.maxRel)

  const targetDay = parseYmdToLocalDay(targetYmd)
  if (Number.isNaN(targetDay.getTime())) return null

  const nextStart = dateAtGridMinutesFromDayStart(targetDay, nextRel)
  const nextEnd = new Date(nextStart.getTime() + dur * 60000)

  if (
    nextStart.getTime() === new Date(appointment.startsAt).getTime() &&
    nextEnd.getTime() === new Date(appointment.endsAt).getTime()
  ) return null

  return {
    id: appointmentId,
    startsAt: nextStart.toISOString(),
    endsAt: nextEnd.toISOString(),
  }
}

export function buildWeekViewReschedule(
  appointmentId: string,
  appointment: { startsAt: string; endsAt: string; status: string },
  deltaY: number,
  pxPerMinute: number,
  slotDurationMinutes: number,
  sourceColumnYmd: string,
  targetYmd: string,
): WeekReschedulePayload | null {
  if (!canDragAppointmentStatus(appointment.status)) return null
  const dur = appointmentDurationMinutes(appointment.startsAt, appointment.endsAt)
  const win = weekColumnStartMinuteWindow(dur)
  const deltaMin = roundToSlot(pixelDeltaToMinutes(deltaY, pxPerMinute), slotDurationMinutes)

  const sourceDay = parseYmdToLocalDay(sourceColumnYmd)
  const targetDay = parseYmdToLocalDay(targetYmd)
  if (Number.isNaN(sourceDay.getTime()) || Number.isNaN(targetDay.getTime())) return null

  const startRel = minutesFromGridStartOnDay(sourceDay, new Date(appointment.startsAt))
  const nextRel = clamp(startRel + deltaMin, win.minRel, win.maxRel)
  const nextStart = dateAtGridMinutesFromDayStart(targetDay, nextRel)
  const nextEnd = new Date(nextStart.getTime() + dur * 60000)

  if (
    nextStart.getTime() === new Date(appointment.startsAt).getTime() &&
    nextEnd.getTime() === new Date(appointment.endsAt).getTime()
  ) {
    return null
  }

  return {
    id: appointmentId,
    startsAt: nextStart.toISOString(),
    endsAt: nextEnd.toISOString(),
  }
}
