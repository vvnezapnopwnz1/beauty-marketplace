import type { DashboardAppointment } from '@shared/api/dashboardApi'

export const CALENDAR_HOUR_START = 8
export const CALENDAR_HOUR_END = 21

/** Высота одного часа в таймлайне (px). */
export const CALENDAR_HOUR_HEIGHT_PX = 48

/** Пикселей на минуту по вертикали. */
export const CALENDAR_PX_PER_MINUTE = CALENDAR_HOUR_HEIGHT_PX / 60

/** Количество часовых строк в сетке [CALENDAR_HOUR_START … CALENDAR_HOUR_END] включительно. */
export function calendarVisibleHourCount(): number {
  return CALENDAR_HOUR_END - CALENDAR_HOUR_START + 1
}

/** Полная высота таймлайна в px. */
export function calendarTimelineTotalHeightPx(): number {
  return calendarVisibleHourCount() * CALENDAR_HOUR_HEIGHT_PX
}

/** Клик по вертикали колонки → время начала слота (шаг 15 мин), в пределах видимой сетки. */
export function snapClickYToQuarterHour(day: Date, y: number, timelineHeightPx: number): Date {
  const totalMin = calendarVisibleHourCount() * 60
  const yClamped = Math.max(0, Math.min(y, timelineHeightPx - 1e-6))
  const addMin = (yClamped / timelineHeightPx) * totalMin
  const base = new Date(day.getFullYear(), day.getMonth(), day.getDate(), CALENDAR_HOUR_START, 0, 0, 0)
  const raw = new Date(base.getTime() + addMin * 60000)
  const q = 15 * 60000
  const snapped = new Date(Math.round(raw.getTime() / q) * q)
  const gridEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), CALENDAR_HOUR_END + 1, 0, 0, 0)
  if (snapped.getTime() >= gridEnd.getTime()) {
    return new Date(gridEnd.getTime() - 15 * 60000)
  }
  if (snapped.getTime() < base.getTime()) return base
  return snapped
}

/** Локальные границы дня [00:00, следующий день). */
export function dayBoundsLocal(day: Date): { dayStart: Date; nextDay: Date } {
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0)
  const nextDay = new Date(dayStart)
  nextDay.setDate(nextDay.getDate() + 1)
  return { dayStart, nextDay }
}

/** Видимая область календаря в этот день: [08:00, 22:00) локально. */
export function calendarGridBoundsLocal(day: Date): { gridStart: Date; gridEnd: Date } {
  const gridStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), CALENDAR_HOUR_START, 0, 0, 0)
  const gridEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), CALENDAR_HOUR_END + 1, 0, 0, 0)
  return { gridStart, gridEnd }
}

/** Пересекается ли запись с календарным днём (локально, полуинтервал дня). */
export function aptOverlapsLocalDay(a: DashboardAppointment, day: Date): boolean {
  const s = new Date(a.startsAt).getTime()
  const e = new Date(a.endsAt).getTime()
  if (!(e > s)) return false
  const { dayStart, nextDay } = dayBoundsLocal(day)
  return s < nextDay.getTime() && e > dayStart.getTime()
}

/** Обрезка [startsAt, endsAt] по видимой сетке дня; null если нет пересечения. */
export function clipAppointmentToVisibleGrid(
  a: DashboardAppointment,
  day: Date,
): { clipStart: Date; clipEnd: Date } | null {
  const s = new Date(a.startsAt)
  const e = new Date(a.endsAt)
  if (!(e > s)) return null
  const { gridStart, gridEnd } = calendarGridBoundsLocal(day)
  const clipStart = new Date(Math.max(s.getTime(), gridStart.getTime()))
  const clipEnd = new Date(Math.min(e.getTime(), gridEnd.getTime()))
  if (clipStart.getTime() >= clipEnd.getTime()) return null
  return { clipStart, clipEnd }
}

/** «10:00–11:15» в локальной зоне. */
export function formatAppointmentTimeRangeRu(a: DashboardAppointment): string {
  const o: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  const s = new Date(a.startsAt).toLocaleTimeString('ru-RU', o)
  const e = new Date(a.endsAt).toLocaleTimeString('ru-RU', o)
  return `${s}–${e}`
}

