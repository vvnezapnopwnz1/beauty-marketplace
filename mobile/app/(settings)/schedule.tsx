import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../../src/shared/theme/useTheme";
import { fetchDashboardSchedule } from "../../src/api/dashboardClient";

export default function ScheduleSettingsScreen() {
  const { colors } = useTheme();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboardSchedule"],
    queryFn: fetchDashboardSchedule,
  });
  const rows: any[] = Array.isArray(data) ? data : data?.workingHours ?? [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Расписание салона</Text>
        {isLoading ? <Text style={{ color: colors.muted }}>Загрузка...</Text> : null}
        {isError ? <Text style={{ color: colors.red }}>Не удалось загрузить расписание</Text> : null}
        {rows.map((row: any) => (
          <View key={row.id ?? `${row.dayOfWeek}`} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={{ color: colors.text, fontWeight: "700" }}>День #{row.dayOfWeek}</Text>
            <Text style={{ color: colors.textSoft }}>
              {row.isClosed || row.closed ? "Выходной" : `${row.opensAt} - ${row.closesAt}`}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 10 },
  title: { fontSize: 24, fontWeight: "700" },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
});
