import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../shared/theme/useTheme";
import { categoryColor } from "../../shared/theme/categoryColor";
import type { MasterAppointment } from "../../entities/appointments/api";

const STATUS_DOT: Record<string, string> = {
  confirmed: "#2A9E6A", pending: "#C4800A", completed: "#4A90D4",
  cancelled: "#C04040", cancelled_client: "#C04040", cancelled_staff: "#C04040", no_show: "#888",
};
const STATUS_LABEL: Record<string, string> = {
  confirmed: "Подтверждена", pending: "Ожидает", completed: "Завершена",
  cancelled: "Отмена", cancelled_client: "Отмена", cancelled_staff: "Отмена", no_show: "Не пришёл",
};

function fmt(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type Props = { appointment: MasterAppointment & { cat?: string | null }; onPress: () => void };

export function AppointmentListCard({ appointment: a, onPress }: Props) {
  const { colors } = useTheme();
  const c = categoryColor(colors, a.cat ?? null);
  const dot = STATUS_DOT[a.status] ?? STATUS_DOT.confirmed;
  const label = STATUS_LABEL[a.status] ?? a.status;
  const start = new Date(a.startsAt);
  const end = new Date(a.endsAt);
  const dur = Math.round((end.getTime() - start.getTime()) / 60000);

  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={[styles.stripe, { backgroundColor: c }]} />
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={[styles.svc, { color: c }]}>{a.serviceName}</Text>
          <Text style={[styles.price, { color: colors.text }]}>
            {(a.totalPriceCents / 100).toLocaleString("ru-RU")} ₽
          </Text>
        </View>
        <Text numberOfLines={1} style={[styles.client, { color: colors.textSoft }]}>{a.clientLabel}</Text>
        <Text style={[styles.meta, { color: colors.muted }]}>
          {start.getDate()} апр · {fmt(start)} – {fmt(end)} · {dur}мин
        </Text>
      </View>
      <View style={styles.right}>
        <View style={[styles.statusPill, { backgroundColor: `${dot}1F`, borderColor: `${dot}40` }]}>
          <View style={[styles.statusDot, { backgroundColor: dot }]} />
          <Text style={{ fontSize: 9, color: dot, fontWeight: "600" }}>{label}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={14} color={colors.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: 12, alignItems: "center", padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  stripe: { width: 4, height: 44, borderRadius: 2 },
  info: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  svc: { fontSize: 13, fontWeight: "700", flex: 1, marginRight: 8 },
  price: { fontSize: 12, fontWeight: "700" },
  client: { fontSize: 11, marginBottom: 5 },
  meta: { fontSize: 10 },
  right: { alignItems: "flex-end", gap: 6 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 100, borderWidth: 1 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
});
