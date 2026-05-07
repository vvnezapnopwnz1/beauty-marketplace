import React, { useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/shared/theme/useTheme";
import {
  useMasterAppointmentsQuery,
  type MasterAppointment,
} from "../../src/entities/appointments/api";
import {
  AppointmentFilters,
  type FilterId,
} from "../../src/features/appointments/AppointmentFilters";
import { AppointmentListCard } from "../../src/features/appointments/AppointmentListCard";
import { AppointmentSheet } from "../../src/features/appointments/AppointmentSheet";

export default function RecordsScreen() {
  const { colors, typography } = useTheme();
  const [filter, setFilter] = useState<FilterId>("all");
  const [openAppt, setOpenAppt] = useState<MasterAppointment | null>(null);

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

  const apiStatus = filter === "all" ? "" : filter;
  const { data, isLoading, isError } = useMasterAppointmentsQuery({
    from: range.from,
    to: range.to,
    status: apiStatus,
    page: 1,
    pageSize: 100,
  });

  const items = data?.items ?? [];
  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.muted }]}>
              УПРАВЛЕНИЕ
            </Text>
            <Text
              style={[
                styles.title,
                { color: colors.text, fontFamily: typography.fonts.serif },
              ]}
            >
              Записи
            </Text>
          </View>
        </View>
        <AppointmentFilters
          active={filter}
          onChange={setFilter}
          pendingCount={pendingCount}
        />
      </View>

      {isLoading ? (
        <Text style={[styles.state, { color: colors.muted }]}>Загрузка...</Text>
      ) : null}
      {isError ? (
        <Text style={[styles.state, { color: colors.red }]}>
          Не удалось загрузить
        </Text>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <AppointmentListCard
            appointment={item as any}
            onPress={() => setOpenAppt(item)}
          />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <Text style={[styles.state, { color: colors.muted }]}>
              Нет записей
            </Text>
          ) : null
        }
      />

      <AppointmentSheet
        appointment={openAppt}
        onClose={() => setOpenAppt(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  title: { fontSize: 26, fontWeight: "500", letterSpacing: -0.4 },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  state: { textAlign: "center", paddingVertical: 24, fontSize: 13 },
});
