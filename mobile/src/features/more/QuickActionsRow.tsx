import React from "react";
import { ScrollView, View, Pressable, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../shared/theme/useTheme";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];
export type QuickAction = { id: string; label: string; icon: IconName; color: string; badge?: number; onPress?: () => void };

export function QuickActionsRow({ items }: { items: QuickAction[] }) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={[styles.eyebrow, { color: colors.muted }]}>РАЗДЕЛЫ</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((qa) => (
          <Pressable key={qa.id} onPress={qa.onPress} style={styles.btn}>
            <View style={[styles.circle, { backgroundColor: `${qa.color}20`, borderColor: `${qa.color}40` }]}>
              <MaterialCommunityIcons name={qa.icon} size={18} color={qa.color} />
              {qa.badge && qa.badge > 0 ? (
                <View style={[styles.badge, { backgroundColor: colors.accent, borderColor: colors.bg }]}>
                  <Text style={styles.badgeTxt}>{qa.badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color: colors.textSoft }]}>{qa.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { fontSize: 10, fontWeight: "600", letterSpacing: 0.7, marginBottom: 8, paddingLeft: 4 },
  row: { gap: 6 },
  btn: { alignItems: "center", gap: 5, paddingVertical: 2 },
  circle: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  badge: { position: "absolute", top: 2, right: 2, width: 14, height: 14, borderRadius: 7, alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  badgeTxt: { color: "#fff", fontSize: 8, fontWeight: "700" },
  label: { fontSize: 9, fontWeight: "500" },
});
