import React from "react";
import { View, Pressable, Text, StyleSheet, Platform } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../shared/theme/useTheme";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const TAB_META: Record<string, { label: string; icon: IconName }> = {
  calendar: { label: "Календарь", icon: "calendar-month-outline" },
  records: { label: "Записи", icon: "format-list-bulleted-square" },
  clients: { label: "Клиенты", icon: "account-group-outline" },
  profile: { label: "Профиль", icon: "account-outline" },
  more: { label: "Бизнес", icon: "view-grid-outline" },
};

const ORDER = ["calendar", "clients", "profile", "more"] as const;

type Props = BottomTabBarProps & {
  badges?: Partial<Record<(typeof ORDER)[number], number>>;
};

export function FloatingPillTabBar({ state, navigation, badges = {} }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.outer, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: colors.card,
            borderColor: colors.borderLight,
            shadowColor: "#000",
          },
        ]}
      >
        {ORDER.map((name) => {
          const route = state.routes.find((r) => r.name === name);
          if (!route) return null;
          const meta = TAB_META[name];
          const focused = state.routes[state.index]?.name === name;
          const badge = badges[name];

          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={meta.label}
              onPress={() => {
                if (Platform.OS === "ios") void Haptics.selectionAsync();
                navigation.navigate(route.name);
              }}
              style={[
                styles.item,
                focused && {
                  backgroundColor: colors.accentLight,
                  borderColor: colors.accentBorder,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={meta.icon}
                size={22}
                color={focused ? colors.accent : colors.muted}
              />
              <Text
                style={[
                  styles.label,
                  { color: focused ? colors.accent : colors.muted },
                  focused && styles.labelActive,
                ]}
              >
                {meta.label}
              </Text>
              {badge && badge > 0 ? (
                <View style={[styles.badge, { backgroundColor: colors.accent, borderColor: colors.card }]}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.homeIndicatorWrap}>
        <View style={[styles.homeIndicator, { backgroundColor: colors.text }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 4 : 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "transparent",
    position: "relative",
  },
  label: { fontSize: 9, fontWeight: "400", letterSpacing: 0.1 },
  labelActive: { fontWeight: "700" },
  badge: {
    position: "absolute",
    top: 5,
    right: "18%",
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 8, fontWeight: "700", color: "#fff" },
  homeIndicatorWrap: { alignItems: "center", marginTop: 6 },
  homeIndicator: { width: 120, height: 4, borderRadius: 2, opacity: 0.2 },
});
