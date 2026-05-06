import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../src/shared/theme/useTheme";
import { useFinancesSummaryQuery } from "../../src/entities/finances/api";

function rub(cents: number) {
  return `${(cents / 100).toLocaleString("ru-RU")} ₽`;
}

export default function FinancesSettingsScreen() {
  const { colors } = useTheme();
  const { data, isLoading, isError } = useFinancesSummaryQuery();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Финансы</Text>
        {isLoading ? <Text style={{ color: colors.muted }}>Загрузка...</Text> : null}
        {isError ? <Text style={{ color: colors.red }}>Не удалось загрузить сводку</Text> : null}
        {data ? (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Text style={[styles.label, { color: colors.textSoft }]}>Доход</Text>
              <Text style={[styles.value, { color: colors.text }]}>{rub(data.incomeCents)}</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Text style={[styles.label, { color: colors.textSoft }]}>Расход</Text>
              <Text style={[styles.value, { color: colors.text }]}>{rub(data.expensesCents)}</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <Text style={[styles.label, { color: colors.textSoft }]}>Прибыль</Text>
              <Text style={[styles.value, { color: colors.accent }]}>{rub(data.profitCents)}</Text>
            </View>
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "700" },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 },
  label: { fontSize: 13 },
  value: { fontSize: 22, fontWeight: "700" },
});
