import { useState } from 'react'
import { usePatchAppointmentStatusMutation } from '@entities/appointment/model/appointmentApi'
import { rtkApi } from '@shared/api/rtkApi'
import { useAppDispatch } from '@app/store'

export function useNotificationActions() {
  const dispatch = useAppDispatch()
  const [patchAppointmentStatus] = usePatchAppointmentStatusMutation()
  const [confirmingAppointmentId, setConfirmingAppointmentId] = useState<string | null>(null)

  const isConfirming = (appointmentId: string) => confirmingAppointmentId === appointmentId

  const confirmAppointment = async (appointmentId: string): Promise<boolean> => {
    if (isConfirming(appointmentId)) return false
    setConfirmingAppointmentId(appointmentId)
    try {
      await patchAppointmentStatus({ id: appointmentId, status: 'confirmed' }).unwrap()
      dispatch(rtkApi.util.invalidateTags(['Appointments', 'Notifications']))
      return true
    } catch {
      return false
    } finally {
      setConfirmingAppointmentId(null)
    }
  }

  return {
    confirmAppointment,
    isConfirming,
  }
}
