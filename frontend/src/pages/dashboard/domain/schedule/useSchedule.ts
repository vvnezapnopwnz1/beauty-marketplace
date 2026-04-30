/**
 * Schedule domain hooks
 * Extracted from ScheduleView.tsx as part of Clean Architecture refactoring
 */

import { useCallback, useEffect, useState } from 'react'
import {
  fetchDashboardStaff,
  fetchSalonSchedule,
  fetchStaffSchedule,
  type DashboardStaffListItem,
} from '@shared/api/dashboardApi'
import { FULL_DAYS } from './utils'
import { time5 } from './utils'
import type { LocalSalonDay, LocalStaffDay, SalonDateOverrideRow, StaffAbsenceRow } from './types'

/**
 * Hook for managing salon schedule state and operations
 */
export function useSalonSchedule() {
  const [slotMin, setSlotMin] = useState(30)
  const [salonLocal, setSalonLocal] = useState<LocalSalonDay[]>([])
  const [salonOverrides, setSalonOverrides] = useState<SalonDateOverrideRow[]>([])
  const [err, setErr] = useState<string | null>(null)

  const loadSalon = useCallback(async () => {
    try {
      setErr(null)
      const data = await fetchSalonSchedule()
      setSlotMin(data.slotDurationMinutes ?? 30)
      const byDay = new Map(data.workingHours.map(r => [r.dayOfWeek, r]))
      setSalonLocal(
        FULL_DAYS.map((_, day) => {
          const r = byDay.get(day)
          return {
            day,
            opens: time5(r?.opensAt ?? '10:00:00'),
            closes: time5(r?.closesAt ?? '18:00:00'),
            closed: r?.isClosed ?? false,
            breakStart: time5(r?.breakStartsAt ?? ''),
            breakEnd: time5(r?.breakEndsAt ?? ''),
          }
        }),
      )
      setSalonOverrides(data.dateOverrides ?? [])
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Ошибка')
    }
  }, [])

  useEffect(() => {
    void loadSalon()
  }, [loadSalon])

  return {
    slotMin,
    setSlotMin,
    salonLocal,
    setSalonLocal,
    salonOverrides,
    setSalonOverrides,
    err,
    setErr,
    loadSalon,
  }
}

/**
 * Hook for managing staff schedule state and operations
 */
export function useStaffSchedule(staffId: string | null) {
  const [staffLocal, setStaffLocal] = useState<LocalStaffDay[]>([])
  const [absences, setAbsences] = useState<StaffAbsenceRow[]>([])
  const [err, setErr] = useState<string | null>(null)

  const loadStaffBundle = useCallback(
    async (id: string) => {
      try {
        setErr(null)
        const bundle = await fetchStaffSchedule(id)
        setAbsences(bundle.absences ?? [])
        const byDay = new Map(bundle.rows.map(r => [r.dayOfWeek, r]))
        setStaffLocal(
          FULL_DAYS.map((_, day) => {
            const r = byDay.get(day)
            return {
              day,
              opens: time5(r?.opensAt ?? '10:00:00'),
              closes: time5(r?.closesAt ?? '18:00:00'),
              dayOff: r?.isDayOff ?? false,
              breakStart: time5(r?.breakStartsAt ?? ''),
              breakEnd: time5(r?.breakEndsAt ?? ''),
            }
          }),
        )
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Ошибка')
      }
    },
    [],
  )

  useEffect(() => {
    if (!staffId) return
    void loadStaffBundle(staffId)
  }, [staffId, loadStaffBundle])

  return {
    staffLocal,
    setStaffLocal,
    absences,
    setAbsences,
    err,
    setErr,
    loadStaffBundle,
  }
}

/**
 * Hook for managing staff list
 */
export function useStaffList() {
  const [staff, setStaff] = useState<DashboardStaffListItem[]>([])
  const [staffId, setStaffId] = useState<string>('')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        setErr(null)
        const list = await fetchDashboardStaff()
        setStaff(list)
        setStaffId(prev => prev || (list[0]?.staff.id ?? ''))
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Ошибка')
      }
    })()
  }, [])

  return {
    staff,
    setStaff,
    staffId,
    setStaffId,
    err,
    setErr,
  }
}
