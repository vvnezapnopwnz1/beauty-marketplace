import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  useFocusEffect,
  useLocalSearchParams,
  usePathname,
  useRouter,
} from "expo-router";
import { useTheme } from "@shared/theme/useTheme";
import { useCreatePersonalAppointmentMutation } from "@entities/appointments/api";
import { useMasterServicesQuery } from "@entities/services/api";
import { PriceEditControl } from "@components/appointments/PriceEditControl";
import { ClientAutocompleteField } from "@components/appointments/ClientAutocompleteField";
import { DatePickerCarousel } from "@components/appointments/DatePickerCarousel";
import { TimeRangeInlinePicker } from "@components/appointments/TimeRangeInlinePicker";
import {
  calculateSelectedServicesTotalCents,
  shouldSendManualTotal,
} from "@shared/lib/appointmentPriceForm";
import { formatPhone, parseOptionalRuPhone } from "@shared/lib/formatPhone";
import {
  useCreateMasterClientMutation,
  type MasterClient,
} from "@entities/clients/api";

function combineDateTime(dateISO: string, timeHHmm: string): Date {
  const [h, m] = timeHHmm.split(":").map(Number);
  const d = new Date(dateISO);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

export default function NewAppointmentScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { returnPath } = useLocalSearchParams<{ returnPath?: string }>();

  const goBack = () => {
    if (returnPath) {
      router.navigate(returnPath as any);
    } else {
      router.back();
    }
  };

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("10:00");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [clientNote, setClientNote] = useState("");
  const [manualPrice, setManualPrice] = useState(false);
  const [totalCents, setTotalCents] = useState<number | null>(null);
  const [selectedClient, setSelectedClient] = useState<MasterClient | null>(
    null,
  );

  useFocusEffect(
    useCallback(() => {
      const todayStr = new Date().toISOString().slice(0, 10);
      setDate(todayStr);
      setTime("10:00");
      setServiceIds([]);
      setGuestName("");
      setGuestPhone("");
      setClientNote("");
      setManualPrice(false);
      setTotalCents(null);
      setSelectedClient(null);
    }, []),
  );

  const { data: services, isLoading: servicesLoading } =
    useMasterServicesQuery();
  const create = useCreatePersonalAppointmentMutation();
  const createClient = useCreateMasterClientMutation();

  const activeServices = (services ?? []).filter((s) => s.isActive !== false);
  const hasServices = activeServices.length > 0;
  const calculatedTotal = useMemo(
    () => calculateSelectedServicesTotalCents(serviceIds, activeServices),
    [serviceIds, activeServices],
  );

  const totalDurationMinutes = useMemo(() => {
    return serviceIds.reduce((sum, id) => {
      const service = (services ?? []).find((s) => s.id === id);
      return sum + (service?.durationMinutes ?? 0);
    }, 0);
  }, [serviceIds, services]);

  const timeEnd = useMemo(() => {
    const [h, m] = time.split(":").map(Number);
    const dateObj = new Date();
    dateObj.setHours(h ?? 10, m ?? 0, 0, 0);
    dateObj.setMinutes(dateObj.getMinutes() + totalDurationMinutes);
    const endH = String(dateObj.getHours()).padStart(2, "0");
    const endM = String(dateObj.getMinutes()).padStart(2, "0");
    return `${endH}:${endM}`;
  }, [time, totalDurationMinutes]);

  const submit = async () => {
    if (!serviceIds.length) {
      Alert.alert("Не выбрана услуга", "Выберите хотя бы одну услугу.");
      return;
    }
    if (!guestName.trim()) {
      Alert.alert(
        "Нет имени клиента",
        "Укажите имя клиента или выберите из списка.",
      );
      return;
    }
    const guestPhoneParsed = parseOptionalRuPhone(guestPhone);
    if (guestPhoneParsed.kind === "invalid") {
      Alert.alert("Некорректный телефон", "Введите корректный номер телефона.");
      return;
    }
    const startsAt = combineDateTime(date, time).toISOString();

    let clientUserId = selectedClient?.userId ?? undefined;
    if (!selectedClient && guestName.trim()) {
      try {
        const created = await createClient.mutateAsync({
          displayName: guestName.trim(),
          ...(guestPhoneParsed.kind === "valid"
            ? { phone: guestPhoneParsed.e164 }
            : {}),
        });
        clientUserId = created.userId ?? undefined;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Не удалось создать клиента";
        Alert.alert("Ошибка", msg);
        return;
      }
    }

    create.mutate(
      {
        serviceIds,
        startsAt,
        guestName: guestName.trim(),
        guestPhone:
          guestPhoneParsed.kind === "valid" ? guestPhoneParsed.e164 : "",
        clientNote: clientNote.trim() || undefined,
        clientUserId,
        totalCents: shouldSendManualTotal({
          manualEnabled: manualPrice,
          valueCents: totalCents,
          initialValueCents: calculatedTotal,
        })
          ? (totalCents ?? undefined)
          : undefined,
      },
      {
        onSuccess: () => goBack(),
        onError: (err) => {
          const msg =
            err instanceof Error ? err.message : "Не удалось создать запись";
          Alert.alert("Ошибка", msg);
        },
      },
    );
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colors.surface,
      borderColor: colors.borderInset,
      color: colors.text,
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => goBack()}
          accessibilityLabel="Назад"
          hitSlop={12}
        >
          <Feather name="chevron-left" size={26} color={colors.text} />
        </Pressable>
        <Text
          style={[
            styles.title,
            { color: colors.text, fontFamily: typography.fonts.serif },
          ]}
        >
          Новая запись
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: colors.muted }]}>УСЛУГА *</Text>
        {servicesLoading ? (
          <Text style={[styles.hint, { color: colors.muted }]}>
            Загрузка услуг...
          </Text>
        ) : !hasServices ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/services-new",
                params: { returnPath: pathname },
              } as any)
            }
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderInset,
              },
            ]}
          >
            <Feather name="scissors" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                У вас ещё нет услуг
              </Text>
              <Text style={[styles.emptySub, { color: colors.muted }]}>
                Чтобы записать клиента, добавьте услугу
              </Text>
            </View>
            <View style={[styles.emptyBtn, { backgroundColor: colors.accent }]}>
              <Text
                style={{
                  color: colors.accentText,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                Добавить
              </Text>
            </View>
          </Pressable>
        ) : (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderInset,
              },
            ]}
          >
            {activeServices.map((s, i) => {
              const checked = serviceIds.includes(s.id);
              return (
                <Pressable
                  key={s.id}
                  onPress={() =>
                    setServiceIds((prev) =>
                      prev.includes(s.id)
                        ? prev.filter((x) => x !== s.id)
                        : [...prev, s.id],
                    )
                  }
                  style={[
                    styles.serviceRow,
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
                      <Feather
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

        <View style={{ marginTop: 14 }}>
          <Text style={[styles.label, { color: colors.muted, marginBottom: 8 }]}>ДАТА И ВРЕМЯ *</Text>
          <DatePickerCarousel selectedDate={date} onDateChange={setDate} />
          <TimeRangeInlinePicker
            timeStart={time}
            onTimeStartChange={setTime}
            timeEnd={timeEnd}
          />
        </View>

        <Text style={[styles.label, { color: colors.muted, marginTop: 14 }]}>
          КЛИЕНТ *
        </Text>
        <ClientAutocompleteField
          value={guestName}
          onChangeText={setGuestName}
          onSelectClient={setSelectedClient}
          phoneValue={guestPhone}
          onPhoneChange={setGuestPhone}
        />
        <TextInput
          value={guestPhone}
          onChangeText={(text) => setGuestPhone(formatPhone(text))}
          placeholder="+7 (___) ___-__-__"
          placeholderTextColor={colors.muted}
          style={[inputStyle, { marginTop: 8 }]}
          keyboardType="phone-pad"
          maxLength={18}
        />

        <Text style={[styles.label, { color: colors.muted, marginTop: 14 }]}>
          КОММЕНТАРИЙ
        </Text>
        <TextInput
          value={clientNote}
          onChangeText={setClientNote}
          placeholder="Заметка к записи..."
          placeholderTextColor={colors.muted}
          multiline
          style={[
            inputStyle,
            { minHeight: 60, paddingTop: 10, textAlignVertical: "top" },
          ]}
        />

        <PriceEditControl
          label="Стоимость"
          editable={hasServices}
          manualEnabled={manualPrice}
          onManualEnabledChange={setManualPrice}
          valueCents={totalCents}
          onValueCentsChange={setTotalCents}
          calculatedCents={calculatedTotal}
        />

        <Pressable
          onPress={submit}
          disabled={create.isPending || createClient.isPending || !hasServices}
          style={[
            styles.submit,
            {
              backgroundColor:
                create.isPending || createClient.isPending || !hasServices
                  ? `${colors.accent}80`
                  : colors.accent,
            },
          ]}
        >
          <Text
            style={{
              color: colors.accentText,
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            {create.isPending || createClient.isPending
              ? "Создаётся..."
              : "Создать запись"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: { fontSize: 18, fontWeight: "500", letterSpacing: -0.2 },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  label: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.6,
    marginTop: 4,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  card: { borderWidth: 1.5, borderRadius: 12, overflow: "hidden" },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  emptyTitle: { fontSize: 13, fontWeight: "600" },
  emptySub: { fontSize: 11, marginTop: 2 },
  emptyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
  },
  submit: {
    marginTop: 22,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: "center",
  },
  hint: { fontSize: 13, paddingVertical: 12, textAlign: "center" },
});
