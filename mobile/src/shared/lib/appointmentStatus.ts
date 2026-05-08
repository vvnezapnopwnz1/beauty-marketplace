export const FINAL_APPOINTMENT_STATUSES = [
  "completed",
  "cancelled_by_salon",
  "cancelled_by_client",
  "no_show",
] as const;

export type AppointmentStatus = "pending" | "confirmed" | (typeof FINAL_APPOINTMENT_STATUSES)[number];

export function isFinalAppointmentStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return (FINAL_APPOINTMENT_STATUSES as readonly string[]).includes(status);
}
