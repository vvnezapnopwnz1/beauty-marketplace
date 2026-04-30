/**
 * Schedule operations (use cases)
 * Extracted from ScheduleView.tsx as part of Clean Architecture refactoring
 */

import {
  putSalonScheduleBundle,
  putStaffScheduleBundle,
  type SalonDateOverrideRow,
  type StaffAbsenceRow,
} from '@shared/api/dashboardApi'
import { toHHMMSS } from './utils'
import type { LocalSalonDay, LocalStaffDay, NewOverride, NewAbsence } from './types'

export interface SalonScheduleOperations {
  saveSalon: (params: SaveSalonParams) => Promise<void>
  addOverride: (current: SalonDateOverrideRow[], newOv: NewOverride) => SalonDateOverrideRow[]
}

export interface StaffScheduleOperations {
  saveStaff: (params: SaveStaffParams) => Promise<void>
  addAbsence: (current: StaffAbsenceRow[], newAbs: NewAbsence) => StaffAbsenceRow[]
  resetStaffFromSalon: (staffLocal: LocalStaffDay[], salonByDay: Map<number, LocalSalonDay>) => LocalStaffDay[]
}

export interface SaveSalonParams {
  slotDurationMinutes: number
  workingHours: LocalSalonDay[]
  dateOverrides: SalonDateOverrideRow[]
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export interface SaveStaffParams {
  staffId: string
  workingHours: LocalStaffDay[]
  absences: StaffAbsenceRow[]
  onSuccess?: () => void
  onError?: (error: Error) => void
}

/**
 * Create salon schedule operations
 */
export function createSalonScheduleOperations(): SalonScheduleOperations {
  return {
    async saveSalon({ slotDurationMinutes, workingHours, dateOverrides, onSuccess, onError }) {
      try {
        await putSalonScheduleBundle({
          slotDurationMinutes,
          workingHours: workingHours.map(l => ({
            dayOfWeek: l.day,
            opensAt: toHHMMSS(l.opens),
            closesAt: toHHMMSS(l.closes),
            closed: l.closed,
            breakStartsAt: l.breakStart ? toHHMMSS(l.breakStart) : null,
            breakEndsAt: l.breakEnd ? toHHMMSS(l.breakEnd) : null,
          })),
          dateOverrides: dateOverrides.map(o => ({
            onDate: o.onDate.slice(0, 10),
            isClosed: o.isClosed,
            note: o.note ?? null,
          })),
        })
        onSuccess?.()
      } catch (e) {
        onError?.(e instanceof Error ? e : new Error('Ошибка'))
      }
    },

    addOverride(current, newOv) {
      if (!newOv.onDate) return current
      return [
        ...current,
        {
          id: crypto.randomUUID(),
          onDate: newOv.onDate,
          isClosed: newOv.isClosed,
          note: newOv.note || null,
        },
      ]
    },
  }
}

/**
 * Create staff schedule operations
 */
export function createStaffScheduleOperations(): StaffScheduleOperations {
  return {
    async saveStaff({ staffId, workingHours, absences, onSuccess, onError }) {
      try {
        await putStaffScheduleBundle(staffId, {
          rows: workingHours.map(l => ({
            dayOfWeek: l.day,
            opensAt: toHHMMSS(l.opens),
            closesAt: toHHMMSS(l.closes),
            isDayOff: l.dayOff,
            breakStartsAt: l.breakStart ? toHHMMSS(l.breakStart) : null,
            breakEndsAt: l.breakEnd ? toHHMMSS(l.breakEnd) : null,
          })),
          absences: absences.map(a => ({
            startsOn: a.startsOn.slice(0, 10),
            endsOn: a.endsOn.slice(0, 10),
            kind: a.kind,
          })),
        })
        onSuccess?.()
      } catch (e) {
        onError?.(e instanceof Error ? e : new Error('Ошибка'))
      }
    },

    addAbsence(current, newAbs) {
      if (!newAbs.startsOn || !newAbs.endsOn) return current
      return [
        ...current,
        {
          id: crypto.randomUUID(),
          startsOn: newAbs.startsOn,
          endsOn: newAbs.endsOn,
          kind: newAbs.kind,
        },
      ]
    },

    resetStaffFromSalon(staffLocal, salonByDay) {
      return staffLocal.map(l => {
        const s = salonByDay.get(l.day)
        if (!s) return l
        return {
          day: l.day,
          dayOff: s.closed,
          opens: s.opens,
          closes: s.closes,
          breakStart: s.breakStart,
          breakEnd: s.breakEnd,
        }
      })
    },
  }
}
