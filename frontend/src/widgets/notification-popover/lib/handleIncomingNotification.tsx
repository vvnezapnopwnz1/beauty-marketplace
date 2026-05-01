import { NotificationItem, resolveNotificationActions } from '@entities/notification'
import { enqueueActionSnackbar } from '@shared/ui/ActionSnackbar'
import { closeSnackbar } from 'notistack'
import { NavigateFunction } from 'react-router-dom'
import { dashboardSectionPath } from '@shared/config/routes'
import { Box, Typography } from '@mui/material'

export const handleIncomingNotification =
  (
    navigate: NavigateFunction,
    confirmAppointment: (appointmentId: string) => Promise<boolean>,
    isConfirming: (appointmentId: string) => boolean,
    markSeen: (id: string) => Promise<unknown>,
    markRead: (id: string) => Promise<unknown>,
  ) =>
  async (notification: NotificationItem) => {
    void markSeen(notification.id)
    const resolved = resolveNotificationActions(notification)
    const actions = []
    let snackbarKey: ReturnType<typeof enqueueActionSnackbar> | undefined

    switch (notification.type) {
      case 'appointment.created': {
        if (resolved.navigateTo) {
          actions.push({
            label: resolved.navigateTo.label,
            onClick: () => navigate(resolved.navigateTo!.path),
          })
        }
        if (resolved.confirmAppointment) {
          const appointmentId = resolved.confirmAppointment.appointmentId
          actions.push({
            label: isConfirming(appointmentId) ? 'Подтверждаем...' : 'Подтвердить запись',
            closeOnClick: false,
            onClick: async () => {
              if (isConfirming(appointmentId)) return
              const ok = await confirmAppointment(appointmentId)
              if (ok) {
                closeSnackbar(snackbarKey)
                void markRead(notification.id)
                enqueueActionSnackbar({
                  message: 'Запись подтверждена',
                  variant: 'success',
                  autoHideDuration: 3000,
                  actions: resolved.confirmAppointment?.salonId
                    ? [
                        {
                          label: 'Открыть',
                          onClick: () =>
                            navigate(
                              dashboardSectionPath(
                                resolved.confirmAppointment!.salonId!,
                                'appointments',
                              ),
                            ),
                        },
                      ]
                    : undefined,
                })
              } else {
                enqueueActionSnackbar({
                  message: 'Не удалось подтвердить запись',
                  variant: 'error',
                  autoHideDuration: 4000,
                })
              }
            },
          })
          actions.push({ label: 'Закрыть' })
        }
        break
      }
      case 'appointment.status_changed':
      case 'claim.approved':
      case 'claim.rejected':
      case 'claim.submitted':
      default:
        if (resolved.navigateTo) {
          actions.push({
            label: resolved.navigateTo.label,
            onClick: () => navigate(resolved.navigateTo!.path),
          })
        }
        actions.push({ label: 'Закрыть' })
        break
    }

    let customContent
    if (notification.type === 'appointment.created') {
      const gName = notification.data?.guestName as string | undefined
      const gPhone = notification.data?.guestPhone as string | undefined
      if (gName || gPhone) {
        customContent = (
          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'rgba(255,255,255,0.12)', borderRadius: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{gName || 'Без имени'}</Typography>
            <Typography sx={{ fontSize: 12, opacity: 0.9 }}>{gPhone || 'Без телефона'}</Typography>
          </Box>
        )
      }
    }

    snackbarKey = enqueueActionSnackbar({
      title: notification.title,
      message: notification.body,
      variant: 'info',
      autoHideDuration: notification.type === 'appointment.created' ? null : 7000,
      actions,
      customContent,
    })
    return snackbarKey
  }
