import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/shared/theme/useTheme";
import { useTodayQuery } from "../../src/entities/today/api";
import { useRouter } from "expo-router";

export default function DashboardScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const { data, isLoading, isError } = useTodayQuery(today);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.headerTitle, { color: colors.text, fontFamily: typography.fonts.serif }]}>Сегодня</Text>
        {isLoading ? <Text style={[styles.stateText, { color: colors.muted }]}>Загрузка...</Text> : null}
        {isError ? <Text style={[styles.stateText, { color: colors.red }]}>Не удалось загрузить данные дня</Text> : null}
        {data ? (
          <View style={styles.block}>
            <Text style={[styles.kpi, { color: colors.text }]}>{data.appointmentsCount}</Text>
            <Text style={[styles.label, { color: colors.textSoft }]}>Записей на {data.date}</Text>
            <Text style={[styles.label, { color: colors.textSoft }]}>Выручка: {(data.revenueCents / 100).toLocaleString("ru-RU")} RUB</Text>
            <Text style={[styles.label, { color: colors.textSoft }]}>Посещаемость: {data.attendanceRatePct}%</Text>
            {data.nextAppointment ? (
              <Text style={[styles.label, { color: colors.accent }]}>
                Ближайшая: {data.nextAppointment.clientName} через {data.nextAppointment.minutesUntil} мин
              </Text>
            ) : null}
          </View>
        ) : null}
        <View style={styles.quickGrid}>
          <TouchableOpacity style={[styles.quickCard, { backgroundColor: colors.surface }]} onPress={() => router.push("/(settings)/services")}>
            <Text style={[styles.quickText, { color: colors.text }]}>Услуги</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickCard, { backgroundColor: colors.surface }]} onPress={() => router.push("/(settings)/finances")}>
            <Text style={[styles.quickText, { color: colors.text }]}>Финансы</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickCard, { backgroundColor: colors.surface }]} onPress={() => router.push("/(settings)/notifications")}>
            <Text style={[styles.quickText, { color: colors.text }]}>Уведомления</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickCard, { backgroundColor: colors.surface }]} onPress={() => router.push("/(settings)/staff")}>
            <Text style={[styles.quickText, { color: colors.text }]}>Персонал</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 18,
    paddingTop: 16,
    paddingBottom: 80, // Space for tab bar
  },
  headerTitle: {
    fontSize: 22,
    marginBottom: 16,
  },
  block: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  kpi: {
    fontSize: 36,
    fontWeight: "800",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
  },
  stateText: {
    fontSize: 14,
    marginBottom: 12,
  },
  quickGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickCard: {
    width: "48%",
    borderRadius: 14,
    padding: 12,
  },
  quickText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