export type TimelineEventLayout = {
  apt: DashboardAppointment
  top: number
  height: number
  leftPct: number
  widthPct: number
}

type IntervalForLayout = { id: string; startMs: number; endMs: number; apt: DashboardAppointment }

function intervalsOverlap(a: IntervalForLayout, b: IntervalForLayout): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs
}

/** Связные компоненты по пересечению интервалов. */
function buildOverlapGroups(intervals: IntervalForLayout[]): IntervalForLayout[][] {
  if (intervals.length === 0) return []
  const visited = new Set<string>()
  const groups: IntervalForLayout[][] = []
  for (const start of intervals) {
    if (visited.has(start.id)) continue
    const comp: IntervalForLayout[] = []
    const stack = [start]
    visited.add(start.id)
    comp.push(start)
    while (stack.length) {
      const cur = stack.pop()!
      for (const other of intervals) {
        if (visited.has(other.id)) continue
        if (intervalsOverlap(cur, other)) {
          visited.add(other.id)
          comp.push(other)
          stack.push(other)
        }
      }
    }
    groups.push(comp)
  }
  return groups
}

/** Жадная раскладка внутри одной группы пересекающихся интервалов. */
function assignIntervalColumnsInGroup(group: IntervalForLayout[]): Map<string, number> {
  const sorted = [...group].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs)
  const lastEndByCol: number[] = []
  const colMap = new Map<string, number>()
  for (const ev of sorted) {
    let c = 0
    while (c < lastEndByCol.length && lastEndByCol[c] > ev.startMs) c++
    if (c === lastEndByCol.length) lastEndByCol.push(ev.endMs)
    else lastEndByCol[c] = ev.endMs
    colMap.set(ev.id, c)
  }
  return colMap
}

/**
 * Позиции событий для одного дня в одной колонке (мастер или «все»).
 * pxPerMinute обычно CALENDAR_PX_PER_MINUTE.
 */
export function layoutTimelineEventsForDay(
  appointments: DashboardAppointment[],
  day: Date,
  pxPerMinute: number,
  minEventHeightPx = 20,
): TimelineEventLayout[] {
  const { gridStart } = calendarGridBoundsLocal(day)
  const intervals: IntervalForLayout[] = []
  for (const apt of appointments) {
    const clipped = clipAppointmentToVisibleGrid(apt, day)
    if (!clipped) continue
    intervals.push({
      id: apt.id,
      apt,
      startMs: clipped.clipStart.getTime(),
      endMs: clipped.clipEnd.getTime(),
    })
  }
  if (intervals.length === 0) return []
  const groups = buildOverlapGroups(intervals)
  const out: TimelineEventLayout[] = []
  for (const group of groups) {
    const colMap = assignIntervalColumnsInGroup(group)
    const maxCols = Math.max(1, ...group.map(g => (colMap.get(g.id) ?? 0) + 1))
    const widthPct = 100 / maxCols
    for (const it of group) {
      const col = colMap.get(it.id) ?? 0
      const top = ((it.startMs - gridStart.getTime()) / 60000) * pxPerMinute
      let height = ((it.endMs - it.startMs) / 60000) * pxPerMinute
      if (height < minEventHeightPx) height = minEventHeightPx
      out.push({
        apt: it.apt,
        top,
        height,
        leftPct: col * widthPct,
        widthPct: widthPct - 0.6,
      })
    }
  }
  return out
}

/** Фильтр записей по мастеру для дневной колонки. */
export function filterAppointmentsForStaffColumn(
  items: DashboardAppointment[],
  day: Date,
  staffColumnId: string,
  combinedColumnId: string,
  unassignedKey: string,
): DashboardAppointment[] {
  return items.filter(a => {
    if (!aptOverlapsLocalDay(a, day)) return false
    if (staffColumnId === combinedColumnId) return true
    const sid = a.staffId?.trim() ? a.staffId : unassignedKey
    return sid === staffColumnId
  })
}

