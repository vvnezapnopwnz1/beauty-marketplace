import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../shared/theme/useTheme";

type Stat = { label: string; value: string; accent?: boolean };

export function DayStatsStrip({ stats }: { stats: Stat[] }) {
  const { colors, typography } = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      {stats.map((s, i) => (
        <View
          key={s.label}
          style={[
            styles.cell,
            i < stats.length - 1 && { borderRightWidth: 1, borderRightColor: colors.borderLight },
          ]}
        >
          <Text style={[
            styles.value,
            { color: s.accent ? colors.accent : colors.text, fontFamily: typography.fonts.serif },
          ]}>
            {s.value}
          </Text>
          <Text style={[styles.label, { color: colors.muted }]}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: "row", borderWidth: 1, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 14, marginHorizontal: 16, marginBottom: 10 },
  cell: { flex: 1, alignItems: "center" },
  value: { fontSize: 17, fontWeight: "500" },
  label: { fontSize: 9, marginTop: 1 },
});
