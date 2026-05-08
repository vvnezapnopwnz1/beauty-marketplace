import React, { useCallback, useMemo, useState } from "react";
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

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday-based
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function CalendarScreen() {
  const { colors } = useTheme();
  const today = useMemo(() => new Date(), []);
  const todayWeekStart = useMemo(() => startOfWeek(today), [today]);
  const todayIdx = (today.getDay() + 6) % 7;

  const [weekStart, setWeekStart] = useState<Date>(todayWeekStart);
  const [selectedIdx, setSelectedIdx] = useState(todayIdx);
  const [openAppt, setOpenAppt] = useState<MasterAppointment | null>(null);

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

  const shiftWeek = useCallback((deltaDays: number) => {
    setWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + deltaDays);
      return next;
    });
  }, []);

  const onPrevWeek = useCallback(() => shiftWeek(-7), [shiftWeek]);
  const onNextWeek = useCallback(() => shiftWeek(7), [shiftWeek]);
  const onToday = useCallback(() => {
    setWeekStart(todayWeekStart);
    setSelectedIdx(todayIdx);
  }, [todayWeekStart, todayIdx]);

  const selectedDate = new Date(weekStart);
  selectedDate.setDate(weekStart.getDate() + selectedIdx);
  const monthLabel = `${MONTH_RU[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  const rangeLabel =
    `${selectedDate.getDate()} ${MONTH_RU[selectedDate.getMonth()].toLowerCase().slice(0, -1)}я`.replace(
      "ья",
      "я",
    );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <CalendarHeader
          monthLabel={monthLabel}
          rangeLabel={rangeLabel}
          onPrevWeek={onPrevWeek}
          onNextWeek={onNextWeek}
          onToday={onToday}
        />
      </View>
      <MasterCalendar
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
