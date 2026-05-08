import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { useTheme } from "../../shared/theme/useTheme";

export type CalendarMode = "calendar" | "list";

type Props = {
  mode: CalendarMode;
  onChange: (m: CalendarMode) => void;
};

const ITEMS: Array<{ id: CalendarMode; label: string }> = [
  { id: "calendar", label: "Календарь" },
  { id: "list", label: "Список" },
];

export function CalendarViewToggle({ mode, onChange }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      {ITEMS.map((it) => {
        const active = it.id === mode;
        return (
          <Pressable
            key={it.id}
            onPress={() => onChange(it.id)}
            style={[
              styles.seg,
              active && { backgroundColor: colors.bg, borderColor: colors.borderInset },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Режим: ${it.label}`}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: active ? "600" : "400",
                color: active ? colors.text : colors.textSoft,
              }}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 100,
    borderWidth: 1,
    gap: 3,
  },
  seg: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 100,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
});
