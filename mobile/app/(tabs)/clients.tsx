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
import { MaterialCommunityIcons } from "@expo/vector-icons";
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

        {/* Summary stats */}
        <View style={styles.summaryRow}>
          {[
            { label: "Всего", value: data.length, color: colors.text },
            {
              label: "VIP",
              value: data.filter((c) => deriveClientSegment(c) === "vip")
                .length,
              color: colors.yellow,
            },
            {
              label: "Новые",
              value: data.filter((c) => deriveClientSegment(c) === "new")
                .length,
              color: colors.accent,
            },
          ].map((s) => (
            <View
              key={s.label}
              style={[
                styles.summaryCell,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <Text
                style={[
                  styles.summaryValue,
                  { color: s.color, fontFamily: typography.fonts.serif },
                ]}
              >
                {s.value}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>
                {s.label}
              </Text>
            </View>
          ))}
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
            const initials = (item.displayName ?? "•")
              .split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();
            const tagCfg =
              segment === "vip"
                ? { label: "VIP", color: colors.yellow, bg: colors.yellowLight }
                : segment === "new"
                  ? {
                      label: "Новый",
                      color: colors.accent,
                      bg: colors.accentLight,
                    }
                  : null;

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
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: colors.accentLight },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: colors.accent }]}>
                    {initials}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.titleLine}>
                    <Text
                      numberOfLines={1}
                      style={[styles.name, { color: colors.text }]}
                    >
                      {item.displayName || "Без имени"}
                    </Text>
                    {tagCfg ? (
                      <View
                        style={[styles.tag, { backgroundColor: tagCfg.bg }]}
                      >
                        <Text
                          style={{
                            color: tagCfg.color,
                            fontSize: 9,
                            fontWeight: "700",
                          }}
                        >
                          {tagCfg.label}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 11, color: colors.muted }}>
                    {visits} визитов{item.phone ? ` · ${item.phone}` : ""}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={14}
                  color={colors.muted}
                />
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
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  summaryCell: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
  },
  summaryValue: { fontSize: 20, fontWeight: "500" },
  summaryLabel: { fontSize: 10 },
  list: {
    flex: 1,
    paddingHorizontal: 18,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 7,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontWeight: "700" },
  titleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  name: { fontSize: 13, fontWeight: "600", flex: 1 },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100 },
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
