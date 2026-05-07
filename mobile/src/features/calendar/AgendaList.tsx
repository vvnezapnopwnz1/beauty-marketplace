import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "../../shared/theme/useTheme";
import { categoryColor } from "../../shared/theme/categoryColor";
import type { MasterAppointment } from "../../entities/appointments/api";

const STATUS_DOT: Record<string, string> = {
  confirmed: "#2A9E6A",
  pending: "#C4800A",
  completed: "#4A90D4",
  cancelled: "#C04040",
  cancelled_client: "#C04040",
  cancelled_staff: "#C04040",
  no_show: "#888",
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Подтверждена",
  pending: "Ожидает",
  completed: "Завершена",
  cancelled: "Отмена",
  cancelled_client: "Отмена",
  cancelled_staff: "Отмена",
  no_show: "Не пришёл",
};

function fmt(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type Props = {
  appointments: Array<MasterAppointment & { cat?: string | null }>;
  onSelect: (a: MasterAppointment) => void;
};

export function AgendaList({ appointments, onSelect }: Props) {
  const { colors } = useTheme();
  if (appointments.length === 0) {
    return <Text style={[styles.empty, { color: colors.muted }]}>Нет записей</Text>;
  }
  return (
    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
      {appointments.map((a) => {
        const start = new Date(a.startsAt);
        const end = new Date(a.endsAt);
        const dur = Math.round((end.getTime() - start.getTime()) / 60000);
        const c = categoryColor(colors, a.cat ?? null);
        const dot = STATUS_DOT[a.status] ?? STATUS_DOT.confirmed;
        const label = STATUS_LABEL[a.status] ?? a.status;

        return (
          <Pressable key={a.id} onPress={() => onSelect(a)} style={styles.row}>
            <View style={styles.timeCol}>
              <Text style={[styles.time, { color: colors.text }]}>{fmt(start)}</Text>
              <Text style={[styles.dur, { color: colors.muted }]}>{dur}м</Text>
            </View>
            <View style={[styles.rail, { backgroundColor: `${c}50` }]}>
              <View style={[styles.railDot, { backgroundColor: c, borderColor: colors.bg }]} />
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
              <View style={styles.cardTop}>
                <Text numberOfLines={1} style={[styles.svc, { color: c }]}>{a.serviceName}</Text>
                <Text style={[styles.price, { color: colors.text }]}>
                  {(a.totalPriceCents / 100).toLocaleString("ru-RU")} ₽
                </Text>
              </View>
              <View style={styles.cardBottom}>
                <Text style={[styles.client, { color: colors.textSoft }]}>{a.clientLabel}</Text>
                <View style={styles.statusWrap}>
                  <View style={[styles.statusDot, { backgroundColor: dot }]} />
                  <Text style={[styles.statusLabel, { color: colors.muted }]}>{label}</Text>
                </View>
              </View>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 16, gap: 7 },
  empty: { textAlign: "center", paddingVertical: 40, fontSize: 13 },
  row: { flexDirection: "row", gap: 10, alignItems: "stretch" },
  timeCol: { width: 40, alignItems: "flex-end", paddingTop: 4 },
  time: { fontSize: 11, fontWeight: "600" },
  dur: { fontSize: 9, marginTop: 1 },
  rail: { width: 2, borderRadius: 1, position: "relative" },
  railDot: { position: "absolute", top: 10, left: -3, width: 8, height: 8, borderRadius: 4, borderWidth: 2 },
  card: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 11 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  svc: { fontSize: 12, fontWeight: "700", flex: 1, marginRight: 8 },
  price: { fontSize: 11, fontWeight: "600" },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 6 },
  client: { fontSize: 10 },
  statusWrap: { flexDirection: "row", alignItems: "center", gap: 3 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusLabel: { fontSize: 9 },
});