/** Понедельник 00:00 локально */
export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d)
  x.setMonth(x.getMonth() + n)
  return x
}

/** Первое число месяца anchor, 00:00 локально */
export function startOfCalendarMonth(anchor: Date): Date {
  return new Date(anchor.getFullYear(), anchor.getMonth(), 1, 0, 0, 0, 0)
}

/** Первый день после месяца anchor (для полуинтервала to в API). */
export function endOfMonthExclusive(anchor: Date): Date {
  const y = anchor.getFullYear()
  const m = anchor.getMonth()
  return new Date(y, m + 1, 1, 0, 0, 0, 0)
}

/** Понедельник недели, в которой лежит 1-е число месяца monthStart. */
function gridStartMondayForMonth(monthStart: Date): Date {
  const first = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1, 0, 0, 0, 0)
  const dow = (first.getDay() + 6) % 7
  return addDays(first, -dow)
}

/** 42 дня: 6 недель сетки для месяца monthAnchor (любая дата внутри месяца). */
export function monthMatrixDates(monthAnchor: Date): Date[] {
  const monthStart = startOfCalendarMonth(monthAnchor)
  const gridStart = gridStartMondayForMonth(monthStart)
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
}

export function isSameCalendarMonth(a: Date, monthAnchor: Date): boolean {
  return a.getFullYear() === monthAnchor.getFullYear() && a.getMonth() === monthAnchor.getMonth()
}

/** YYYY-MM-DD в локальной зоне */
export function toLocalYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function eachDayOfWeek(weekStartMonday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStartMonday, i))
}

export function hourRange(): number[] {
  const out: number[] = []
  for (let h = CALENDAR_HOUR_START; h <= CALENDAR_HOUR_END; h++) out.push(h)
  return out
}

/** Визуальный класс как в мокапе */
export type CalendarEventVariant = 'confirmed' | 'pending' | 'booked' | 'blocked'

export function appointmentStatusVariant(status: string): CalendarEventVariant {
  const s = status.toLowerCase()
  if (s === 'confirmed' || s === 'completed') return 'confirmed'
  if (s === 'pending') return 'pending'
  if (s.includes('cancel') || s === 'no_show') return 'blocked'
  return 'booked'
}

function aptLocalYMD(a: DashboardAppointment): string {
  return toLocalYMD(new Date(a.startsAt))
}

function aptLocalHour(a: DashboardAppointment): number {
  return new Date(a.startsAt).getHours()
}

/** Ключ: localYMD + "_" + hour */
export function bucketAppointmentsByDayHour(
  items: DashboardAppointment[],
  weekDays: Date[],
): Map<string, DashboardAppointment[]> {
  const allowed = new Set(weekDays.map(toLocalYMD))
  const map = new Map<string, DashboardAppointment[]>()
  for (const a of items) {
    const ymd = aptLocalYMD(a)
    if (!allowed.has(ymd)) continue
    const hour = aptLocalHour(a)
    if (hour < CALENDAR_HOUR_START || hour > CALENDAR_HOUR_END) continue
    const key = `${ymd}_${hour}`
    const list = map.get(key) ?? []
    list.push(a)
    map.set(key, list)
  }
  return map
}

const UNASSIGNED = '__none__'

export function bucketAppointmentsByStaffHour(
  items: DashboardAppointment[],
  dayYmd: string,
): Map<string, DashboardAppointment[]> {
  const map = new Map<string, DashboardAppointment[]>()
  for (const a of items) {
    if (aptLocalYMD(a) !== dayYmd) continue
    const hour = aptLocalHour(a)
    if (hour < CALENDAR_HOUR_START || hour > CALENDAR_HOUR_END) continue
    const sid = a.staffId?.trim() ? a.staffId : UNASSIGNED
    const key = `${sid}_${hour}`
    const list = map.get(key) ?? []
    list.push(a)
    map.set(key, list)
  }
  return map
}

