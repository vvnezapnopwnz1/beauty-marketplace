import React, { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/shared/theme/useTheme";
import {
  useMasterAppointmentsQuery,
  type MasterAppointment,
} from "../../src/entities/appointments/api";
import { CalendarHeader } from "../../src/features/calendar/CalendarHeader";
import { MasterCalendar } from "../../src/features/calendar/MasterCalendar";
import { AppointmentSheet } from "../../src/features/appointments/AppointmentSheet";
import {
  CalendarViewToggle,
  type CalendarMode,
} from "../../src/features/calendar/CalendarViewToggle";
import {
  AppointmentFilters,
  type FilterId,
} from "../../src/features/appointments/AppointmentFilters";
import { AppointmentListCard } from "../../src/features/appointments/AppointmentListCard";

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
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarScreen() {
  const { colors, typography } = useTheme();
  const today = useMemo(() => new Date(), []);
  const todayWeekStart = useMemo(() => startOfWeek(today), [today]);
  const todayIdx = (today.getDay() + 6) % 7;

  const [mode, setMode] = useState<CalendarMode>("calendar");
  const [weekStart, setWeekStart] = useState<Date>(todayWeekStart);
  const [selectedIdx, setSelectedIdx] = useState(todayIdx);
  const [openAppt, setOpenAppt] = useState<MasterAppointment | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [search, setSearch] = useState("");

  const range = useMemo(() => {
    if (mode === "calendar") {
      const from = weekStart;
      const to = new Date(from);
      to.setDate(to.getDate() + 7);
      return {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      };
    }
    const from = new Date(today);
    from.setMonth(today.getMonth() - 1);
    const to = new Date(today);
    to.setMonth(today.getMonth() + 1);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  }, [mode, weekStart, today]);

  const apiStatus =
    filter === "all" || filter === "today"
      ? ""
      : filter === "cancelled"
        ? "cancelled_by_salon,cancelled_by_client"
        : filter;

  const { data, isLoading, isError } = useMasterAppointmentsQuery({
    from: range.from,
    to: range.to,
    status: apiStatus,
    page: 1,
    pageSize: mode === "calendar" ? 200 : 100,
  });

  const items = data?.items ?? [];

  const visibleItems = useMemo(() => {
    if (mode !== "list") return items;
    let out = items;
    if (filter === "today") {
      out = out.filter((it) => isSameDay(new Date(it.startsAt), today));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (it) =>
          (it.clientLabel ?? "").toLowerCase().includes(q) ||
          (it.clientPhone ?? "").toLowerCase().includes(q),
      );
    }
    return out;
  }, [mode, items, filter, search, today]);

  const pendingCount = items.filter((i) => i.status === "pending").length;

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
  const rangeLabel = `${selectedDate.getDate()} ${MONTH_RU[selectedDate.getMonth()]
    .toLowerCase()
    .slice(0, -1)}я`.replace("ья", "я");

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <View style={styles.toggleWrap}>
          <CalendarViewToggle mode={mode} onChange={setMode} />
        </View>
        {mode === "calendar" ? (
          <CalendarHeader
            monthLabel={monthLabel}
            rangeLabel={rangeLabel}
            onPrevWeek={onPrevWeek}
            onNextWeek={onNextWeek}
            onToday={onToday}
          />
        ) : (
          <>
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
            <View style={{ height: 12 }} />
            <AppointmentFilters
              active={filter}
              onChange={setFilter}
              pendingCount={pendingCount}
              search={search}
              onSearchChange={setSearch}
            />
          </>
        )}
      </View>

      {mode === "calendar" ? (
        <MasterCalendar
          weekStart={weekStart}
          selectedIndex={selectedIdx}
          appointments={items}
          onSelectDay={setSelectedIdx}
          onSelectAppointment={setOpenAppt}
        />
      ) : (
        <>
          {isLoading ? (
            <Text style={[styles.state, { color: colors.muted }]}>
              Загрузка...
            </Text>
          ) : null}
          {isError ? (
            <Text style={[styles.state, { color: colors.red }]}>
              Не удалось загрузить
            </Text>
          ) : null}
          <FlatList
            data={visibleItems}
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
                  {search.trim() || filter !== "all"
                    ? "Нет совпадений"
                    : "Нет записей"}
                </Text>
              ) : null
            }
          />
        </>
      )}

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
  eyebrow: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  title: { fontSize: 26, fontWeight: "500", letterSpacing: -0.4 },
  toggleWrap: { marginBottom: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  state: { textAlign: "center", paddingVertical: 24, fontSize: 13 },
});
