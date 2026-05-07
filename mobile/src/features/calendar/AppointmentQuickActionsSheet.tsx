import React, { forwardRef, useImperativeHandle, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, Modal, Pressable } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import apiClient from "../../api/client";
import { MASTER } from "../../api/endpoints";
import type { MasterAppointment } from "../../entities/appointments/api";
import { useTheme } from "../../shared/theme/useTheme";

type Props = {
  appointment: MasterAppointment | null;
};

export type AppointmentQuickActionsSheetRef = {
  present: () => void;
  dismiss: () => void;
};

export const AppointmentQuickActionsSheet = forwardRef<AppointmentQuickActionsSheetRef, Props>(
  function AppointmentQuickActionsSheet({ appointment }, ref) {
    const { colors } = useTheme();
    const queryClient = useQueryClient();
    const [visible, setVisible] = useState(false);

    useImperativeHandle(ref, () => ({
      present: () => setVisible(true),
      dismiss: () => setVisible(false),
    }));

    const patchStatus = useMutation({
      mutationFn: async (status: string) => {
        if (!appointment) return;
        await apiClient.patch(MASTER.appointmentStatus(appointment.id), { status });
      },
      onSettled: () => {
        void queryClient.invalidateQueries({ queryKey: ["appointments"] });
      },
    });

    const openTel = () => {
      if (appointment?.clientPhone) {
        void Linking.openURL(`tel:${appointment.clientPhone}`);
      }
    };

    const openSms = () => {
      if (appointment?.clientPhone) {
        void Linking.openURL(`sms:${appointment.clientPhone}`);
      }
    };

    return (
      <Modal transparent animationType="slide" visible={visible} onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)} />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
          <View style={styles.handle} />
          <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>{appointment?.clientLabel ?? "Запись"}</Text>
          <Text style={[styles.subtitle, { color: colors.textSoft }]}>{appointment?.serviceName ?? ""}</Text>

            <TouchableOpacity
            style={[styles.action, { borderColor: colors.borderLight }]}
            onPress={() => {
              patchStatus.mutate("confirmed");
              setVisible(false);
            }}
          >
            <Text style={{ color: colors.text }}>Подтвердить</Text>
          </TouchableOpacity>
            <TouchableOpacity
            style={[styles.action, { borderColor: colors.borderLight }]}
            onPress={() => {
              patchStatus.mutate("completed");
              setVisible(false);
            }}
          >
            <Text style={{ color: colors.text }}>Завершить</Text>
          </TouchableOpacity>
            <TouchableOpacity
            style={[styles.action, { borderColor: colors.borderLight }]}
            onPress={() => {
              patchStatus.mutate("no_show");
              setVisible(false);
            }}
          >
            <Text style={{ color: colors.text }}>Не пришёл</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.action, { borderColor: colors.borderLight }]}
            onPress={() => {
              if (!appointment) return;
              setVisible(false);
              router.push({
                pathname: "/chat/[appointmentId]",
                params: { appointmentId: appointment.id },
              });
            }}
            disabled={!appointment}
          >
            <Text style={{ color: colors.text }}>Чат</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.action, { borderColor: colors.borderLight, opacity: appointment?.clientPhone ? 1 : 0.5 }]}
            onPress={openTel}
            disabled={!appointment?.clientPhone}
          >
            <Text style={{ color: colors.text }}>Позвонить</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.action, { borderColor: colors.borderLight, opacity: appointment?.clientPhone ? 1 : 0.5 }]}
            onPress={openSms}
            disabled={!appointment?.clientPhone}
          >
            <Text style={{ color: colors.text }}>SMS</Text>
          </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: 24,
  },
  handle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: "rgba(127,127,127,0.45)",
  },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 14, marginBottom: 4 },
  action: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
