import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { NotificationItem } from './types'

type NotificationState = {
  unreadCount: number
  latest?: NotificationItem
}

const initialState: NotificationState = {
  unreadCount: 0,
}

export const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadCount = Math.max(0, action.payload)
    },
    consumeOne(state) {
      state.unreadCount = Math.max(0, state.unreadCount - 1)
    },
    setLatestNotification(state, action: PayloadAction<NotificationItem | undefined>) {
      state.latest = action.payload
      if (action.payload && !action.payload.isRead) {
        state.unreadCount += 1
      }
    },
  },
})

export const { setUnreadCount, consumeOne, setLatestNotification } = notificationSlice.actions
