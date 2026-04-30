export type NotificationItem = {
  id: string
  type: string
  title: string
  body: string
  data: Record<string, unknown>
  seenAt?: string | null
  isRead: boolean
  readAt?: string | null
  createdAt: string
}
