import React from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../api/client";
import { DASHBOARD, MASTER } from "../../api/endpoints";
import { useTheme } from "../../shared/theme/useTheme";
import type { MasterAppointment } from "../../entities/appointments/api";
import { isFinalAppointmentStatus } from "../../shared/lib/appointmentStatus";

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
    mutationFn: async (status: MasterAppointment["status"]) => {
      const salonHeaders =
        appointment.salonId != null && appointment.salonId !== ""
          ? { "X-Salon-Id": appointment.salonId }
          : undefined;
      if (salonHeaders) {
        await apiClient.patch(
          DASHBOARD.appointmentStatus(appointment.id),
          { status },
          { headers: salonHeaders },
        );
      } else {
        await apiClient.patch(MASTER.appointmentStatus(appointment.id), {
          status,
        });
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : "Не удалось изменить статус";
      Alert.alert("Ошибка", msg);
    },
  });

  const statusActions: Array<{ status: MasterAppointment["status"]; label: string }> = [
    { status: "pending", label: "В ожидание" },
    { status: "confirmed", label: "Подтвердить" },
    { status: "completed", label: "Завершить" },
    { status: "no_show", label: "Не пришёл" },
    { status: "cancelled_by_client", label: "Отменить клиентом" },
  ];

  const requestStatusChange = (nextStatus: MasterAppointment["status"]) => {
    if (nextStatus === appointment.status || patchStatus.isPending) return;
    const run = () => patchStatus.mutate(nextStatus);
    if (isFinalAppointmentStatus(appointment.status)) {
      Alert.alert("Подтверждение", "Вы уверены, что хотите изменить статус?", [
        { text: "Нет", style: "cancel" },
        { text: "Да", style: "destructive", onPress: run },
      ]);
      return;
    }
    run();
  };

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
        <View style={styles.actionWrap}>
          {statusActions
            .filter((item) => item.status !== appointment.status)
            .map((item) => (
              <Pressable
                key={item.status}
                onPress={() => requestStatusChange(item.status)}
                disabled={patchStatus.isPending}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: item.status.startsWith("cancelled")
                      ? colors.redLight
                      : item.status === "confirmed"
                        ? colors.greenLight
                        : colors.surface,
                    borderColor: item.status.startsWith("cancelled")
                      ? `${colors.red}66`
                      : item.status === "confirmed"
                        ? `${colors.green}66`
                        : colors.borderLight,
                    opacity: patchStatus.isPending ? 0.6 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.actionText,
                    {
                      color: item.status.startsWith("cancelled")
                        ? colors.red
                        : item.status === "confirmed"
                          ? colors.green
                          : colors.text,
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
        </View>
        <Pressable
          onPress={onEdit}
          disabled={isFinalAppointmentStatus(appointment.status)}
          style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
        >
          <Text style={[styles.primaryText, { color: colors.accentText }]}>
            {isFinalAppointmentStatus(appointment.status)
              ? "Редактирование недоступно"
              : "Редактировать запись"}
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
  actionWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
