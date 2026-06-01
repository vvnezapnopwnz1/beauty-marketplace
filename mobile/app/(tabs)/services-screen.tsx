import React, { useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/shared/theme/useTheme";
import { useMasterServicesQuery } from "../../src/entities/services/api";


export default function ServicesTabScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data = [], isLoading, isError } = useMasterServicesQuery();
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const slugs = Array.from(
      new Set(
        data.map((s) => s.categorySlug ?? s.category ?? null).filter(Boolean),
      ),
    ) as string[];
    return ["all", ...slugs];
  }, [data]);

  const filtered = useMemo(
    () =>
      activeCategory === "all"
        ? data
        : data.filter((s) => (s.categorySlug ?? s.category) === activeCategory),
    [data, activeCategory],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.push("/(tabs)/more")}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Услуги</Text>
        </View>

        {categories.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {categories.map((cat) => {
              const active = activeCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setActiveCategory(cat)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.accent : colors.surface,
                      borderColor: active ? colors.accent : colors.borderLight,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: active ? colors.accentText : colors.text,
                    }}
                  >
                    {cat === "all" ? "Все" : cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {isLoading ? (
          <Text style={[styles.state, { color: colors.muted }]}>
            Загрузка...
          </Text>
        ) : null}
        {isError ? (
          <Text style={[styles.state, { color: colors.red }]}>
            Не удалось загрузить услуги
          </Text>
        ) : null}
        {!isLoading && !isError && filtered.length === 0 ? (
          <Text style={[styles.state, { color: colors.textSoft }]}>
            Услуги не добавлены
          </Text>
        ) : null}

        {filtered.map((service) => (
          <View
            key={service.id}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>
                  {service.name}
                </Text>
                {!service.isActive && (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: `${colors.red}22`,
                        borderColor: `${colors.red}44`,
                      },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: colors.red }]}>
                      Неактивна
                    </Text>
                  </View>
                )}
              </View>
              <Pressable
                onPress={() => router.push(`/services/${service.id}/edit`)}
                hitSlop={8}
                style={styles.editBtn}
              >
                <Feather name="edit-2" size={16} color={colors.muted} />
              </Pressable>
            </View>
            <Text style={[styles.meta, { color: colors.textSoft }]}>
              {service.durationMinutes} мин ·{" "}
              {service.priceCents == null
                ? "По запросу"
                : `${(service.priceCents / 100).toLocaleString("ru-RU")} ₽`}
            </Text>
            <Text style={[styles.meta, { color: colors.textSoft }]}>
              {(
                service.categorySlug ??
                service.category ??
                "Без категории"
              ).toString()}
            </Text>
            {service.description ? (
              <Text
                style={[styles.desc, { color: colors.muted }]}
                numberOfLines={1}
              >
                {service.description}
              </Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 90 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  chips: { gap: 8, paddingBottom: 4 },
  chip: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  name: { fontSize: 16, fontWeight: "700", flex: 1 },
  badge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 3,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  editBtn: { padding: 4 },
  meta: { fontSize: 13 },
  desc: { fontSize: 12, fontStyle: "italic" },
  state: { fontSize: 14 },
});
