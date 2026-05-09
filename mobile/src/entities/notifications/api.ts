import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
      const { data } = await apiClient.get<{ items: InboxNotification[] }>(
        `${NOTIFICATIONS.list}?${query.toString()}`
      );
      return data.items ?? [];
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

export function useMarkNotificationReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(NOTIFICATIONS.markRead(id));
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["notificationsUnreadCount"] });
    },
  });
}

export function useMarkAllReadMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.post(NOTIFICATIONS.markAllRead);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["notificationsUnreadCount"] });
    },
  });
}
