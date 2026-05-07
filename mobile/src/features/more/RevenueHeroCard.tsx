import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../shared/theme/useTheme";

type Props = {
  label: string;       // "Выручка · Апрель"
  amountRub: number;   // 48200
  weekly: number[];    // 7 numbers
};

export function RevenueHeroCard({ label, amountRub, weekly }: Props) {
  const { colors, typography } = useTheme();
  const max = Math.max(1, ...weekly);
  return (
    <View style={styles.card}>
      <LinearGradient colors={["#1a1830", "#0e0c1e"]} style={StyleSheet.absoluteFill} />
      <View style={[styles.deco, { backgroundColor: `${colors.accent}24`, top: -28, right: -28, width: 110, height: 110 }]} />
      <View style={[styles.deco, { backgroundColor: `${colors.nails}1A`, bottom: -18, right: 30, width: 64, height: 64 }]} />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>{label.toUpperCase()}</Text>
        <Text style={[styles.amount, { fontFamily: typography.fonts.serif }]}>
          {amountRub.toLocaleString("ru-RU")} <Text style={styles.amountUnit}>₽</Text>
        </Text>
        <View style={styles.bars}>
          {weekly.map((v, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: (v / max) * 28,
                  backgroundColor: i === weekly.length - 1 ? colors.accent : "rgba(255,255,255,0.25)",
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.weekRow}>
          <Text style={styles.weekDow}>Пн</Text>
          <Text style={styles.weekDow}>Вс</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, overflow: "hidden", padding: 18, minHeight: 130, position: "relative" },
  deco: { position: "absolute", borderRadius: 9999 },
  content: { position: "relative", zIndex: 1 },
  eyebrow: { fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: "600", letterSpacing: 0.8, marginBottom: 4 },
  amount: { fontSize: 36, fontWeight: "500", color: "#fff", letterSpacing: -1, lineHeight: 36, marginBottom: 12 },
  amountUnit: { fontSize: 18, fontWeight: "300", opacity: 0.7 },
  bars: { flexDirection: "row", alignItems: "flex-end", gap: 3, height: 28 },
  bar: { flex: 1, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  weekRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  weekDow: { fontSize: 9, color: "rgba(255,255,255,0.4)" },
});
