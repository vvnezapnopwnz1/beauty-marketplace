import { rtkApi } from '@shared/api/rtkApi'
import { setLatestNotification } from './notificationSlice'
import { connectNotificationStream } from './notificationStream'
import type { NotificationItem } from './types'

type NotificationListResponse = {
  items: NotificationItem[]
}

type NotificationCounterResponse = {
  unread: number
  unseen: number
}

export const notificationApi = rtkApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<NotificationListResponse, { unread?: boolean; limit?: number; offset?: number } | void>({
      query: (params?: { unread?: boolean; limit?: number; offset?: number }) => {
        const qs = new URLSearchParams()
        if (params?.unread) qs.set('unread', 'true')
        if (params?.limit) qs.set('limit', String(params.limit))
        if (params?.offset) qs.set('offset', String(params.offset))
        const suffix = qs.toString() ? `?${qs.toString()}` : ''
        return `/api/v1/notifications${suffix}`
      },
      providesTags: ['Notifications'],
    }),
    getNotificationUnreadCount: build.query<NotificationCounterResponse, void>({
      query: () => ({ url: '/api/v1/notifications/unread-count' }),
      providesTags: ['Notifications'],
    }),
    watchNotificationStream: build.query<null, void>({
      queryFn: async () => ({ data: null }),
      async onCacheEntryAdded(_arg, { cacheDataLoaded, cacheEntryRemoved, dispatch }) {
        await cacheDataLoaded
        const disconnect = connectNotificationStream({
          onNotification: (notification) => {
            dispatch(setLatestNotification(notification))
            dispatch(rtkApi.util.invalidateTags(['Notifications']))
          },
        })
        await cacheEntryRemoved
        disconnect()
      },
    }),
    markNotificationRead: build.mutation<{ updated: boolean }, string>({
      query: (id) => ({
        url: `/api/v1/notifications/${id}/read`,
        method: 'POST',
      }),
      invalidatesTags: ['Notifications'],
    }),
    markNotificationSeen: build.mutation<{ updated: boolean }, string>({
      query: (id) => ({
        url: `/api/v1/notifications/${id}/seen`,
        method: 'POST',
      }),
      invalidatesTags: ['Notifications'],
    }),
    markAllNotificationsSeen: build.mutation<{ updated: number }, void>({
      query: () => ({
        url: '/api/v1/notifications/seen-all',
        method: 'POST',
      }),
      invalidatesTags: ['Notifications'],
    }),
    markAllNotificationsRead: build.mutation<{ updated: number }, void>({
      query: () => ({
        url: '/api/v1/notifications/read-all',
        method: 'POST',
      }),
      invalidatesTags: ['Notifications'],
    }),
  }),
})

export const {
  useGetNotificationsQuery,
  useGetNotificationUnreadCountQuery,
  useWatchNotificationStreamQuery,
  useMarkNotificationReadMutation,
  useMarkNotificationSeenMutation,
  useMarkAllNotificationsSeenMutation,
  useMarkAllNotificationsReadMutation,
} = notificationApi
