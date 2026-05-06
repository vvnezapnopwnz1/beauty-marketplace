import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../../src/shared/theme/useTheme";
import { fetchDashboardStaffList } from "../../src/api/dashboardClient";

export default function StaffSettingsScreen() {
  const { colors } = useTheme();
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["dashboardStaff"],
    queryFn: fetchDashboardStaffList,
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Персонал салона</Text>
        {isLoading ? <Text style={{ color: colors.muted }}>Загрузка...</Text> : null}
        {isError ? <Text style={{ color: colors.red }}>Не удалось загрузить персонал</Text> : null}
        {data.map((row: any) => (
          <View key={row.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.name, { color: colors.text }]}>{row.displayName}</Text>
            <Text style={{ color: colors.textSoft }}>
              {row.status || (row.isActive ? "active" : "inactive")}
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
  name: { fontSize: 16, fontWeight: "700" },
});
