import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/shared/theme/useTheme";
import { useMasterAppointmentsQuery, type MasterAppointment } from "../../src/entities/appointments/api";
import { useMeQuery } from "../../src/entities/me/api";
import { MonthHeatmap } from "../../src/features/calendar/MonthHeatmap";
import { MasterCalendar } from "../../src/features/calendar/MasterCalendar";
import { useRescheduleAppointment } from "../../src/features/reschedule/useRescheduleAppointment";
import { AppointmentQuickActionsSheet, type AppointmentQuickActionsSheetRef } from "../../src/features/calendar/AppointmentQuickActionsSheet";

export default function CalendarScreen() {
  const { colors } = useTheme();
  const [viewMode, setViewMode] = useState<"day" | "week">("week");
  const [selected, setSelected] = useState<MasterAppointment | null>(null);
  const sheetRef = useRef<AppointmentQuickActionsSheetRef>(null);
  const now = useMemo(() => new Date(), []);

  const from = useMemo(() => {
    const d = new Date(now);
    if (viewMode === "day") return d.toISOString().slice(0, 10);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().slice(0, 10);
  }, [now, viewMode]);
  const to = useMemo(() => {
    const d = new Date(now);
    if (viewMode === "day") d.setDate(d.getDate() + 1);
    else d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }, [now, viewMode]);

  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { data: me } = useMeQuery();
  const isAdmin = (me?.effectiveRoles?.salonMemberships?.length ?? 0) > 0;
  const { data } = useMasterAppointmentsQuery({ from, to, page: 1, pageSize: 100 });
  const reschedule = useRescheduleAppointment();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.navBg, borderBottomColor: colors.borderLight }]}>
        <Text style={[styles.title, { color: colors.text }]}>Календарь</Text>
        <View style={styles.toggleContainer}>
          {(["day", "week"] as const).map((mode) => {
            const isActive = viewMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                activeOpacity={0.8}
                onPress={() => setViewMode(mode)}
                style={[
                  styles.toggleBtn,
                  {
                    backgroundColor: isActive ? colors.accent : "transparent",
                    borderColor: isActive ? "transparent" : colors.border,
                    borderWidth: isActive ? 0 : 1,
                  },
                ]}
              >
                <Text style={[styles.toggleText, { color: isActive ? colors.textInverse : colors.muted }]}>
                  {mode === "day" ? "День" : "Неделя"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.content}>
        <MonthHeatmap month={month} />
        <MasterCalendar
          mode={viewMode}
          isResourceMode={isAdmin}
          appointments={data?.items ?? []}
          onDragEnd={(appointment, nextStartsAt, nextEndsAt) =>
            reschedule.mutate({ id: appointment.id, startsAt: nextStartsAt, endsAt: nextEndsAt })
          }
          onLongPressAppointment={(appointment) => {
            setSelected(appointment);
            sheetRef.current?.present();
          }}
        />
      </View>

      <AppointmentQuickActionsSheet ref={sheetRef} appointment={selected} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  toggleContainer: { flexDirection: "row", gap: 8 },
  toggleBtn: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 100,
  },
  toggleText: { fontSize: 12, fontWeight: "700" },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 },
});