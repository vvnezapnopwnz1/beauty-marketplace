import React, { useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../src/shared/theme/useTheme";
import { useCreateMasterServiceMutation } from "../../src/entities/services/api";
import { useServiceCategories } from "../../src/features/services/useServiceCategories";
import { ServiceCategoryPicker } from "../../src/components/services/ServiceCategoryPicker";

function parsePriceRubToCents(raw: string): number | null {
  const t = raw.trim().replace(/\s+/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function parseDurationMin(raw: string): number {
  const n = parseInt(raw.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function NewServiceScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const { returnPath } = useLocalSearchParams<{ returnPath?: string }>();

  const goBack = () => {
    if (returnPath) {
      router.navigate(returnPath as any);
    } else {
      router.back();
    }
  };

  const [name, setName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [durationStr, setDurationStr] = useState("60");
  const [priceStr, setPriceStr] = useState("");
  const [description, setDescription] = useState("");

  const { filteredGroups, loading: categoriesLoading } = useServiceCategories();
  const create = useCreateMasterServiceMutation();

  const submit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Название обязательно", "Введите название услуги.");
      return;
    }
    if (!categorySlug) {
      Alert.alert("Категория обязательна", "Выберите категорию услуги.");
      return;
    }
    const duration = parseDurationMin(durationStr);
    if (duration <= 0) {
      Alert.alert(
        "Некорректная длительность",
        "Укажите длительность в минутах.",
      );
      return;
    }
    const priceCents = parsePriceRubToCents(priceStr);

    create.mutate(
      {
        name: trimmedName,
        categorySlug,
        durationMinutes: duration,
        priceCents,
        description: description.trim() || null,
      },
      {
        onSuccess: () => goBack(),
        onError: (err) => {
          const msg =
            err instanceof Error ? err.message : "Не удалось создать услугу";
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
          Новая услуга
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.label, { color: colors.muted }]}>НАЗВАНИЕ *</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Маникюр + покрытие"
          placeholderTextColor={colors.muted}
          style={inputStyle}
          autoFocus
        />

        {categoriesLoading ? (
          <Text style={[styles.label, { color: colors.muted, marginTop: 14 }]}>
            Загрузка категорий...
          </Text>
        ) : (
          <ServiceCategoryPicker
            filteredGroups={filteredGroups}
            selectedSlug={categorySlug}
            onSelect={setCategorySlug}
          />
        )}

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.muted }]}>
              ДЛИТЕЛЬНОСТЬ (МИН) *
            </Text>
            <TextInput
              value={durationStr}
              onChangeText={setDurationStr}
              placeholder="60"
              placeholderTextColor={colors.muted}
              style={inputStyle}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.muted }]}>
              ЦЕНА (₽)
            </Text>
            <TextInput
              value={priceStr}
              onChangeText={setPriceStr}
              placeholder="0"
              placeholderTextColor={colors.muted}
              style={inputStyle}
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text style={[styles.label, { color: colors.muted, marginTop: 14 }]}>
          ОПИСАНИЕ
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Что входит в услугу..."
          placeholderTextColor={colors.muted}
          multiline
          style={[
            inputStyle,
            { minHeight: 70, paddingTop: 10, textAlignVertical: "top" },
          ]}
        />

        <Pressable
          onPress={submit}
          disabled={create.isPending}
          style={[
            styles.submit,
            {
              backgroundColor: create.isPending
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
            {create.isPending ? "Создаётся..." : "Создать"}
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
    marginBottom: 5,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  submit: {
    marginTop: 22,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: "center",
  },
});
