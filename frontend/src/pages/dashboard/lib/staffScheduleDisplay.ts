import type { StaffWorkingHourRow } from '@shared/api/dashboardApi'

const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/** Short text like «Пн–Пт: 10:00–20:00» from weekly rows. */
export function formatWeeklyHoursSummary(rows: StaffWorkingHourRow[]): string {
  const byDay = new Map<number, StaffWorkingHourRow>()
  rows.forEach(r => byDay.set(r.dayOfWeek, r))
  const parts: string[] = []
  for (let d = 0; d <= 6; d++) {
    const r = byDay.get(d)
    if (!r || r.isDayOff) continue
    const o = r.opensAt.slice(0, 5)
    const c = r.closesAt.slice(0, 5)
    parts.push(`${DOW[d]}: ${o}–${c}`)
  }
  if (parts.length === 0) return 'Нет рабочих дней'
  return parts.join(' · ')
}

export type LiveStaffStatus = 'working' | 'break' | 'off'

/** Client-side status from weekly template + current time (Europe/Moscow default). */
export function computeLiveStaffStatus(
  rows: StaffWorkingHourRow[],
  now = new Date(),
  timeZone = 'Europe/Moscow',
): LiveStaffStatus {
  const wdStr = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(now)
  const fromMon: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }
  const dow = fromMon[wdStr] ?? 0
  const hm = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(now)
  const [hh, mm] = hm.split(':').map(s => parseInt(s, 10))
  const cur = hh * 60 + mm
  const r = rows.find(x => x.dayOfWeek === dow)
  if (!r || r.isDayOff) return 'off'
  const o = parseClock(r.opensAt)
  const c = parseClock(r.closesAt)
  if (cur < o || cur >= c) return 'off'
  if (r.breakStartsAt && r.breakEndsAt) {
    const bs = parseClock(r.breakStartsAt)
    const be = parseClock(r.breakEndsAt)
    if (cur >= bs && cur < be) return 'break'
  }
  return 'working'
}

function parseClock(s: string): number {
  const t = s.length >= 8 ? s.slice(0, 8) : `${s.slice(0, 5)}:00`
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
