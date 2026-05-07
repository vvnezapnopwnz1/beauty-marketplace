import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../../shared/theme/useTheme";

type Mode = "master" | "salon";
type Props = { mode: Mode; onChange: (m: Mode) => void };

export function RoleModeToggle({ mode, onChange }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      {(["master", "salon"] as const).map((m) => {
        const active = mode === m;
        return (
          <Pressable
            key={m}
            onPress={() => onChange(m)}
            style={[styles.btn, active && { backgroundColor: colors.accent }]}
          >
            <Text style={{
              fontSize: 11,
              fontWeight: active ? "700" : "400",
              color: active ? colors.accentText : colors.muted,
            }}>
              {m === "master" ? "Мастер" : "Салон"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", padding: 3, borderRadius: 14, borderWidth: 1 },
  btn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 11 },
});
