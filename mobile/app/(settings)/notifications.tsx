import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "../../src/shared/theme/useTheme";
import {
  useNotificationCountersQuery,
  useNotificationsQuery,
} from "../../src/entities/notifications/api";
import { useNotificationStream } from "../../src/features/notifications/useNotificationStream";

export default function NotificationsSettingsScreen() {
  const { colors } = useTheme();
  const { data: inbox = [], isLoading, isError } = useNotificationsQuery();
  const { data: counters } = useNotificationCountersQuery();

  useNotificationStream();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Уведомления
          </Text>
          <Text style={[styles.badge, { color: colors.accent }]}>
            Непрочитано: {counters?.unread ?? 0}
          </Text>
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
        {!isLoading && !isError && inbox.length === 0 ? (
          <Text style={[styles.state, { color: colors.textSoft }]}>
            Пока пусто
          </Text>
        ) : null}
        {inbox.length > 0
          ? inbox.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.cardBody, { color: colors.textSoft }]}>
                  {item.body}
                </Text>
                <Text style={[styles.meta, { color: colors.muted }]}>
                  {item.isRead ? "Прочитано" : "Новое"} ·{" "}
                  {new Date(item.createdAt).toLocaleString("ru-RU")}
                </Text>
              </View>
            ))
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 10 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "700" },
  badge: { fontSize: 14, fontWeight: "700" },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardBody: { fontSize: 13 },
  meta: { fontSize: 12 },
  state: { fontSize: 14 },
});
