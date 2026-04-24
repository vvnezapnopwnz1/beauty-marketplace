import { DashboardAppointment } from '@shared/api/dashboardApi'

export type DropPreviewState = {
  id: string
  topPx: number
  heightPx: number
  isValid: boolean
  columnId?: string // for day view
  ymd?: string // for week view
} | null

export interface RescheduleHookProps {
  items: DashboardAppointment[]
  onAppointmentMoved?: (update: DropPreviewState) => Promise<void>
  slotDurationMinutes: number
  pxPerMinute: number
  hourStart: number
}
