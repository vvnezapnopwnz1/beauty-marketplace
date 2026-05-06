import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { MasterAppointment } from "../../entities/appointments/api";
import { useTheme } from "../../shared/theme/useTheme";

type CalendarMode = "day" | "week";

type Props = {
  mode: CalendarMode;
  isResourceMode: boolean;
  appointments: MasterAppointment[];
  onDragEnd: (appointment: MasterAppointment, nextStartsAt: string, nextEndsAt: string) => void;
  onLongPressAppointment: (appointment: MasterAppointment) => void;
};

function shiftIsoDate(iso: string, hours: number): string {
  const d = new Date(iso);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

export function MasterCalendar({
  mode,
  isResourceMode,
  appointments,
  onDragEnd,
  onLongPressAppointment,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceAlt, borderColor: colors.borderLight }]}>
      <Text style={[styles.meta, { color: colors.muted }]}>
        {mode === "day" ? "День" : "Неделя"} · {isResourceMode ? "Ресурсы" : "Один мастер"}
      </Text>

      <View style={styles.events}>
        {appointments.length === 0 ? (
          <Text style={{ color: colors.muted }}>Нет записей в выбранном диапазоне</Text>
        ) : null}
        {appointments.map((appointment) => (
          <TouchableOpacity
            key={appointment.id}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
            onLongPress={() => onLongPressAppointment(appointment)}
            delayLongPress={180}
            activeOpacity={0.9}
          >
            <Text style={[styles.title, { color: colors.text }]}>{appointment.clientLabel}</Text>
            <Text style={{ color: colors.textSoft }}>{appointment.serviceName}</Text>
            <Text style={{ color: colors.textSoft }}>
              {new Date(appointment.startsAt).toLocaleString("ru-RU")}
            </Text>

            <TouchableOpacity
              style={[styles.dragBtn, { backgroundColor: colors.accentLight, borderColor: colors.accentBorder }]}
              onPress={() =>
                onDragEnd(
                  appointment,
                  shiftIsoDate(appointment.startsAt, 1),
                  shiftIsoDate(appointment.endsAt, 1)
                )
              }
            >
              <Text style={{ color: colors.text, fontWeight: "600" }}>Перенести +1ч</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderWidth: 1, borderRadius: 16, padding: 12, minHeight: 240 },
  meta: { fontSize: 12, marginBottom: 8 },
  events: { gap: 8 },
  card: { borderWidth: 1, borderRadius: 12, padding: 10 },
  title: { fontSize: 15, fontWeight: "700" },
  dragBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
});
