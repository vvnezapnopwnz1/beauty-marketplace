import React from "react";
import { Pressable, View, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../shared/theme/useTheme";

type Props = {
  onPress: () => void;
};

export function CenterFabButton({ onPress }: Props) {
  const { colors } = useTheme();
  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Создать"
        style={({ pressed }) => [
          styles.btn,
          {
            backgroundColor: colors.accent,
            shadowColor: colors.accent,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
      >
        <Feather name="plus" size={26} color={colors.accentText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    bottom: Platform.select({ ios: 22, android: 18, default: 18 }),
  },
  btn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 10,
    elevation: 8,
  },
});
