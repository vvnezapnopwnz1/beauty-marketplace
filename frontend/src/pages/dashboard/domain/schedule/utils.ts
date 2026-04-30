/**
 * Schedule domain utilities
 * Extracted from ScheduleView.tsx as part of Clean Architecture refactoring
 */

import type { SalonDateOverrideRow, StaffAbsenceRow } from '@shared/api/dashboardApi'
import type { LocalSalonDay, LocalStaffDay } from './types'

const FULL_DAYS = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
]

const WSG_DOW = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС']

export { FULL_DAYS, WSG_DOW }

/**
 * Normalize time string to HH:MM format
 */
export function time5(s: string | null | undefined): string {
  if (!s) return ''
  const p = s.slice(0, 5)
  return p.length === 5 ? p : '10:00'
}

/**
 * Convert time to HH:MM:SS format for API
 */
export function toHHMMSS(t: string): string {
  const p = t.trim()
  if (p.length === 5 && p.includes(':')) return `${p}:00`
  return p
}

/**
 * Create short staff label for display
 */
export function shortStaffLabel(name: string): string {
  const p = name.trim().split(/\s+/)
  if (p.length >= 2) return `${p[0]} ${p[1]!.charAt(0)}.`
  return name.length > 16 ? `${name.slice(0, 14)}…` : name
}

/**
 * Generate initials from staff name
 */
export function staffInitials(name: string): string {
  const p = name.trim().split(/\s+/)
  if (p.length >= 2) return (p[0]![0]! + p[1]![0]!).toUpperCase()
  return name.slice(0, 2).toUpperCase() || '?'
}

/**
 * Get Monday of the current week
 */
export function getMonday(d = new Date()): Date {
  const x = new Date(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}

/**
 * Format override chip text
 */
export function formatOverrideChip(o: SalonDateOverrideRow): string {
  const d = new Date(o.onDate.includes('T') ? o.onDate : `${o.onDate}T12:00:00`)
  const dm = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  return `${dm} — ${o.isClosed ? 'Выходной' : 'Особый день'}`
}

/**
 * Format absence chip text
 */
export function formatAbsenceChip(a: StaffAbsenceRow): string {
  const s = new Date(a.startsOn.includes('T') ? a.startsOn : `${a.startsOn}T12:00:00`)
  const e = new Date(a.endsOn.includes('T') ? a.endsOn : `${a.endsOn}T12:00:00`)
  const sm = s.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  const em = e.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  const kind =
    a.kind === 'vacation' || a.kind === 'отпуск'
      ? 'Отпуск'
      : a.kind === 'sick' || a.kind === 'больничный'
        ? 'Больничный'
        : a.kind
  if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
    return `${s.getDate()}–${e.getDate()} ${s.toLocaleDateString('ru-RU', { month: 'long' })} — ${kind}`
  }
  return `${sm} – ${em} — ${kind}`
}

/**
 * Check if staff day differs from salon day
 */
export function dayDiffersFromSalon(l: LocalStaffDay, s: LocalSalonDay | undefined): boolean {
  if (!s) return false
  if (l.dayOff !== s.closed) return true
  if (l.dayOff) return false
  return l.opens !== s.opens || l.closes !== s.closes
}

/**
 * Compact time range display: «10–20» for round hours, otherwise «10:30–20:15»
 */
export function compactTimeRange(opens: string, closes: string): string {
  const o = opens.slice(0, 5)
  const c = closes.slice(0, 5)
  const [oh, om] = o.split(':').map(Number)
  const [ch, cm] = c.split(':').map(Number)
  if (
    !Number.isNaN(oh) &&
    !Number.isNaN(om) &&
    !Number.isNaN(ch) &&
    !Number.isNaN(cm) &&
    om === 0 &&
    cm === 0
  ) {
    return `${oh}–${ch}`
  }
  return `${o}–${c}`
}
