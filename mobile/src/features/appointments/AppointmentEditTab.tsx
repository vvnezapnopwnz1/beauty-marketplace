import React, { useMemo, useState } from "react";
import {
  Alert,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../api/client";
import { DASHBOARD, MASTER } from "../../api/endpoints";
import { useTheme } from "../../shared/theme/useTheme";
import type { MasterAppointment } from "../../entities/appointments/api";

function fmt(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Parse ₽ input (comma decimal, thin spaces ok) → amount in cents. */
function parseRubToTotalCents(raw: string): number {
  const normalized = raw
    .trim()
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, "")
    .replace(",", ".");
  if (normalized === "" || normalized === "." || normalized === "-") {
    return 0;
  }
  const n = Number(normalized);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.max(0, Math.round(n * 100));
}

type AppointmentPutBody = {
  startsAt: string;
  endsAt: string;
  guestName?: string;
  guestPhone?: string;
  clientNote?: string;
  totalCents: number;
};

const STATUS_OPTS: Array<{ value: string; label: string; dot: string }> = [
  { value: "pending", label: "Ожидает", dot: "#C4800A" },
  { value: "confirmed", label: "Подтверждена", dot: "#2A9E6A" },
  { value: "completed", label: "Завершена", dot: "#4A90D4" },
  { value: "cancelled_staff", label: "Отмена", dot: "#C04040" },
  { value: "no_show", label: "Не пришёл", dot: "#888" },
];

type Props = {
  appointment: MasterAppointment;
  onCancel: () => void;
  onSaved: () => void;
};

export function AppointmentEditTab({ appointment, onCancel, onSaved }: Props) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const start = useMemo(
    () => new Date(appointment.startsAt),
    [appointment.startsAt],
  );
  const end = useMemo(() => new Date(appointment.endsAt), [appointment.endsAt]);

  const [client, setClient] = useState(appointment.clientLabel);
  const [phone, setPhone] = useState(appointment.clientPhone ?? "");
  const [timeStart, setTimeStart] = useState(fmt(start));
  const [timeEnd, setTimeEnd] = useState(fmt(end));
  const [priceRub, setPriceRub] = useState(
    String(Math.round(appointment.totalPriceCents / 100)),
  );
  const [status, setStatus] = useState(appointment.status);
  const [comment, setComment] = useState(appointment.clientNote ?? "");

  const save = useMutation({
    mutationFn: async () => {
      // Re-derive ISO times from existing date + new HH:MM (local)
      const [sh, sm] = timeStart.split(":").map(Number);
      const [eh, em] = timeEnd.split(":").map(Number);
      const startsAt = new Date(start);
      startsAt.setHours(sh ?? 0, sm ?? 0, 0, 0);
      const endsAt = new Date(start);
      endsAt.setHours(eh ?? 0, em ?? 0, 0, 0);

      const totalCents = parseRubToTotalCents(priceRub);
      const trimmedPhone = phone.trim();
      const noteTrim = comment.trim();

      // Dashboard validates guestPhone strictly (E.164). Only send contacts when edited,
      // so changing price/time alone cannot fail validation on unchanged phone format.
      const origLabel = (appointment.clientLabel ?? "").trim();
      const labelTrim = client.trim();
      const origPhone = (appointment.clientPhone ?? "").trim();
      const origNote = (appointment.clientNote ?? "").trim();

      const body: AppointmentPutBody = {
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        totalCents,
      };
      if (labelTrim !== origLabel) {
        body.guestName = labelTrim;
      }
      if (trimmedPhone !== origPhone) {
        body.guestPhone = trimmedPhone;
      }
      if (noteTrim !== origNote) {
        body.clientNote = noteTrim;
      }

      const salonHeaders =
        appointment.salonId != null && appointment.salonId !== ""
          ? { "X-Salon-Id": appointment.salonId }
          : undefined;

      if (salonHeaders) {
        await apiClient.put(DASHBOARD.appointment(appointment.id), body, {
          headers: salonHeaders,
        });
      } else {
        await apiClient.put(MASTER.appointment(appointment.id), body);
      }

      if (status !== appointment.status) {
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
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      onSaved();
    },
    onError: (err) => {
      const msg =
        err instanceof Error ? err.message : "Не удалось сохранить запись";
      Alert.alert("Ошибка сохранения", msg);
    },
  });

  const Field = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>
        {label.toUpperCase()}
      </Text>
      {children}
    </View>
  );

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.surface,
      borderColor: colors.borderInset,
      color: colors.text,
    },
  ];

  return (
    <View>
      <Field label="Клиент">
        <TextInput
          value={client}
          onChangeText={setClient}
          placeholder="Имя клиента"
          placeholderTextColor={colors.muted}
          style={inputStyle}
        />
      </Field>
      <Field label="Телефон">
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="+7 ..."
          placeholderTextColor={colors.muted}
          style={inputStyle}
          keyboardType="phone-pad"
        />
      </Field>
      <Field label="Услуга">
        <View
          style={[
            styles.input,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderInset,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            },
          ]}
        >
          <Text style={{ color: colors.text, fontSize: 13 }}>
            {appointment.serviceName}
          </Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={14}
            color={colors.muted}
          />
        </View>
      </Field>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Время начала">
            <TextInput
              value={timeStart}
              onChangeText={setTimeStart}
              placeholder="10:00"
              placeholderTextColor={colors.muted}
              style={inputStyle}
            />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Время конца">
            <TextInput
              value={timeEnd}
              onChangeText={setTimeEnd}
              placeholder="11:00"
              placeholderTextColor={colors.muted}
              style={inputStyle}
            />
          </Field>
        </View>
      </View>

      <Field label="Стоимость (₽)">
        <TextInput
          value={priceRub}
          onChangeText={setPriceRub}
          placeholder="0"
          placeholderTextColor={colors.muted}
          style={inputStyle}
          keyboardType="numeric"
        />
      </Field>

      <Field label="Статус">
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.borderInset,
            borderWidth: 1.5,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {STATUS_OPTS.map((opt, i) => {
            const active = status === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setStatus(opt.value)}
                style={[
                  styles.statusRow,
                  active && { backgroundColor: `${opt.dot}14` },
                  i > 0 && {
                    borderTopWidth: 1,
                    borderTopColor: colors.borderLight,
                  },
                ]}
              >
                <View
                  style={[styles.statusDot, { backgroundColor: opt.dot }]}
                />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: active ? colors.text : colors.textSoft,
                    fontWeight: active ? "600" : "400",
                  }}
                >
                  {opt.label}
                </Text>
                {active && (
                  <MaterialCommunityIcons
                    name="check"
                    size={14}
                    color={opt.dot}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Комментарий">
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Заметка к записи..."
          placeholderTextColor={colors.muted}
          multiline
          style={[
            inputStyle,
            { minHeight: 56, paddingTop: 10, textAlignVertical: "top" },
          ]}
        />
      </Field>

      <View style={styles.footer}>
        <Pressable
          onPress={onCancel}
          style={[
            styles.btn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <Text
            style={{ color: colors.textSoft, fontSize: 13, fontWeight: "500" }}
          >
            Назад
          </Text>
        </Pressable>
        <Pressable
          onPress={() => save.mutate()}
          disabled={save.isPending}
          style={[
            styles.btn,
            {
              flex: 2,
              backgroundColor: save.isPending
                ? `${colors.accent}80`
                : colors.accent,
            },
          ]}
        >
          <Text
            style={{
              color: colors.accentText,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            {save.isPending ? "Сохранение..." : "Сохранить"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  footer: { flexDirection: "row", gap: 8, marginTop: 4, paddingBottom: 8 },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 100,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
});
