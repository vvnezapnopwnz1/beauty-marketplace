import React from "react";
import { ScrollView, Pressable, Text, TextInput, View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../shared/theme/useTheme";

export type FilterId =
  | "all"
  | "today"
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

type Props = {
  active: FilterId;
  onChange: (id: FilterId) => void;
  pendingCount: number;
  search?: string;
  onSearchChange?: (v: string) => void;
};

const ITEMS: Array<{ id: FilterId; label: string }> = [
  { id: "all", label: "Все" },
  { id: "today", label: "Сегодня" },
  { id: "pending", label: "Ожидают" },
  { id: "confirmed", label: "Подтв." },
  { id: "completed", label: "Завершены" },
  { id: "cancelled", label: "Отменены" },
];

export function AppointmentFilters({ active, onChange, pendingCount, search, onSearchChange }: Props) {
  const { colors } = useTheme();
  return (
    <View>
      {onSearchChange ? (
        <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Feather name="search" size={14} color={colors.muted} />
          <TextInput
            value={search ?? ""}
            onChangeText={onSearchChange}
            placeholder="Поиск по клиенту"
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.text }]}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      ) : null}
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
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 6, paddingBottom: 12 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 100, borderWidth: 1 },
  badge: { paddingVertical: 1, paddingHorizontal: 5, borderRadius: 100 },
  badgeTxt: { color: "#fff", fontSize: 9, fontWeight: "700" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, borderWidth: 1, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 13, paddingVertical: 0 },
});
