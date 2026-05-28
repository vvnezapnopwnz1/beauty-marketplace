import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../shared/theme/useTheme";
import type { MasterClient } from "../../entities/clients/api";
import { formatPhone } from "../../shared/lib/formatPhone";

type Props = {
  client: MasterClient;
  onEdit: () => void;
};

export function ClientDetailsTab({ client, onEdit }: Props) {
  const { colors } = useTheme();

  const lastVisit = client.lastVisitAt
    ? new Date(client.lastVisitAt).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  const rows: Array<{
    icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    label: string;
    value: string;
    accent?: boolean;
  }> = [
    {
      icon: "account-outline",
      label: "Имя",
      value: client.displayName || "—",
    },
    {
      icon: "phone-outline",
      label: "Телефон",
      value: client.phone ? formatPhone(client.phone) : "—",
    },
    {
      icon: "counter",
      label: "Визиты",
      value: String(client.visitCount),
      accent: true,
    },
    {
      icon: "calendar-clock",
      label: "Последний визит",
      value: lastVisit,
    },
    {
      icon: "note-outline",
      label: "Заметка",
      value: client.notes ?? "—",
    },
  ];

  return (
    <View>
      {rows.map((r, i) => (
        <View
          key={r.label}
          style={[
            styles.row,
            i < rows.length - 1 && {
              borderBottomWidth: 1,
              borderBottomColor: colors.borderLight,
            },
          ]}
        >
          <View style={[styles.iconBox, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons
              name={r.icon}
              size={14}
              color={colors.muted}
            />
          </View>
          <Text style={[styles.label, { color: colors.muted }]}>{r.label}</Text>
          <Text
            style={[
              styles.value,
              { color: r.accent ? colors.accent : colors.text },
            ]}
          >
            {r.value}
          </Text>
        </View>
      ))}

      <View style={styles.actions}>
        <Pressable
          onPress={onEdit}
          style={[styles.editBtn, { backgroundColor: colors.accent }]}
        >
          <Text style={[styles.editText, { color: colors.accentText }]}>
            Редактировать клиента
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { flex: 1, fontSize: 12 },
  value: { fontSize: 13, fontWeight: "600" },
  actions: { marginTop: 16, gap: 8 },
  editBtn: { paddingVertical: 13, borderRadius: 100, alignItems: "center" },
  editText: { fontSize: 13, fontWeight: "600" },
});
