import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../api/client";
import { MASTER } from "../../api/endpoints";
import { useTheme } from "../../shared/theme/useTheme";
import type { MasterAppointment } from "../../entities/appointments/api";

function fmt(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type Props = { appointment: MasterAppointment; onEdit: () => void };

export function AppointmentDetailsTab({ appointment, onEdit }: Props) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const start = new Date(appointment.startsAt);
  const end = new Date(appointment.endsAt);

  const patchStatus = useMutation({
    mutationFn: async (status: string) => {
      await apiClient.patch(MASTER.appointmentStatus(appointment.id), {
        status,
      });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  const rows: Array<{
    icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
    label: string;
    value: string;
    accent?: boolean;
  }> = [
    {
      icon: "account-outline",
      label: "Клиент",
      value: appointment.clientLabel,
    },
    {
      icon: "scissors-cutting",
      label: "Услуга",
      value: appointment.serviceName,
    },
    {
      icon: "calendar-blank-outline",
      label: "Дата",
      value: start.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
    {
      icon: "clock-outline",
      label: "Время",
      value: `${fmt(start)} – ${fmt(end)}`,
    },
    {
      icon: "credit-card-outline",
      label: "Стоимость",
      value: `${(appointment.totalPriceCents / 100).toLocaleString("ru-RU")} ₽`,
      accent: true,
    },
    {
      icon: "note-outline",
      label: "Заметка",
      value: appointment.clientNote ?? "",
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
        {appointment.status === "pending" && (
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => patchStatus.mutate("confirmed")}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.greenLight,
                  borderColor: `${colors.green}66`,
                },
              ]}
            >
              <Text style={[styles.actionText, { color: colors.green }]}>
                ✓ Подтвердить
              </Text>
            </Pressable>
            <Pressable
              onPress={() => patchStatus.mutate("cancelled_staff")}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.redLight,
                  borderColor: `${colors.red}66`,
                },
              ]}
            >
              <Text style={[styles.actionText, { color: colors.red }]}>
                Отменить
              </Text>
            </Pressable>
          </View>
        )}
        {appointment.status === "confirmed" && (
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => patchStatus.mutate("completed")}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.blueLight,
                  borderColor: `${colors.blue}66`,
                },
              ]}
            >
              <Text style={[styles.actionText, { color: colors.blue }]}>
                Завершить
              </Text>
            </Pressable>
            <Pressable
              onPress={() => patchStatus.mutate("no_show")}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.redLight,
                  borderColor: `${colors.red}66`,
                },
              ]}
            >
              <Text style={[styles.actionText, { color: colors.red }]}>
                Не пришёл
              </Text>
            </Pressable>
          </View>
        )}
        <Pressable
          onPress={onEdit}
          style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
        >
          <Text style={[styles.primaryText, { color: colors.accentText }]}>
            Редактировать запись
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
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 100,
    borderWidth: 1.5,
    alignItems: "center",
  },
  actionText: { fontSize: 13, fontWeight: "600" },
  primaryBtn: { paddingVertical: 13, borderRadius: 100, alignItems: "center" },
  primaryText: { fontSize: 13, fontWeight: "600" },
});
