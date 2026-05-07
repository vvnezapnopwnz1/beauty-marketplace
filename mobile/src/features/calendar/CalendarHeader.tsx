import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../shared/theme/useTheme";

type Props = {
  monthLabel: string;        // "Апрель 2026"
  rangeLabel: string;        // "13 апреля" or "13 – 19 апр"
  view: "day" | "week";
  onChangeView: (v: "day" | "week") => void;
  onSearchPress?: () => void;
};

export function CalendarHeader({ monthLabel, rangeLabel, view, onChangeView, onSearchPress }: Props) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.row}>
      <View>
        <Text style={[styles.eyebrow, { color: colors.muted }]}>{monthLabel.toUpperCase()}</Text>
        <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.serif }]}>{rangeLabel}</Text>
      </View>
      <View style={styles.right}>
        <View style={[styles.toggle, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          {(["day", "week"] as const).map((v) => {
            const active = view === v;
            return (
              <Pressable
                key={v}
                onPress={() => onChangeView(v)}
                style={[
                  styles.toggleBtn,
                  active && { backgroundColor: colors.card, borderColor: colors.borderLight },
                ]}
              >
                <Text style={{
                  fontSize: 11,
                  fontWeight: active ? "600" : "400",
                  color: active ? colors.accent : colors.muted,
                }}>
                  {v === "day" ? "День" : "Нед"}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={onSearchPress}
          style={[styles.iconBtn, { backgroundColor: colors.accentLight }]}
        >
          <MaterialCommunityIcons name="magnify" size={16} color={colors.accent} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  eyebrow: { fontSize: 10, fontWeight: "600", letterSpacing: 0.8 },
  title: { fontSize: 26, fontWeight: "500", letterSpacing: -0.5, lineHeight: 28 },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  toggle: { flexDirection: "row", padding: 3, borderRadius: 10, borderWidth: 1 },
  toggleBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 7, borderWidth: 1, borderColor: "transparent" },
  iconBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
