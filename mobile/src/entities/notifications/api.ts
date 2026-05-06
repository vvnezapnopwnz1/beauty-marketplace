import { useQuery } from "@tanstack/react-query";
import apiClient from "../../api/client";
import { NOTIFICATIONS } from "../../api/endpoints";

export type InboxNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  seenAt?: string | null;
  createdAt: string;
};

export type NotificationCounters = {
  unread: number;
  unseen: number;
};

export function useNotificationsQuery(limit = 30, offset = 0) {
  return useQuery({
    queryKey: ["notifications", { limit, offset }],
    queryFn: async () => {
      const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      const { data } = await apiClient.get<InboxNotification[]>(`${NOTIFICATIONS.list}?${query.toString()}`);
      return data;
    },
    refetchInterval: 30_000,
  });
}

export function useNotificationCountersQuery() {
  return useQuery({
    queryKey: ["notificationsUnreadCount"],
    queryFn: async () => {
      const { data } = await apiClient.get<NotificationCounters>(NOTIFICATIONS.unreadCount);
      return data;
    },
    refetchInterval: 30_000,
  });
}
