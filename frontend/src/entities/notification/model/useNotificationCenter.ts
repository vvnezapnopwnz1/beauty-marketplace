import { useEffect, useRef } from 'react'
import { useAppSelector } from '@app/store'
import {
  useGetNotificationUnreadCountQuery,
  useGetNotificationsQuery,
  useWatchNotificationStreamQuery,
  useMarkAllNotificationsSeenMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useMarkNotificationSeenMutation,
} from './notificationApi'
import type { NotificationItem } from './types'

type UseNotificationCenterOptions = {
  enabled: boolean
  onIncoming?: (notification: NotificationItem) => void
}

export function useNotificationCenter(options: UseNotificationCenterOptions) {
  const { enabled, onIncoming } = options
  const latestNotification = useAppSelector((state) => state.notification.latest)
  const onIncomingRef = useRef(onIncoming)

  useEffect(() => {
    onIncomingRef.current = onIncoming
  }, [onIncoming])

  const { data: unreadData } = useGetNotificationUnreadCountQuery(undefined, {
    skip: !enabled,
  })
  const { data: notificationData } = useGetNotificationsQuery({ limit: 5 }, {
    skip: !enabled,
  })
  const [markSeen] = useMarkNotificationSeenMutation()
  const [markAllSeen] = useMarkAllNotificationsSeenMutation()
  const [markRead] = useMarkNotificationReadMutation()
  const [markAllRead] = useMarkAllNotificationsReadMutation()
  useWatchNotificationStreamQuery(undefined, { skip: !enabled })

  useEffect(() => {
    if (!enabled || !latestNotification) return
    onIncomingRef.current?.(latestNotification)
  }, [enabled, latestNotification])

  return {
    unreadCount: unreadData?.unread ?? 0,
    unseenCount: unreadData?.unseen ?? 0,
    notifications: notificationData?.items ?? [],
    markSeen,
    markAllSeen,
    markRead,
    markAllRead,
  }
}
