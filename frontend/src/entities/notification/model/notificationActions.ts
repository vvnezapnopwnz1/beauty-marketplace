import { ROUTES, dashboardPath, dashboardSectionPath } from '@shared/config/routes'
import type { NotificationItem } from './types'

export type NotificationResolvedActions = {
  navigateTo?: { label: string; path: string }
  confirmAppointment?: { label: string; appointmentId: string; salonId?: string }
}

export function resolveNotificationActions(notification: NotificationItem): NotificationResolvedActions {
  const data = notification.data ?? {}
  const salonId = typeof data.salonId === 'string' ? data.salonId : undefined
  const appointmentId = typeof data.appointmentId === 'string' ? data.appointmentId : undefined

  if (notification.type === 'appointment.created') {
    return {
      navigateTo: salonId ? { label: 'Открыть записи', path: dashboardSectionPath(salonId, 'appointments') } : undefined,
      confirmAppointment: appointmentId ? { label: 'Подтвердить запись', appointmentId, salonId } : undefined,
    }
  }

  if (notification.type === 'appointment.status_changed') {
    return {
      navigateTo: salonId ? { label: 'Открыть записи', path: dashboardSectionPath(salonId, 'appointments') } : undefined,
    }
  }

  if (notification.type === 'claim.approved' && salonId) {
    return { navigateTo: { label: 'Открыть кабинет', path: dashboardPath(salonId) } }
  }

  if (notification.type === 'claim.submitted' || notification.type === 'claim.rejected') {
    return { navigateTo: { label: 'Перейти в профиль', path: ROUTES.ME } }
  }

  return {}
}
