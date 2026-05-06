import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/shared/theme/useTheme";
import { useMasterAppointmentsQuery } from "../../src/entities/appointments/api";

const FILTERS = [
  { label: "Все", value: "" },
  { label: "Предстоящие", value: "pending,confirmed" },
  { label: "Прошедшие", value: "completed" },
  { label: "Отменённые", value: "cancelled,cancelled_client,cancelled_staff,no_show" },
];

export default function RecordsScreen() {
  const { colors } = useTheme();
  const [status, setStatus] = useState("");
  const range = useMemo(() => {
    const now = new Date();
    const from = new Date(now);
    from.setMonth(now.getMonth() - 1);
    const to = new Date(now);
    to.setMonth(now.getMonth() + 1);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  }, []);

  const { data, isLoading, isError } = useMasterAppointmentsQuery({
    from: range.from,
    to: range.to,
    status,
    page: 1,
    pageSize: 50,
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.wrap}>
        <View style={styles.filters}>
          {FILTERS.map((f) => {
            const active = status === f.value;
            return (
              <TouchableOpacity
                key={f.label}
                onPress={() => setStatus(f.value)}
                style={[styles.filterBtn, { backgroundColor: active ? colors.accent : colors.surface }]}
              >
                <Text style={{ color: active ? colors.textInverse : colors.text }}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isLoading ? <Text style={{ color: colors.muted }}>Загрузка записей...</Text> : null}
        {isError ? <Text style={{ color: colors.red }}>Не удалось загрузить записи</Text> : null}
        {!isLoading && data && data.items.length === 0 ? <Text style={{ color: colors.muted }}>Записей нет</Text> : null}

        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
              <Text style={[styles.name, { color: colors.text }]}>{item.clientLabel}</Text>
              <Text style={{ color: colors.textSoft }}>{item.serviceName}</Text>
              <Text style={{ color: colors.textSoft }}>
                {new Date(item.startsAt).toLocaleString("ru-RU")} - {new Date(item.endsAt).toLocaleTimeString("ru-RU")}
              </Text>
              <Text style={{ color: colors.accent }}>{(item.totalPriceCents / 100).toLocaleString("ru-RU")} RUB</Text>
            </View>
          )}
          contentContainerStyle={styles.list}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  wrap: { flex: 1, padding: 16 },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  filterBtn: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  list: { paddingBottom: 60 },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10 },
  name: { fontSize: 16, fontWeight: "700" },
});