/** Одна колонка «все записи дня» по часу */
export function bucketAppointmentsByHourForDay(items: DashboardAppointment[], dayYmd: string): Map<number, DashboardAppointment[]> {
  const map = new Map<number, DashboardAppointment[]>()
  for (const a of items) {
    if (aptLocalYMD(a) !== dayYmd) continue
    const hour = aptLocalHour(a)
    if (hour < CALENDAR_HOUR_START || hour > CALENDAR_HOUR_END) continue
    const list = map.get(hour) ?? []
    list.push(a)
    map.set(hour, list)
  }
  return map
}

export const CALENDAR_UNASSIGNED_STAFF_KEY = UNASSIGNED
export const CALENDAR_DAY_COMBINED_COLUMN = '__ALL__'

/** Диапазон для заголовка: «14–18 апреля 2026» (без слова «Неделя» — его добавляет экран). */
export function formatWeekTitleRu(weekStartMonday: Date): string {
  const end = addDays(weekStartMonday, 6)
  const sameMonth = weekStartMonday.getMonth() === end.getMonth() && weekStartMonday.getFullYear() === end.getFullYear()
  if (sameMonth) {
    const month = weekStartMonday.toLocaleDateString('ru-RU', { month: 'long' })
    return `${weekStartMonday.getDate()}–${end.getDate()} ${month} ${weekStartMonday.getFullYear()}`
  }
  return `${weekStartMonday.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} — ${end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`
}

export function formatDayTitleRu(day: Date): string {
  return day.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function toDatetimeLocalInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day}T${h}:${min}`
}

/** «09:00–10:00 · 60 мин» */
export function formatAppointmentTimeRangeWithDuration(a: DashboardAppointment): string {
  const o: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  const s = new Date(a.startsAt).toLocaleTimeString('ru-RU', o)
  const e = new Date(a.endsAt).toLocaleTimeString('ru-RU', o)
  const durationMin = Math.round((new Date(a.endsAt).getTime() - new Date(a.startsAt).getTime()) / 60000)
  return `${s}–${e} · ${durationMin} мин`
}

/** Позиция красной линии текущего времени (px от top таймлайна). null если day не сегодня или вне сетки. */
export function nowLineTopPx(day: Date, pxPerMinute: number): number | null {
  const now = new Date()
  if (
    now.getFullYear() !== day.getFullYear() ||
    now.getMonth() !== day.getMonth() ||
    now.getDate() !== day.getDate()
  ) return null
  const mins = (now.getHours() * 60 + now.getMinutes()) - CALENDAR_HOUR_START * 60
  const top = mins * pxPerMinute
  const timelineH = calendarTimelineTotalHeightPx()
  if (top < 0 || top > timelineH) return null
  return top
}

/** Парсит «HH:MM» → минуты от полуночи. null при ошибке. */
export function parseHhmmToMins(hhmm: string | null | undefined): number | null {
  if (!hhmm) return null
  const parts = hhmm.split(':').map(Number)
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null
  return parts[0] * 60 + parts[1]
}

/** Позиция блока перерыва на таймлайне. null если данных нет или перерыв вне сетки. */
export function breakBlockLayout(
  breakStartHhmm: string | null | undefined,
  breakEndHhmm: string | null | undefined,
  pxPerMinute: number,
): { top: number; height: number } | null {
  const startMins = parseHhmmToMins(breakStartHhmm)
  const endMins = parseHhmmToMins(breakEndHhmm)
  if (startMins === null || endMins === null || endMins <= startMins) return null
  const gridStartMins = CALENDAR_HOUR_START * 60
  const gridEndMins = (CALENDAR_HOUR_END + 1) * 60
  const clampedStart = Math.max(startMins, gridStartMins)
  const clampedEnd = Math.min(endMins, gridEndMins)
  if (clampedStart >= clampedEnd) return null
  return {
    top: (clampedStart - gridStartMins) * pxPerMinute,
    height: (clampedEnd - clampedStart) * pxPerMinute,
  }
}

/** Расписание мастера на конкретный день для отображения на таймлайне. */
export type StaffScheduleInfo = {
  opensMins: number
  closesMins: number
  isOff: boolean
  breakStartsAt?: string | null
  breakEndsAt?: string | null
}
