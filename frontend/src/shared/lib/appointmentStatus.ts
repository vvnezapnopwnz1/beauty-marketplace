export const FINAL_APPOINTMENT_STATUSES = [
  'completed',
  'cancelled_by_salon',
  'cancelled_by_client',
  'no_show',
] as const

export function isFinalAppointmentStatus(status: string | null | undefined): boolean {
  if (!status) return false
  return (FINAL_APPOINTMENT_STATUSES as readonly string[]).includes(status)
}

export function isCancelledAppointmentStatus(status: string | null | undefined): boolean {
  return Boolean(status && status.startsWith('cancelled_'))
}

export function shouldConfirmStatusChangeFromCurrent(status: string | null | undefined): boolean {
  return isFinalAppointmentStatus(status)
}
