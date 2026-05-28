import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useTheme } from "../../src/shared/theme/useTheme";
import {
  useNotificationCountersQuery,
  useNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllReadMutation,
} from "../../src/entities/notifications/api";
import { useNotificationStream } from "../../src/features/notifications/useNotificationStream";

type FilterTab = "all" | "unread";

export default function NotificationsSettingsScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState<FilterTab>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: inbox = [], isLoading, isError } = useNotificationsQuery();
  const { data: counters } = useNotificationCountersQuery();
  const markRead = useMarkNotificationReadMutation();
  const markAllRead = useMarkAllReadMutation();

  useNotificationStream();

  const safeInbox = Array.isArray(inbox) ? inbox : [];
  const filtered =
    tab === "unread" ? safeInbox.filter((n) => !n.isRead) : safeInbox;

  const handleTap = (id: string, isRead: boolean) => {
    if (!isRead) {
      markRead.mutate(id);
    }
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: colors.text }]}>
            Уведомления
          </Text>
          {(counters?.unread ?? 0) > 0 && (
            <Pressable
              onPress={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <Text style={[styles.markAllBtn, { color: colors.accent }]}>
                Прочитать все
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.tabs}>
          {(["all", "unread"] as FilterTab[]).map((t) => {
            const active = tab === t;
            return (
              <Pressable
                key={t}
                onPress={() => setTab(t)}
                style={[
                  styles.tab,
                  {
                    borderBottomColor: active ? colors.accent : "transparent",
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: active ? colors.accent : colors.muted,
                  }}
                >
                  {t === "all"
                    ? "Все"
                    : `Непрочитанные${counters?.unread ? ` (${counters.unread})` : ""}`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isLoading ? (
          <Text style={[styles.state, { color: colors.muted }]}>
            Загрузка...
          </Text>
        ) : null}
        {isError ? (
          <Text style={[styles.state, { color: colors.red }]}>
            Не удалось загрузить уведомления
          </Text>
        ) : null}
        {!isLoading && !isError && safeInbox.length === 0 ? (
          <Text style={[styles.state, { color: colors.textSoft }]}>
            Пока пусто
          </Text>
        ) : null}

        {filtered.map((item) => {
          const isExpanded = expanded[item.id] ?? false;
          return (
            <Pressable
              key={item.id}
              onPress={() => handleTap(item.id, item.isRead)}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              {!item.isRead && (
                <View
                  style={[
                    styles.unreadStrip,
                    { backgroundColor: colors.accent },
                  ]}
                />
              )}
              <View style={styles.cardBody}>
                <Text
                  style={[
                    styles.cardTitle,
                    {
                      color: colors.text,
                      fontWeight: item.isRead ? "500" : "700",
                    },
                  ]}
                >
                  {item.title}
                </Text>
                <Text
                  style={[styles.cardText, { color: colors.textSoft }]}
                  numberOfLines={isExpanded ? undefined : 2}
                >
                  {item.body}
                </Text>
                {isExpanded && (
                  <Text style={[styles.meta, { color: colors.muted }]}>
                    {new Date(item.createdAt).toLocaleString("ru-RU")}
                  </Text>
                )}
                {!isExpanded && (
                  <Text style={[styles.meta, { color: colors.muted }]}>
                    {item.isRead ? "Прочитано" : "Новое"} ·{" "}
                    {new Date(item.createdAt).toLocaleString("ru-RU")}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 10 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: { fontSize: 24, fontWeight: "700" },
  markAllBtn: { fontSize: 13, fontWeight: "600" },
  tabs: { flexDirection: "row", gap: 16, marginBottom: 6 },
  tab: { paddingBottom: 6, borderBottomWidth: 2 },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    flexDirection: "row",
  },
  unreadStrip: { width: 4 },
  cardBody: { flex: 1, padding: 12, gap: 4 },
  cardTitle: { fontSize: 15 },
  cardText: { fontSize: 13 },
  meta: { fontSize: 12 },
  state: { fontSize: 14 },
});
