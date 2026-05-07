import React from "react";
import { View, StyleSheet } from "react-native";

type Props = { left: React.ReactNode; right: React.ReactNode; leftFlex?: number; rightFlex?: number };

export function BentoRow({ left, right, leftFlex = 1.55, rightFlex = 1 }: Props) {
  return (
    <View style={styles.row}>
      <View style={{ flex: leftFlex }}>{left}</View>
      <View style={{ flex: rightFlex }}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: "row", gap: 10 } });
