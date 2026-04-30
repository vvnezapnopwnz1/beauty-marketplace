export interface UserAppointment {
  id: string
  salonId: string
  salonName: string
  serviceName: string
  masterName: string | null
  startsAt: string // ISO 8601
  endsAt: string   // ISO 8601
  status: AppointmentStatus
  priceCents: number | null
  clientNote: string | null
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled_by_salon'
  | 'cancelled_by_client'
  | 'no_show'

export interface UserAppointmentsResponse {
  items: UserAppointment[]
  total: number
  page: number
  pageSize: number
}
