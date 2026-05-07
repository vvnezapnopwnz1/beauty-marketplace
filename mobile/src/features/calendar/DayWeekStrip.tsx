import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { useTheme } from "../../shared/theme/useTheme";

const DAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

type Props = {
  weekDates: Date[];        // length 7
  selectedIndex: number;
  countsByIndex: number[];  // appointment counts per day
  onSelect: (index: number) => void;
};

export function DayWeekStrip({ weekDates, selectedIndex, countsByIndex, onSelect }: Props) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.row}>
      {weekDates.map((d, i) => {
        const active = i === selectedIndex;
        const cnt = countsByIndex[i] ?? 0;
        return (
          <Pressable
            key={d.toISOString()}
            onPress={() => onSelect(i)}
            style={[styles.cell, active && { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.dow, { color: active ? "rgba(255,255,255,0.7)" : colors.muted }]}>
              {DAYS_SHORT[i]}
            </Text>
            <Text style={[styles.num, { color: active ? "#fff" : colors.text, fontFamily: typography.fonts.serif }]}>
              {d.getDate()}
            </Text>
            <View style={styles.dots}>
              {Array.from({ length: Math.min(cnt, 4) }).map((_, di) => (
                <View
                  key={di}
                  style={[
                    styles.dot,
                    { backgroundColor: active ? "rgba(255,255,255,0.6)" : colors.accent, opacity: active ? 1 : 0.5 },
                  ]}
                />
              ))}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 4, marginBottom: 12 },
  cell: { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 12 },
  dow: { fontSize: 9, fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase" },
  num: { fontSize: 18, fontWeight: "400" },
  dots: { flexDirection: "row", gap: 2, marginTop: 3, height: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
});
