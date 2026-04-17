import type { WorkingHourRow } from '@entities/salon'

function parseHHMM(value: string): number | null {
  const [h, m] = value.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  return h * 60 + m
}

export function isOpenNow(workingHours: WorkingHourRow[], tz: string): boolean {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  const weekdayMap: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  }
  const weekday = parts.find(p => p.type === 'weekday')?.value ?? 'Mon'
  const dayOfWeek = weekdayMap[weekday] ?? 0
  const hour = Number(parts.find(p => p.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find(p => p.type === 'minute')?.value ?? '0')
  const nowMinutes = hour * 60 + minute

  const today = workingHours.find(row => row.dayOfWeek === dayOfWeek)
  if (!today || today.isClosed) return false
  const open = parseHHMM(today.opensAt)
  const close = parseHHMM(today.closesAt)
  if (open == null || close == null) return false
  return nowMinutes >= open && nowMinutes < close
}
