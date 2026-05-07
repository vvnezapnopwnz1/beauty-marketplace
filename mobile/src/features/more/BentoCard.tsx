import React from "react";
import { View, ViewStyle, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  gradient: [string, string];
  onPress?: () => void;
  style?: ViewStyle;
  children: React.ReactNode;
};

export function BentoCard({ gradient, onPress, style, children }: Props) {
  const Wrap = onPress ? Pressable : View;
  return (
    <Wrap onPress={onPress} style={[styles.shell, style]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>{children}</View>
    </Wrap>
  );
}

const styles = StyleSheet.create({
  shell: { borderRadius: 20, overflow: "hidden", minHeight: 130, padding: 16 },
  content: { flex: 1 },
});
