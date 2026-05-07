import React, { useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/shared/theme/useTheme";
import {
  useMasterAppointmentsQuery,
  type MasterAppointment,
} from "../../src/entities/appointments/api";
import { CalendarHeader } from "../../src/features/calendar/CalendarHeader";
import { MasterCalendar } from "../../src/features/calendar/MasterCalendar";
import { AppointmentSheet } from "../../src/features/appointments/AppointmentSheet";

const MONTH_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export default function CalendarScreen() {
  const { colors } = useTheme();
  const [view, setView] = useState<"day" | "week">("day");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [openAppt, setOpenAppt] = useState<MasterAppointment | null>(null);

  const weekStart = useMemo(() => {
    const now = new Date();
    const d = new Date(now);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday-based
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const range = useMemo(() => {
    const from = weekStart;
    const to = new Date(from);
    to.setDate(to.getDate() + 7);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  }, [weekStart]);

  const { data } = useMasterAppointmentsQuery({
    from: range.from,
    to: range.to,
    page: 1,
    pageSize: 200,
  });

  const monthLabel = `${MONTH_RU[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
  const selectedDate = new Date(weekStart);
  selectedDate.setDate(weekStart.getDate() + selectedIdx);
  const rangeLabel =
    view === "day"
      ? `${selectedDate.getDate()} ${MONTH_RU[selectedDate.getMonth()].toLowerCase().slice(0, -1)}я`.replace(
          "ья",
          "я",
        )
      : `${weekStart.getDate()} – ${weekStart.getDate() + 6} ${MONTH_RU[weekStart.getMonth()].slice(0, 3).toLowerCase()}`;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <CalendarHeader
          monthLabel={monthLabel}
          rangeLabel={rangeLabel}
          view={view}
          onChangeView={setView}
        />
      </View>
      <MasterCalendar
        mode={view}
        weekStart={weekStart}
        selectedIndex={selectedIdx}
        appointments={data?.items ?? []}
        onSelectDay={setSelectedIdx}
        onSelectAppointment={setOpenAppt}
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
});
