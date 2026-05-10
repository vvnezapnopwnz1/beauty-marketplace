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

type Props = {
  appointment: MasterAppointment;
  onEdit: () => void;
  onSaved?: () => void;
};

const ALL_STATUS_ACTIONS: Array<{
  status: MasterAppointment["status"];
  label: string;
}> = [
  { status: "pending", label: "Вернуть в ожидание" },
  { status: "confirmed", label: "Подтвердить" },
  { status: "completed", label: "Завершить" },
  { status: "no_show", label: "Клиент не пришёл" },
  { status: "cancelled_by_client", label: "Отменить клиентом" },
];

const PRIMARY_ACTION: Record<
  MasterAppointment["status"],
  { status: MasterAppointment["status"]; label: string } | undefined
> = {
  pending: { status: "confirmed", label: "Подтвердить запись" },
  confirmed: { status: "completed", label: "Завершить запись" },
  completed: undefined,
  cancelled_by_client: undefined,
  cancelled_by_salon: undefined,
  no_show: undefined,
};

function getOtherActions(current: MasterAppointment["status"]) {
  const primary = PRIMARY_ACTION[current];
  return ALL_STATUS_ACTIONS.filter((a) => {
    if (a.status === current) return false;
    if (a.status === primary?.status) return false;
    return true;
  });
}

export function AppointmentDetailsTab({ appointment, onEdit, onSaved }: Props) {
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      onSaved?.();
    },
    onError: (err) => {
      const msg =
        err instanceof Error ? err.message : "Не удалось изменить статус";
      Alert.alert("Ошибка", msg);
    },
  });

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

  const showOtherActions = () => {
    const actions = getOtherActions(appointment.status);
    if (actions.length === 0) return;
    Alert.alert(
      "Изменить статус",
      undefined,
      [
        ...actions.map((item) => ({
          text: item.label,
          onPress: () => requestStatusChange(item.status),
        })),
        { text: "Отмена", style: "cancel" as const },
      ],
      { cancelable: true },
    );
  };

  const primary = PRIMARY_ACTION[appointment.status];
  const hasOtherActions = getOtherActions(appointment.status).length > 0;
  const canEdit = !isFinalAppointmentStatus(appointment.status);

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
        {primary && (
          <Pressable
            onPress={() => requestStatusChange(primary.status)}
            disabled={patchStatus.isPending}
            style={[
              styles.primaryActionBtn,
              {
                backgroundColor:
                  primary.status === "confirmed" ? colors.green : colors.accent,
                opacity: patchStatus.isPending ? 0.6 : 1,
              },
            ]}
          >
            <Text
              style={[styles.primaryActionText, { color: colors.textInverse }]}
            >
              {primary.label}
            </Text>
          </Pressable>
        )}
        {hasOtherActions && (
          <Pressable
            onPress={showOtherActions}
            disabled={patchStatus.isPending}
            style={styles.linkBtn}
          >
            <Text style={[styles.linkText, { color: colors.muted }]}>
              Другие действия
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={onEdit}
          disabled={!canEdit}
          style={[
            styles.editBtn,
            { backgroundColor: canEdit ? colors.accent : colors.surface },
          ]}
        >
          <Text
            style={[
              styles.editText,
              { color: canEdit ? colors.accentText : colors.muted },
            ]}
          >
            {canEdit ? "Редактировать запись" : "Редактирование недоступно"}
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
  primaryActionBtn: {
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: "center",
  },
  primaryActionText: { fontSize: 14, fontWeight: "600" },
  linkBtn: { paddingVertical: 12, alignItems: "center" },
  linkText: { fontSize: 13, fontWeight: "500" },
  editBtn: { paddingVertical: 13, borderRadius: 100, alignItems: "center" },
  editText: { fontSize: 13, fontWeight: "600" },
});
