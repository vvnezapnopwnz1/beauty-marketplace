import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "../../src/shared/theme/useTheme";
import { useMasterServicesQuery } from "../../src/entities/services/api";

export default function ServicesSettingsScreen() {
  const { colors } = useTheme();
  const { data = [], isLoading, isError } = useMasterServicesQuery();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Услуги</Text>
        {isLoading ? <Text style={[styles.state, { color: colors.muted }]}>Загрузка...</Text> : null}
        {isError ? <Text style={[styles.state, { color: colors.red }]}>Не удалось загрузить услуги</Text> : null}
        {!isLoading && !isError && data.length === 0 ? (
          <Text style={[styles.state, { color: colors.textSoft }]}>Услуги не добавлены</Text>
        ) : null}
        {data.map((service) => (
          <View key={service.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[styles.name, { color: colors.text }]}>{service.name}</Text>
            <Text style={[styles.meta, { color: colors.textSoft }]}>
              {service.durationMinutes} мин ·{" "}
              {service.priceCents == null ? "По запросу" : `${(service.priceCents / 100).toLocaleString("ru-RU")} ₽`}
            </Text>
            <Text style={[styles.meta, { color: colors.textSoft }]}>
              {(service.categorySlug || service.category || "Без категории").toString()}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 10 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  card: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  name: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 13 },
  state: { fontSize: 14 },
});
