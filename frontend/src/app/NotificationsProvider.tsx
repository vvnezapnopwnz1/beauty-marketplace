import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@app/store'
import { selectUser } from '@features/auth-by-phone/model/authSlice'
import {
  useMarkNotificationReadMutation,
  useMarkNotificationSeenMutation,
  useNotificationActions,
  useNotificationCenter,
} from '@entities/notification'
import { handleIncomingNotification } from '@widgets/NotificationsPopover/lib/handleIncomingNotification'

export function NotificationsProvider() {
  const user = useAppSelector(selectUser)
  const navigate = useNavigate()
  const { confirmAppointment, isConfirming } = useNotificationActions()
  const [markSeen] = useMarkNotificationSeenMutation()
  const [markRead] = useMarkNotificationReadMutation()
  const enabled = Boolean(user)

  const onIncoming = useMemo(
    () =>
      handleIncomingNotification(
        navigate,
        confirmAppointment,
        isConfirming,
        (id: string) => markSeen(id).unwrap(),
        (id: string) => markRead(id).unwrap(),
      ),
    [navigate, confirmAppointment, isConfirming, markSeen, markRead],
  )

  useNotificationCenter({
    enabled,
    onIncoming,
  })

  return null
}
