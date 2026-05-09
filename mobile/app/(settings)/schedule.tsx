import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { useTheme } from "../../src/shared/theme/useTheme";
import {
  useMasterScheduleQuery,
  useUpdateMasterScheduleMutation,
  type WorkingHour,
} from "../../src/entities/schedule/api";

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const DEFAULT_HOURS: WorkingHour[] = DAY_NAMES.map((_, i) => ({
  dayOfWeek: i,
  opensAt: i < 5 ? "09:00" : i === 5 ? "10:00" : "00:00",
  closesAt: i < 5 ? "20:00" : i === 5 ? "18:00" : "00:00",
  isClosed: i === 6,
}));

export default function ScheduleSettingsScreen() {
  const { colors } = useTheme();
  const { data, isLoading, isError } = useMasterScheduleQuery();
  const update = useUpdateMasterScheduleMutation();
  const [hours, setHours] = useState<WorkingHour[]>(DEFAULT_HOURS);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (data && data.length > 0 && !initialized) {
      const sorted = [...data].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      setHours(sorted);
      setInitialized(true);
    }
  }, [data, initialized]);

  const updateDay = (index: number, patch: Partial<WorkingHour>) => {
    setHours((prev) =>
      prev.map((h) => (h.dayOfWeek === index ? { ...h, ...patch } : h)),
    );
  };

  const save = () => {
    update.mutate(hours, {
      onSuccess: () => Alert.alert("Сохранено", "Расписание обновлено"),
      onError: () => Alert.alert("Ошибка", "Не удалось сохранить расписание"),
    });
  };

  const inputStyle = (editable: boolean) => [
    styles.timeInput,
    {
      backgroundColor: editable ? colors.surface : `${colors.surface}80`,
      borderColor: editable ? colors.borderInset : colors.borderLight,
      color: editable ? colors.text : colors.muted,
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              Моё расписание
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Личное, не зависит от салона
            </Text>
          </View>
        </View>

        {isLoading ? (
          <Text style={{ color: colors.muted }}>Загрузка...</Text>
        ) : null}
        {isError ? (
          <Text style={{ color: colors.red }}>
            Не удалось загрузить расписание
          </Text>
        ) : null}

        {hours.map((h) => (
          <View
            key={h.dayOfWeek}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
                opacity: h.isClosed ? 0.65 : 1,
              },
            ]}
          >
            <View style={styles.dayRow}>
              <Text style={[styles.dayName, { color: colors.text }]}>
                {DAY_NAMES[h.dayOfWeek]}
              </Text>
              <View style={styles.closedRow}>
                <Text style={[styles.closedLabel, { color: colors.muted }]}>
                  Выходной
                </Text>
                <Switch
                  value={h.isClosed}
                  onValueChange={(val) =>
                    updateDay(h.dayOfWeek, { isClosed: val })
                  }
                  trackColor={{
                    false: colors.borderLight,
                    true: colors.accent,
                  }}
                  thumbColor={colors.accentText}
                />
              </View>
            </View>
            {!h.isClosed && (
              <View style={styles.timeRow}>
                <View style={styles.timeGroup}>
                  <Text style={[styles.timeLabel, { color: colors.muted }]}>
                    С
                  </Text>
                  <TextInput
                    value={h.opensAt}
                    onChangeText={(v) => updateDay(h.dayOfWeek, { opensAt: v })}
                    placeholder="09:00"
                    placeholderTextColor={colors.muted}
                    style={inputStyle(true)}
                    maxLength={5}
                  />
                </View>
                <View style={styles.timeGroup}>
                  <Text style={[styles.timeLabel, { color: colors.muted }]}>
                    По
                  </Text>
                  <TextInput
                    value={h.closesAt}
                    onChangeText={(v) =>
                      updateDay(h.dayOfWeek, { closesAt: v })
                    }
                    placeholder="20:00"
                    placeholderTextColor={colors.muted}
                    style={inputStyle(true)}
                    maxLength={5}
                  />
                </View>
              </View>
            )}
          </View>
        ))}

        <Pressable
          onPress={save}
          disabled={update.isPending}
          style={[
            styles.saveBtn,
            {
              backgroundColor: update.isPending
                ? `${colors.accent}80`
                : colors.accent,
            },
          ]}
        >
          <Text
            style={{
              color: colors.accentText,
              fontSize: 15,
              fontWeight: "600",
            }}
          >
            {update.isPending ? "Сохраняется..." : "Сохранить"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  headerRow: { marginBottom: 4 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayName: { fontSize: 16, fontWeight: "700" },
  closedRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  closedLabel: { fontSize: 13 },
  timeRow: { flexDirection: "row", gap: 16 },
  timeGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeLabel: { fontSize: 13, width: 18 },
  timeInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    width: 72,
    textAlign: "center",
  },
  saveBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: "center",
  },
});
