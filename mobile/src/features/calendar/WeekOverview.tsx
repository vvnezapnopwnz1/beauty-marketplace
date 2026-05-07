import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { useTheme } from "../../shared/theme/useTheme";
import { categoryColor } from "../../shared/theme/categoryColor";

const DAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8..20

type DayData = {
  date: Date;
  revenueRub: number;
  appointmentCount: number;
  /** length === HOURS.length; each entry = { count, primaryCat } */
  hourly: Array<{ count: number; primaryCat?: string | null }>;
};

type Props = {
  days: DayData[];          // length 7
  selectedIndex: number;
  onSelect: (i: number) => void;
};

export function WeekOverview({ days, selectedIndex, onSelect }: Props) {
  const { colors, typography } = useTheme();
  const maxRev = Math.max(1, ...days.map((d) => d.revenueRub));

  return (
    <View style={{ marginBottom: 12 }}>
      <View style={styles.cardRow}>
        {days.map((d, i) => {
          const active = i === selectedIndex;
          const revPct = d.revenueRub / maxRev;
          return (
            <Pressable
              key={d.date.toISOString()}
              onPress={() => onSelect(i)}
              style={[
                styles.card,
                {
                  backgroundColor: active ? colors.accentLight : colors.surface,
                  borderColor: active ? colors.accent : colors.borderLight,
                },
              ]}
            >
              <Text style={[styles.dow, { color: active ? colors.accent : colors.muted }]}>
                {DAYS_SHORT[i]}
              </Text>
              <Text style={[styles.dayNum, {
                color: active ? colors.accent : colors.text,
                fontFamily: typography.fonts.serif,
              }]}>
                {d.date.getDate()}
              </Text>
              <View style={styles.barWrap}>
                <View style={[styles.bar, {
                  height: Math.max(2, revPct * 20),
                  backgroundColor: active ? colors.accent : colors.accentLight,
                }]} />
              </View>
              <Text style={[styles.cnt, { color: active ? colors.accent : colors.muted }]}>
                {d.appointmentCount}зап
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.heatLabel, { color: colors.muted }]}>ЗАГРУЖЕННОСТЬ ПО ЧАСАМ</Text>
      <View style={styles.heatRow}>
        {days.map((d, di) => {
          const active = di === selectedIndex;
          return (
            <Pressable key={`hm-${di}`} onPress={() => onSelect(di)} style={styles.heatCol}>
              {d.hourly.map((cell, hi) => {
                const c = cell.count > 0
                  ? (active ? colors.accent : categoryColor(colors, cell.primaryCat ?? null))
                  : colors.surface;
                const opacity = cell.count > 0 ? Math.min(1, 0.4 + cell.count * 0.3) : 0.3;
                return (
                  <View
                    key={`h-${HOURS[hi]}`}
                    style={[styles.heatCell, { backgroundColor: c, opacity }]}
                  />
                );
              })}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardRow: { flexDirection: "row", gap: 4, marginBottom: 8 },
  card: {
    flex: 1, alignItems: "center", borderWidth: 1.5, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 4,
  },
  dow: { fontSize: 9, fontWeight: "600", letterSpacing: 0.3, textTransform: "uppercase" },
  dayNum: { fontSize: 16, fontWeight: "400", lineHeight: 16 },
  barWrap: { width: "80%", height: 20, justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: 2 },
  cnt: { fontSize: 8 },
  heatLabel: { fontSize: 9, fontWeight: "600", letterSpacing: 0.6, marginBottom: 5 },
  heatRow: { flexDirection: "row", gap: 4 },
  heatCol: { flex: 1, gap: 1 },
  heatCell: { height: 4, borderRadius: 2 },
});
