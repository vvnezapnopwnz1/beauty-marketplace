import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "../../shared/theme/useTheme";
import { categoryColor } from "../../shared/theme/categoryColor";

const START_H = 8;
const HOURS_SPAN = 13; // 8..21

type Slot = { startsAt: string; endsAt: string; cat?: string | null };

export function DayTimelineStrip({ slots, now = new Date() }: { slots: Slot[]; now?: Date }) {
  const { colors } = useTheme();
  const minutesFromStart = (now.getHours() - START_H) * 60 + now.getMinutes();
  const totalMin = HOURS_SPAN * 60;
  const nowPct = Math.max(0, Math.min(1, minutesFromStart / totalMin));

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface }]}>
      {slots.map((s, i) => {
        const start = new Date(s.startsAt);
        const end = new Date(s.endsAt);
        const left = ((start.getHours() * 60 + start.getMinutes() - START_H * 60) / totalMin) * 100;
        const width = Math.max(1, ((end.getTime() - start.getTime()) / 60000 / totalMin) * 100);
        return (
          <View
            key={`${s.startsAt}-${i}`}
            style={[
              styles.slot,
              {
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: categoryColor(colors, s.cat ?? null),
              },
            ]}
          />
        );
      })}
      <View style={[styles.now, { left: `${nowPct * 100}%`, backgroundColor: colors.accent }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: "relative", height: 7, borderRadius: 4, marginHorizontal: 16, marginBottom: 10, overflow: "hidden" },
  slot: { position: "absolute", top: 0, bottom: 0, opacity: 0.75, borderRadius: 2 },
  now: { position: "absolute", top: 0, bottom: 0, width: 2, borderRadius: 1, zIndex: 2 },
});
