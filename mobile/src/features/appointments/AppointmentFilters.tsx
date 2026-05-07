import React from "react";
import { ScrollView, Pressable, Text, View, StyleSheet } from "react-native";
import { useTheme } from "../../shared/theme/useTheme";

export type FilterId = "all" | "pending" | "confirmed" | "completed";

type Props = {
  active: FilterId;
  onChange: (id: FilterId) => void;
  pendingCount: number;
};

const ITEMS: Array<{ id: FilterId; label: string }> = [
  { id: "all", label: "Все" },
  { id: "pending", label: "Ожидают" },
  { id: "confirmed", label: "Подтв." },
  { id: "completed", label: "Завершены" },
];

export function AppointmentFilters({ active, onChange, pendingCount }: Props) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {ITEMS.map((f) => {
        const isAct = active === f.id;
        return (
          <Pressable
            key={f.id}
            onPress={() => onChange(f.id)}
            style={[
              styles.pill,
              {
                backgroundColor: isAct ? colors.accent : colors.surface,
                borderColor: isAct ? colors.accent : colors.borderLight,
              },
            ]}
          >
            <Text style={{ color: isAct ? colors.accentText : colors.textSoft, fontSize: 12, fontWeight: isAct ? "600" : "400" }}>
              {f.label}
            </Text>
            {f.id === "pending" && pendingCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: isAct ? "rgba(255,255,255,0.3)" : colors.yellow }]}>
                <Text style={styles.badgeTxt}>{pendingCount}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 6, paddingBottom: 12 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 100, borderWidth: 1 },
  badge: { paddingVertical: 1, paddingHorizontal: 5, borderRadius: 100 },
  badgeTxt: { color: "#fff", fontSize: 9, fontWeight: "700" },
});
