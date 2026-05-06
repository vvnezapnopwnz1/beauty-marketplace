import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useTheme } from "../../src/shared/theme/useTheme";
import {
  deriveClientSegment,
  type ClientSegment,
  useMasterClientsQuery,
} from "../../src/entities/clients/api";

const SEGMENTS: Array<{ key: ClientSegment; label: string }> = [
  { key: "all", label: "Все" },
  { key: "regular", label: "Постоянные" },
  { key: "new", label: "Новые" },
  { key: "vip", label: "VIP" },
];

export default function ClientsScreen() {
  const { colors, typography } = useTheme();
  const [activeSegment, setActiveSegment] = useState<ClientSegment>("all");
  const [search, setSearch] = useState("");
  const { data = [], isLoading, isError } = useMasterClientsQuery(search);

  const rows = useMemo(
    () =>
      data.length > 0
        ? data.filter((item) => {
            if (activeSegment === "all") {
              return true;
            }
            return deriveClientSegment(item) === activeSegment;
          })
        : [],
    [activeSegment, data],
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View style={styles.container}>
        <Text
          style={[
            styles.title,
            { color: colors.text, fontFamily: typography.fonts.serif },
          ]}
        >
          Клиенты
        </Text>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Text style={[styles.searchIcon, { color: colors.muted }]}>🔍</Text>
            <TextInput
              placeholder="Поиск по имени или телефону"
              placeholderTextColor={colors.muted}
              style={[styles.searchInput, { color: colors.text }]}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* Categories */}
        <View style={styles.chipsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsContainer}
          >
            {SEGMENTS.map((segment) => {
              const isActive = activeSegment === segment.key;
              return (
                <TouchableOpacity
                  key={segment.key}
                  activeOpacity={0.7}
                  onPress={() => setActiveSegment(segment.key)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive
                        ? colors.accent
                        : colors.surface,
                      borderColor: isActive
                        ? colors.accent
                        : colors.borderLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isActive ? colors.card : colors.textSoft },
                    ]}
                  >
                    {segment.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* List */}
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <Text style={[styles.stateText, { color: colors.muted }]}>
              Загрузка клиентов...
            </Text>
          ) : null}
          {isError ? (
            <Text style={[styles.stateText, { color: colors.red }]}>
              Не удалось загрузить список клиентов
            </Text>
          ) : null}
          {!isLoading && !isError && rows.length === 0 ? (
            <Text style={[styles.stateText, { color: colors.textSoft }]}>
              Клиенты не найдены
            </Text>
          ) : null}
          {rows.map((item) => {
            const visits = item.visitCount ?? item.visitsCount ?? 0;
            const segment = deriveClientSegment(item);
            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <Text style={[styles.name, { color: colors.text }]}>
                  {item.displayName || "Без имени"}
                </Text>
                <Text style={[styles.meta, { color: colors.textSoft }]}>
                  {item.phone || "Телефон не указан"}
                </Text>
                <Text style={[styles.meta, { color: colors.textSoft }]}>
                  Визиты: {visits} · Сегмент: {segment.toUpperCase()}
                </Text>
              </View>
            );
          })}
          <View style={styles.spacer} />
        </ScrollView>
      </View>

      {/* FAB Placeholder */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: colors.accent, shadowColor: colors.accent },
        ]}
        activeOpacity={0.8}
      >
        <Text style={[styles.fabText, { color: colors.card }]}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    paddingHorizontal: 18,
    marginBottom: 16,
  },
  searchContainer: {
    paddingHorizontal: 18,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  chipsWrapper: {
    marginBottom: 16,
  },
  chipsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  list: {
    flex: 1,
    paddingHorizontal: 18,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  meta: {
    fontSize: 13,
  },
  stateText: {
    fontSize: 14,
    marginBottom: 10,
  },
  spacer: {
    height: 80,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 18,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
  fabText: {
    fontSize: 22,
    marginTop: -2,
  },
});
