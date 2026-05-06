import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../../src/shared/theme/useTheme";
import { fetchDashboardSalonProfile } from "../../src/api/dashboardClient";

export default function SalonSettingsScreen() {
  const { colors } = useTheme();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboardSalonProfile"],
    queryFn: fetchDashboardSalonProfile,
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
        <Text style={[styles.title, { color: colors.text }]}>Салон</Text>
        {isLoading ? <Text style={{ color: colors.muted }}>Загрузка...</Text> : null}
        {isError ? <Text style={{ color: colors.red }}>Не удалось загрузить профиль салона</Text> : null}
        {data ? (
          <>
            <Text style={{ color: colors.textSoft }}>Название: {data.nameOverride || "—"}</Text>
            <Text style={{ color: colors.textSoft }}>Адрес: {data.addressOverride || data.address || "—"}</Text>
            <Text style={{ color: colors.textSoft }}>Часовой пояс: {data.timezone || "—"}</Text>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 16 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  title: { fontSize: 24, fontWeight: "700" },
});
