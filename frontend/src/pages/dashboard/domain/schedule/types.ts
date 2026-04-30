/**
 * Schedule domain types
 * Extracted from ScheduleView.tsx as part of Clean Architecture refactoring
 */

import type { SalonDateOverrideRow, StaffAbsenceRow, WorkingHourRow, StaffWorkingHourRow } from '@shared/api/dashboardApi'

export type LocalSalonDay = {
  day: number
  opens: string
  closes: string
  closed: boolean
  breakStart: string
  breakEnd: string
}

export type LocalStaffDay = {
  day: number
  opens: string
  closes: string
  dayOff: boolean
  breakStart: string
  breakEnd: string
}

export type SalonScheduleState = {
  slotDurationMinutes: number
  workingHours: LocalSalonDay[]
  dateOverrides: SalonDateOverrideRow[]
}

export type StaffScheduleState = {
  workingHours: LocalStaffDay[]
  absences: StaffAbsenceRow[]
}

export type NewOverride = {
  onDate: string
  isClosed: boolean
  note: string
}

export type NewAbsence = {
  startsOn: string
  endsOn: string
  kind: string
}
