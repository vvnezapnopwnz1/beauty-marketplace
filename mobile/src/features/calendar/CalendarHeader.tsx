import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../shared/theme/useTheme";

type Props = {
  monthLabel: string; // "Апрель 2026"
  rangeLabel: string; // "13 апреля"
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onSearchPress?: () => void;
};

export function CalendarHeader({
  monthLabel,
  rangeLabel,
  onPrevWeek,
  onNextWeek,
  onToday,
  onSearchPress,
}: Props) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.row}>
      <View>
        <Text style={[styles.eyebrow, { color: colors.muted }]}>
          {monthLabel.toUpperCase()}
        </Text>
        <Text
          style={[
            styles.title,
            { color: colors.text, fontFamily: typography.fonts.serif },
          ]}
        >
          {rangeLabel}
        </Text>
      </View>
      <View style={styles.right}>
        <View
          style={[
            styles.nav,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <Pressable onPress={onPrevWeek} style={styles.navBtn} hitSlop={6}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={18}
              color={colors.text}
            />
          </Pressable>
          <Pressable onPress={onToday} style={styles.todayBtn}>
            <Text
              style={{ fontSize: 11, fontWeight: "600", color: colors.accent }}
            >
              Сегодня
            </Text>
          </Pressable>
          <Pressable onPress={onNextWeek} style={styles.navBtn} hitSlop={6}>
            <MaterialCommunityIcons
              name="chevron-right"
              size={18}
              color={colors.text}
            />
          </Pressable>
        </View>
        <Pressable
          onPress={onSearchPress}
          style={[styles.iconBtn, { backgroundColor: colors.accentLight }]}
        >
          <MaterialCommunityIcons
            name="magnify"
            size={16}
            color={colors.accent}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  eyebrow: { fontSize: 10, fontWeight: "600", letterSpacing: 0.8 },
  title: {
    fontSize: 26,
    fontWeight: "500",
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  navBtn: {
    width: 26,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  todayBtn: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 7 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
