import React, { useMemo } from "react";
import { View, StyleSheet, Text } from "react-native";
import type { MasterAppointment } from "../../entities/appointments/api";
import { useTheme } from "../../shared/theme/useTheme";
import { DayWeekStrip } from "./DayWeekStrip";
import { WeekOverview } from "./WeekOverview";
import { DayStatsStrip } from "./DayStatsStrip";
import { DayTimelineStrip } from "./DayTimelineStrip";
import { AgendaList } from "./AgendaList";

type Props = {
  mode: "day" | "week";
  weekStart: Date;
  selectedIndex: number;
  appointments: MasterAppointment[]; // already filtered to weekStart..+7d
  onSelectDay: (i: number) => void;
  onSelectAppointment: (a: MasterAppointment) => void;
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);

export function MasterCalendar({
  mode,
  weekStart,
  selectedIndex,
  appointments,
  onSelectDay,
  onSelectAppointment,
}: Props) {
  const { colors, typography } = useTheme();

  const weekDates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart],
  );

  const apptsByDayIdx = useMemo(() => {
    const buckets: MasterAppointment[][] = Array.from({ length: 7 }, () => []);
    appointments.forEach((a) => {
      const d = new Date(a.startsAt);
      for (let i = 0; i < 7; i++) {
        if (d.toDateString() === weekDates[i].toDateString()) {
          buckets[i].push(a);
          break;
        }
      }
    });
    return buckets;
  }, [appointments, weekDates]);

  const dayCounts = apptsByDayIdx.map((arr) => arr.length);

  const dayAppts = apptsByDayIdx[selectedIndex] ?? [];
  const dayRevenueRub = dayAppts.reduce(
    (s, a) => s + a.totalPriceCents / 100,
    0,
  );

  const stats = [
    { label: "Записей", value: String(dayAppts.length) },
    {
      label: "Выручка",
      value: `${(dayRevenueRub / 1000).toFixed(1)}к ₽`,
      accent: true,
    },
    { label: "Свободно", value: "—" }, // TODO: compute from working hours when API exposes
  ];

  if (mode === "week") {
    const weekData = weekDates.map((date, i) => {
      const arr = apptsByDayIdx[i];
      const revenueRub = arr.reduce((s, a) => s + a.totalPriceCents / 100, 0);
      const hourly = HOURS.map((h) => {
        const inHour = arr.filter((a) => new Date(a.startsAt).getHours() === h);
        return {
          count: inHour.length,
          primaryCat: (inHour[0] as any)?.cat ?? null,
        };
      });
      return { date, revenueRub, appointmentCount: arr.length, hourly };
    });

    return (
      <View style={styles.container}>
        <WeekOverview
          days={weekData}
          selectedIndex={selectedIndex}
          onSelect={onSelectDay}
        />
        <DayStatsStrip stats={stats} />
        <Text
          style={[
            styles.divider,
            { color: colors.text, fontFamily: typography.fonts.serif },
          ]}
        >
          {weekDates[selectedIndex].toLocaleDateString("ru-RU", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </Text>
        <DayTimelineStrip
          slots={dayAppts.map((a) => ({
            startsAt: a.startsAt,
            endsAt: a.endsAt,
            cat: (a as any).cat,
          }))}
        />
        <AgendaList
          appointments={dayAppts as any}
          onSelect={onSelectAppointment}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DayWeekStrip
        weekDates={weekDates}
        selectedIndex={selectedIndex}
        countsByIndex={dayCounts}
        onSelect={onSelectDay}
      />
      <DayStatsStrip stats={stats} />
      <DayTimelineStrip
        slots={dayAppts.map((a) => ({
          startsAt: a.startsAt,
          endsAt: a.endsAt,
          cat: (a as any).cat,
        }))}
      />
      <AgendaList
        appointments={dayAppts as any}
        onSelect={onSelectAppointment}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  divider: {
    paddingHorizontal: 16,
    marginBottom: 6,
    fontSize: 16,
    fontWeight: "500",
  },
});
