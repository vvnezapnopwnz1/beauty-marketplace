import React from "react";
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/shared/theme/useTheme";
import { useMeQuery } from "../../src/entities/me/api";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

type Section = {
  label: string;
  items: Array<{ icon: IconName; label: string; sub?: string; href?: string }>;
};

export default function ProfileScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const { data: me } = useMeQuery();

  const initials = (me?.displayName ?? me?.phone ?? "•")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const pendingInvites = me?.effectiveRoles?.pendingInvites ?? 0;

  const stats: Array<{ label: string; value: string; accent?: boolean }> = [
    { label: "Визитов", value: "—" }, // TODO when stats endpoint lands
    { label: "Клиентов", value: "—" },
    { label: "Рейтинг", value: "—", accent: true },
  ];

  const sections: Section[] = [
    {
      label: "МОИ ДАННЫЕ",
      items: [
        {
          icon: "account-outline",
          label: "Личная информация",
          sub: "Имя, фото, контакты",
          href: "/(settings)/profile",
        },
        { icon: "star-outline", label: "Портфолио", sub: "—" },
      ],
    },
    {
      label: "БЕЗОПАСНОСТЬ",
      items: [
        {
          icon: "bell-outline",
          label: "Уведомления",
          sub: "Push и Telegram",
          href: "/(settings)/notifications",
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient
            colors={[`${colors.accent}24`, "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroRow}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: `${colors.accent}22`,
                  borderColor: `${colors.accent}55`,
                },
              ]}
            >
              <Text
                style={[
                  styles.avatarText,
                  { color: colors.accent, fontFamily: typography.fonts.serif },
                ]}
              >
                {initials || "•"}
              </Text>
            </View>
            <View>
              <Text
                style={[
                  styles.name,
                  { color: colors.text, fontFamily: typography.fonts.serif },
                ]}
              >
                {me?.displayName ?? "Профиль"}
              </Text>
              <Text style={[styles.phone, { color: colors.muted }]}>
                {me?.phone ?? ""}
              </Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            {stats.map((s) => (
              <View
                key={s.label}
                style={[
                  styles.statCell,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statValue,
                    {
                      color: s.accent ? colors.yellow : colors.text,
                      fontFamily: typography.fonts.serif,
                    },
                  ]}
                >
                  {s.value}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.body}>
          {pendingInvites > 0 ? (
            <View
              style={[
                styles.invite,
                {
                  backgroundColor: `${colors.accent}14`,
                  borderColor: `${colors.accent}55`,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="home-outline"
                size={18}
                color={colors.accent}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  Приглашение в салон
                </Text>
                <Text style={{ fontSize: 11, color: colors.muted }}>
                  {pendingInvites} ожидает решения
                </Text>
              </View>
              <View
                style={[styles.inviteBadge, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.inviteBadgeText}>{pendingInvites}</Text>
              </View>
            </View>
          ) : null}

          {sections.map((section) => (
            <View key={section.label} style={{ marginBottom: 16 }}>
              <Text style={[styles.sectionLabel, { color: colors.muted }]}>
                {section.label}
              </Text>
              <View
                style={[
                  styles.sectionBody,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                {section.items.map((item, i) => (
                  <Pressable
                    key={item.label}
                    onPress={() => item.href && router.push(item.href as any)}
                    style={[
                      styles.itemRow,
                      i < section.items.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.borderLight,
                      },
                    ]}
                  >
                    <View
                      style={[styles.itemIcon, { backgroundColor: colors.bg }]}
                    >
                      <MaterialCommunityIcons
                        name={item.icon}
                        size={18}
                        color={colors.muted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "500",
                          color: colors.text,
                        }}
                      >
                        {item.label}
                      </Text>
                      {item.sub ? (
                        <Text style={{ fontSize: 11, color: colors.muted }}>
                          {item.sub}
                        </Text>
                      ) : null}
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={14}
                      color={colors.muted}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 80 },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    position: "relative",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarText: { fontSize: 24, fontWeight: "500" },
  name: { fontSize: 22, fontWeight: "500", marginBottom: 1 },
  phone: { fontSize: 12 },
  statsRow: { flexDirection: "row", gap: 8 },
  statCell: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  statValue: { fontSize: 22, fontWeight: "500" },
  statLabel: { fontSize: 9, marginTop: 1 },
  body: { paddingHorizontal: 16, paddingTop: 14 },
  invite: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  inviteBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100 },
  inviteBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sectionBody: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
