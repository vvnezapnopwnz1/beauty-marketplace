import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { useMasterServicesQuery } from "../../entities/services/api";
import { isFinalAppointmentStatus } from "../../shared/lib/appointmentStatus";
import { PriceEditControl } from "../../components/appointments/PriceEditControl";
import { DatePickerCarousel } from "../../components/appointments/DatePickerCarousel";
import { TimeRangeInlinePicker } from "../../components/appointments/TimeRangeInlinePicker";
import {
  calculateSelectedServicesTotalCents,
  shouldSendManualTotal,
} from "../../shared/lib/appointmentPriceForm";
import { formatPhone, toRuE164 } from "../../shared/lib/formatPhone";

function fmt(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function sameStringArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const aa = [...a].sort();
  const bb = [...b].sort();
  return aa.every((value, index) => value === bb[index]);
}

type AppointmentPatchBody = {
  startsAt?: string;
  endsAt?: string;
  serviceIds?: string[];
  guestName?: string;
  guestPhone?: string;
  clientNote?: string;
  totalCents?: number;
};

const STATUS_OPTS: Array<{ value: string; label: string; dot: string }> = [
  { value: "pending", label: "Ожидает", dot: "#C4800A" },
  { value: "confirmed", label: "Подтверждена", dot: "#2A9E6A" },
  { value: "completed", label: "Завершена", dot: "#4A90D4" },
  { value: "cancelled_by_client", label: "Отмена клиентом", dot: "#C04040" },
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
  const [phone, setPhone] = useState(
    appointment.clientPhone ? formatPhone(appointment.clientPhone) : "",
  );
  const [timeStart, setTimeStart] = useState(fmt(start));
  const [timeEnd, setTimeEnd] = useState(fmt(end));
  const [date, setDate] = useState(() => {
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, "0");
    const day = String(start.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [manualPrice, setManualPrice] = useState(
    appointment.totalSource === "manual",
  );
  const [totalCents, setTotalCents] = useState<number | null>(
    appointment.totalSource === "manual" ? appointment.totalPriceCents : null,
  );
  const [status, setStatus] = useState<string>(appointment.status);
  const [comment, setComment] = useState(appointment.clientNote ?? "");
  const { data: services } = useMasterServicesQuery();
  const isSalonAppointment = !!appointment.salonId;
  const activeServices = useMemo(
    () => (services ?? []).filter((s) => s.isActive !== false),
    [services],
  );
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    appointment.serviceId ? [appointment.serviceId] : [],
  );

  const totalDurationMinutes = useMemo(() => {
    return selectedServiceIds.reduce((sum, id) => {
      const service = (services ?? []).find((s) => s.id === id);
      return sum + (service?.durationMinutes ?? 0);
    }, 0);
  }, [selectedServiceIds, services]);

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!isEditable) return;
    const [h, m] = timeStart.split(":").map(Number);
    if (h === undefined || m === undefined || isNaN(h) || isNaN(m)) return;
    const dateObj = new Date();
    dateObj.setHours(h, m, 0, 0);
    dateObj.setMinutes(dateObj.getMinutes() + totalDurationMinutes);
    const endH = String(dateObj.getHours()).padStart(2, "0");
    const endM = String(dateObj.getMinutes()).padStart(2, "0");
    setTimeEnd(`${endH}:${endM}`);
  }, [timeStart, totalDurationMinutes, isEditable]);

  const calculatedTotal = useMemo(() => {
    const servicesTotal = calculateSelectedServicesTotalCents(
      selectedServiceIds,
      activeServices,
    );
    return servicesTotal > 0 ? servicesTotal : appointment.totalPriceCents;
  }, [selectedServiceIds, activeServices, appointment.totalPriceCents]);
  const isFinal = isFinalAppointmentStatus(appointment.status);
  const isEditable = !isFinal;
  const statusChanged = status !== appointment.status;

  const save = useMutation({
    mutationFn: async () => {
      // Re-derive ISO times from chosen date + HH:MM (local)
      const [sh, sm] = timeStart.split(":").map(Number);
      const [eh, em] = timeEnd.split(":").map(Number);
      const [dy, dm, dd] = date.split("-").map(Number);
      const startsAt = new Date(dy, dm - 1, dd, sh ?? 0, sm ?? 0, 0, 0);
      const endsAt = new Date(dy, dm - 1, dd, eh ?? 0, em ?? 0, 0, 0);
      if (endsAt.getTime() <= startsAt.getTime()) {
        throw new Error("Время окончания должно быть позже времени начала");
      }

      const trimmedPhone = phone.trim();
      const noteTrim = comment.trim();

      // Dashboard validates guestPhone strictly (E.164). Only send contacts when edited,
      // so changing price/time alone cannot fail validation on unchanged phone format.
      const origLabel = (appointment.clientLabel ?? "").trim();
      const labelTrim = client.trim();
      const origPhone = (appointment.clientPhone ?? "").trim();
      const origNote = (appointment.clientNote ?? "").trim();

      const normalizedPhone = toRuE164(trimmedPhone);
      const normalizedOrigPhone = toRuE164(origPhone);

      const salonHeaders =
        appointment.salonId != null && appointment.salonId !== ""
          ? { "X-Salon-Id": appointment.salonId }
          : undefined;

      if (isEditable) {
        const body: AppointmentPatchBody = {};
        const nextStartsAt = startsAt.toISOString();
        const nextEndsAt = endsAt.toISOString();
        if (nextStartsAt !== appointment.startsAt) {
          body.startsAt = nextStartsAt;
        }
        if (nextEndsAt !== appointment.endsAt) {
          body.endsAt = nextEndsAt;
        }

        const priceUpdate = shouldSendManualTotal({
          manualEnabled: manualPrice,
          valueCents: totalCents,
          initialValueCents: appointment.totalPriceCents,
        });

        if (priceUpdate) {
          body.totalCents = totalCents ?? undefined;
        }

        const initialServiceIds = appointment.serviceId
          ? [appointment.serviceId]
          : [];
        if (
          !isSalonAppointment &&
          !sameStringArray(selectedServiceIds, initialServiceIds)
        ) {
          body.serviceIds = selectedServiceIds;
        }
        if (labelTrim !== origLabel) {
          body.guestName = labelTrim;
        }
        if (normalizedPhone !== normalizedOrigPhone) {
          if (trimmedPhone && !normalizedPhone) {
            throw new Error("Некорректный номер телефона");
          }
          body.guestPhone = normalizedPhone ?? "";
        }
        if (noteTrim !== origNote) {
          body.clientNote = noteTrim;
        }

        if (Object.keys(body).length > 0) {
          if (salonHeaders) {
            await apiClient.patch(DASHBOARD.appointment(appointment.id), body, {
              headers: salonHeaders,
            });
          } else {
            await apiClient.patch(MASTER.appointment(appointment.id), body);
          }
        }
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

  const handleStatusSelect = (nextStatus: string) => {
    if (nextStatus === status) return;
    if (isFinal) {
      Alert.alert(
        "Подтверждение",
        "Вы уверены, что хотите изменить статус?",
        [
          { text: "Нет", style: "cancel" },
          {
            text: "Да",
            style: "destructive",
            onPress: () => setStatus(nextStatus),
          },
        ],
        { cancelable: true },
      );
      return;
    }
    setStatus(nextStatus);
  };

  return (
    <View>
      <Field label="Клиент">
        <TextInput
          value={client}
          onChangeText={setClient}
          editable={isEditable}
          placeholder="Имя клиента"
          placeholderTextColor={colors.muted}
          style={inputStyle}
        />
      </Field>
      <Field label="Телефон">
        <TextInput
          value={phone}
          onChangeText={(text) => setPhone(formatPhone(text))}
          editable={isEditable}
          placeholder="+7 (___) ___-__-__"
          placeholderTextColor={colors.muted}
          style={inputStyle}
          keyboardType="phone-pad"
          maxLength={18}
        />
      </Field>
      <Field label="Услуга">
        {isSalonAppointment ? (
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
              name="lock-outline"
              size={14}
              color={colors.muted}
            />
          </View>
        ) : (
          <View
            style={[
              styles.servicesCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderInset,
              },
            ]}
          >
            {activeServices.map((s, i) => {
              const checked = selectedServiceIds.includes(s.id);
              return (
                <Pressable
                  key={s.id}
                  disabled={!isEditable}
                  onPress={() =>
                    setSelectedServiceIds((prev) =>
                      prev.includes(s.id)
                        ? prev.filter((x) => x !== s.id)
                        : [...prev, s.id],
                    )
                  }
                  style={[
                    styles.serviceRow,
                    !isEditable && { opacity: 0.6 },
                    i > 0 && {
                      borderTopWidth: 1,
                      borderTopColor: colors.borderLight,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: checked
                          ? colors.accent
                          : colors.borderInset,
                        backgroundColor: checked
                          ? colors.accent
                          : "transparent",
                      },
                    ]}
                  >
                    {checked ? (
                      <MaterialCommunityIcons
                        name="check"
                        size={12}
                        color={colors.accentText}
                      />
                    ) : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 13,
                        fontWeight: "500",
                      }}
                    >
                      {s.name}
                    </Text>
                    <Text
                      style={{
                        color: colors.muted,
                        fontSize: 11,
                        marginTop: 2,
                      }}
                    >
                      {s.durationMinutes} мин
                      {s.priceCents != null
                        ? ` · ${Math.round(s.priceCents / 100)} ₽`
                        : ""}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </Field>

      <PriceEditControl
        label="Стоимость"
        editable={isEditable}
        manualEnabled={manualPrice}
        onManualEnabledChange={setManualPrice}
        valueCents={totalCents}
        onValueCentsChange={setTotalCents}
        calculatedCents={calculatedTotal}
      />

      <Field label="Дата записи">
        <DatePickerCarousel
          selectedDate={date}
          onDateChange={setDate}
          disabled={!isEditable}
        />
      </Field>

      <Field label="Время записи">
        <TimeRangeInlinePicker
          timeStart={timeStart}
          onTimeStartChange={setTimeStart}
          timeEnd={timeEnd}
          onTimeEndChange={setTimeEnd}
          disabled={!isEditable}
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
                onPress={() => handleStatusSelect(opt.value)}
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
          editable={isEditable}
          placeholder="Заметка к записи..."
          placeholderTextColor={colors.muted}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
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
          onPress={() => {
            if (!isEditable && !statusChanged) {
              return;
            }
            save.mutate();
          }}
          disabled={save.isPending || (!isEditable && !statusChanged)}
          style={[
            styles.btn,
            {
              flex: 2,
              backgroundColor:
                save.isPending || (!isEditable && !statusChanged)
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
            {save.isPending
              ? "Сохранение..."
              : isEditable
                ? "Сохранить"
                : "Изменить статус"}
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
  servicesCard: { borderWidth: 1.5, borderRadius: 12, overflow: "hidden" },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
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
