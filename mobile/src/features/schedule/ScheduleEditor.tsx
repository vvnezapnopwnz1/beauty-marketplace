import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useTheme } from "../../shared/theme/useTheme";
import {
  useMasterScheduleQuery,
  useUpdateMasterScheduleMutation,
  type WorkingHour,
} from "../../entities/schedule/api";
import Ionicons from "@expo/vector-icons/build/Ionicons";
import { useRouter } from "expo-router";


const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const TIME_PRESETS = [
  { label: "09:00 - 18:00", open: "09:00", close: "18:00" },
  { label: "09:00 - 20:00", open: "09:00", close: "20:00" },
  { label: "10:00 - 19:00", open: "10:00", close: "19:00" },
  { label: "10:00 - 21:00", open: "10:00", close: "21:00" },
];

const DEFAULT_HOURS: WorkingHour[] = DAY_NAMES.map((_, i) => ({
  dayOfWeek: i,
  opensAt: i < 5 ? "09:00" : i === 5 ? "10:00" : "00:00",
  closesAt: i < 5 ? "20:00" : i === 5 ? "18:00" : "00:00",
  isClosed: i === 6,
}));

function isTimeValid(t: string): boolean {
  return /^\d{2}:\d{2}$/.test(t);
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

type ScheduleEditorProps = {
  showHeader?: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
};

export function ScheduleEditor({
  showHeader = true,
  headerTitle = "Моё расписание",
  headerSubtitle = "Личное, не зависит от салона",
}: ScheduleEditorProps) {
  const { colors } = useTheme();
    const router = useRouter();
  const { data, isLoading, isError } = useMasterScheduleQuery();
  const updateMutation = useUpdateMasterScheduleMutation();

  // Режим работы: 'mass' (одинаковое время) или 'individual' (каждый день отдельно)
  const [mode, setMode] = useState<"mass" | "individual">("mass");

  // Состояние для массового редактирования
  const [massDays, setMassDays] = useState<number[]>([0, 1, 2, 3, 4]); // Пн - Пт активны
  const [massOpensAt, setMassOpensAt] = useState("09:00");
  const [massClosesAt, setMassClosesAt] = useState("20:00");

  // Состояние индивидуального расписания (конечная правда для API)
  const [hours, setHours] = useState<WorkingHour[]>(DEFAULT_HOURS);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Инициализация при первой загрузке из бэкенда
  useEffect(() => {
    if (data && data.length > 0 && !initialized) {
      const sorted = [...data].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      setHours(sorted);

      // Пробуем угадать, одинаковое ли расписание у активных дней, чтобы выбрать стартовый режим
      const activeDays = sorted.filter((d) => !d.isClosed);
      if (activeDays.length > 0) {
        const firstOpen = activeDays[0].opensAt;
        const firstClose = activeDays[0].closesAt;
        const allSame = activeDays.every(
          (d) => d.opensAt === firstOpen && d.closesAt === firstClose,
        );
        if (allSame) {
          setMassOpensAt(firstOpen);
          setMassClosesAt(firstClose);
          setMassDays(activeDays.map((d) => d.dayOfWeek));
          setMode("mass");
        } else {
          setMode("individual");
        }
      }
      setInitialized(true);
    }
  }, [data, initialized]);

  // При изменении массовых параметров синхронизируем с основным массивом hours
  useEffect(() => {
    if (mode === "mass") {
      setHours((prev) =>
        prev.map((h) => {
          const isActive = massDays.includes(h.dayOfWeek);
          return {
            ...h,
            isClosed: !isActive,
            opensAt: isActive ? massOpensAt : "00:00",
            closesAt: isActive ? massClosesAt : "00:00",
          };
        }),
      );
    }
  }, [mode, massDays, massOpensAt, massClosesAt]);

  const toggleMassDay = (idx: number) => {
    setMassDays((prev) =>
      prev.includes(idx)
        ? prev.filter((d) => d !== idx)
        : [...prev, idx].sort(),
    );
  };

  const updateIndividualDay = (
    dayOfWeek: number,
    patch: Partial<WorkingHour>,
  ) => {
    setHours((prev) =>
      prev.map((h) => (h.dayOfWeek === dayOfWeek ? { ...h, ...patch } : h)),
    );
  };

  const applyPreset = (open: string, close: string) => {
    setMassOpensAt(open);
    setMassClosesAt(close);
  };

  const validate = (): string | null => {
    for (const h of hours) {
      if (h.isClosed) continue;
      if (!isTimeValid(h.opensAt) || !isTimeValid(h.closesAt)) {
        return `Введите время в формате ЧЧ:ММ для дня: ${DAY_NAMES[h.dayOfWeek]}`;
      }
      if (timeToMinutes(h.opensAt) >= timeToMinutes(h.closesAt)) {
        return `Время начала должно быть раньше окончания для дня: ${DAY_NAMES[h.dayOfWeek]}`;
      }
    }
    return null;
  };

  const save = async () => {
    const valError = validate();
    if (valError) {
      setError(valError);
      Alert.alert("Ошибка валидации", valError);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await updateMutation.mutateAsync(hours);
      Alert.alert("Сохранено", "Расписание успешно обновлено");
    } catch (err: any) {
      console.error("Schedule update error details:", err);
      const msg = err?.message || "Попробуйте ещё раз.";
      setError(`Не удалось сохранить расписание: ${msg}`);
      Alert.alert("Ошибка", `Не удалось сохранить расписание: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = (editable: boolean) => [
    styles.timeInput,
    {
      backgroundColor: editable ? colors.surface : `${colors.surface}80`,
      borderColor: editable ? colors.border : colors.borderLight,
      color: editable ? colors.text : colors.muted,
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {showHeader && (
        <View style={styles.headerRow}>
          <View>
            <View  style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable onPress={() => router.push("/(tabs)/more")}>
              <Ionicons name="arrow-back" size={24} color="black" />
            </Pressable>
            <Text style={[styles.title, { color: colors.text }]}>
              {headerTitle}
            </Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {headerSubtitle}
            </Text>
          </View>
        </View>
      )}

      {isLoading && !initialized ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : isError ? (
        <Text style={[styles.errorText, { color: colors.red }]}>
          Не удалось загрузить данные. Попробуйте позже.
        </Text>
      ) : (
        <View style={styles.container}>
          {error && (
            <Text
              style={[styles.errorText, { color: colors.red, marginBottom: 8 }]}
            >
              {error}
            </Text>
          )}

          {/* Переключатель режимов */}
          <View
            style={[
              styles.switcherContainer,
              { backgroundColor: colors.borderLight },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.switcherBtn,
                mode === "mass" && { backgroundColor: colors.surface },
              ]}
              onPress={() => setMode("mass")}
            >
              <Text
                style={[
                  styles.switcherText,
                  {
                    color: mode === "mass" ? colors.text : colors.textSoft,
                    fontWeight: mode === "mass" ? "700" : "500",
                  },
                ]}
              >
                Одинаково везде
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.switcherBtn,
                mode === "individual" && { backgroundColor: colors.surface },
              ]}
              onPress={() => setMode("individual")}
            >
              <Text
                style={[
                  styles.switcherText,
                  {
                    color:
                      mode === "individual" ? colors.text : colors.textSoft,
                    fontWeight: mode === "individual" ? "700" : "500",
                  },
                ]}
              >
                По дням недели
              </Text>
            </TouchableOpacity>
          </View>

          {/* 1. РЕЖИМ МАССОВОГО РЕДАКТИРОВАНИЯ */}
          {mode === "mass" && (
            <View style={styles.massSection}>
              {/* Капсулы выбора дней */}
              <Text style={[styles.sectionLabel, { color: colors.textSoft }]}>
                Выберите рабочие дни недели:
              </Text>
              <View style={styles.daysRow}>
                {DAY_NAMES.map((day, idx) => {
                  const isActive = massDays.includes(idx);
                  return (
                    <TouchableOpacity
                      key={day}
                      onPress={() => toggleMassDay(idx)}
                      style={[
                        styles.dayCapsule,
                        {
                          backgroundColor: isActive
                            ? colors.accent
                            : colors.surface,
                          borderColor: isActive ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayCapsuleText,
                          {
                            color: isActive
                              ? colors.textInverse
                              : colors.textSoft,
                            fontWeight: isActive ? "700" : "500",
                          },
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Управление временем для выбранных дней */}
              {massDays.length > 0 ? (
                <View style={styles.timeControlBox}>
                  <Text
                    style={[styles.sectionLabel, { color: colors.textSoft }]}
                  >
                    Рабочие часы:
                  </Text>

                  <View style={styles.timeRow}>
                    <View style={styles.timeGroup}>
                      <TextInput
                        value={massOpensAt}
                        onChangeText={setMassOpensAt}
                        placeholder="09:00"
                        placeholderTextColor={colors.muted}
                        style={inputStyle(true)}
                        maxLength={5}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    <Text
                      style={[styles.timeLabel, { color: colors.textSoft }]}
                    >
                      -
                    </Text>
                    <View style={styles.timeGroup}>
                      <TextInput
                        value={massClosesAt}
                        onChangeText={setMassClosesAt}
                        placeholder="20:00"
                        placeholderTextColor={colors.muted}
                        style={inputStyle(true)}
                        maxLength={5}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                  </View>

                  {/* Быстрые пресеты времени */}
                  <Text
                    style={[styles.presetsLabel, { color: colors.textSoft }]}
                  >
                    💡 Быстрые пресеты:
                  </Text>
                  <View style={styles.presetsGrid}>
                    {TIME_PRESETS.map((preset) => (
                      <TouchableOpacity
                        key={preset.label}
                        onPress={() => applyPreset(preset.open, preset.close)}
                        style={[
                          styles.presetBadge,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            borderWidth:
                              massOpensAt === preset.open &&
                              massClosesAt === preset.close
                                ? 1.5
                                : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.presetText, { color: colors.accent }]}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                <View
                  style={[styles.emptyBox, { backgroundColor: colors.surface }]}
                >
                  <Text style={{ color: colors.muted, textAlign: "center" }}>
                    Все дни недели выбраны как выходные. Выберите хотя бы один
                    день!
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* 2. ИНДИВИДУАЛЬНЫЙ РЕЖИМ (ПОЛНЫЙ СПИСОК) */}
          {mode === "individual" && (
            <View style={styles.individualList}>
              {hours.map((h) => (
                <View
                  key={h.dayOfWeek}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      opacity: h.isClosed ? 0.65 : 1,
                    },
                  ]}
                >
                  <View style={styles.dayRow}>
                    <Text
                      style={[
                        styles.dayName,
                        { color: colors.text, marginLeft: 20 },
                      ]}
                    >
                      {DAY_NAMES[h.dayOfWeek]}
                    </Text>

                    {!h.isClosed && (
                      <View style={styles.timeRow}>
                        <View style={styles.timeGroup}>
                          <TextInput
                            value={h.opensAt}
                            onChangeText={(v) =>
                              updateIndividualDay(h.dayOfWeek, { opensAt: v })
                            }
                            placeholder="09:00"
                            placeholderTextColor={colors.muted}
                            style={inputStyle(true)}
                            maxLength={5}
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                        </View>
                        <View style={styles.timeGroup}>
                          <TextInput
                            value={h.closesAt}
                            onChangeText={(v) =>
                              updateIndividualDay(h.dayOfWeek, { closesAt: v })
                            }
                            placeholder="20:00"
                            placeholderTextColor={colors.muted}
                            style={inputStyle(true)}
                            maxLength={5}
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                        </View>
                      </View>
                    )}
                    <View style={styles.closedRow}>
                      <Text
                        style={[styles.closedLabel, { color: colors.textSoft }]}
                      >
                        Вых.
                      </Text>
                      <Switch
                        value={h.isClosed}
                        onValueChange={(val) =>
                          updateIndividualDay(h.dayOfWeek, { isClosed: val })
                        }
                        trackColor={{
                          false: colors.borderLight,
                          true: colors.accent,
                        }}
                        thumbColor={colors.textInverse}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Кнопка сохранения изменений */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.accent },
              mode === "mass" && massDays.length === 0 && { opacity: 0.5 },
            ]}
            onPress={save}
            disabled={busy || (mode === "mass" && massDays.length === 0)}
          >
            {busy ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.textInverse }]}>
                Сохранить
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, gap: 16, paddingBottom: 40 },
  headerRow: { marginBottom: 4 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  loader: {
    marginVertical: 32,
  },
  container: {
    gap: 16,
  },
  switcherContainer: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
    marginBottom: 8,
  },
  switcherBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  switcherText: {
    fontSize: 14,
  },
  massSection: {
    gap: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  dayCapsule: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 99,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCapsuleText: {
    fontSize: 13,
  },
  timeControlBox: {
    gap: 12,
    marginTop: 8,
  },
  presetsLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
  presetsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  presetBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyBox: {
    padding: 24,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  individualList: {
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 2,
    gap: 2,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayName: {
    fontSize: 16,
    fontWeight: "600",
  },
  closedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  closedLabel: {
    fontSize: 13,
  },
  timeRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    marginTop: 4,
  },
  timeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeLabel: {
    fontSize: 13,
    width: 16,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    width: 72,
    textAlign: "center",
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  button: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
