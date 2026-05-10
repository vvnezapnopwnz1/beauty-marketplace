import React from "react";
import { ScrollView, View, Text, StyleSheet, SafeAreaView } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAuthStore } from "../../stores/authStore";
import { useMeQuery } from "../../entities/me/api";
import { useTheme } from "../../shared/theme/useTheme";
import { RoleCard, type RoleCardData } from "./RoleCard";

export function LandingScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const { tokenPair } = useAuthStore();
  const { data: me } = useMeQuery();

  const hasMasterCabinet =
    !!(me?.masterProfileId || me?.effectiveRoles?.isMaster);
  const onboardingStep = me?.masterProfileId
    ? (me?.master?.onboardingStep ?? "completed")
    : undefined;

  if (tokenPair?.accessToken && hasMasterCabinet) {
    if (onboardingStep === "completed") {
      return <Redirect href="/(tabs)" />;
    }
    if (onboardingStep && onboardingStep !== "completed") {
      return <Redirect href="/(onboarding)" />;
    }
  }

  const isAuthenticated = !!tokenPair?.accessToken;

  const roles: RoleCardData[] = [
    {
      id: "master",
      title: "Мастер",
      description:
        "Управляйте записями, клиентами и расписанием. Развивайте свою beauty-практику.",
      features: [
        "Календарь записей",
        "База клиентов",
        "Услуги и цены",
        "Аналитика доходов",
      ],
      icon: "scissors",
      gradient: [`${colors.accent}20`, `${colors.accent}08`],
      textColor: colors.text,
      accentColor: colors.accent,
      ctaLabel: isAuthenticated
        ? "Активировать профиль мастера"
        : "Стать мастером",
      onPress: () => {
        if (isAuthenticated) {
          router.push("/(onboarding)");
        } else {
          router.push("/(auth)/login?intent=master");
        }
      },
    },
    {
      id: "salon",
      title: "Салон",
      description:
        "Управляйте сотрудниками, расписанием и финансами вашего бизнеса.",
      features: [
        "Управление сотрудниками",
        "Расписание салона",
        "Финансовая аналитика",
        "Инвентарь услуг",
      ],
      icon: "home",
      gradient: [`${colors.muted}18`, `${colors.muted}06`],
      textColor: colors.text,
      accentColor: colors.muted,
      ctaLabel: "Скоро",
      disabled: true,
      comingSoon: true,
    },
    {
      id: "client",
      title: "Клиент",
      description: "Находите лучших мастеров и салоны, записывайтесь онлайн.",
      features: [
        "Поиск мастеров",
        "Онлайн-запись",
        "Отзывы и рейтинги",
        "Избранное",
      ],
      icon: "search",
      gradient: [`${colors.muted}18`, `${colors.muted}06`],
      textColor: colors.text,
      accentColor: colors.muted,
      ctaLabel: "Скоро",
      disabled: true,
      comingSoon: true,
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text
            style={[
              styles.heroTitle,
              {
                color: colors.text,
                fontFamily: typography.fonts.serif,
              },
            ]}
          >
            Beautica
          </Text>
          <Text style={[styles.heroTagline, { color: colors.textSoft }]}>
            Ваша beauty-платформа для мастеров, салонов и клиентов
          </Text>
        </View>

        <View style={styles.divider}>
          <View
            style={[
              styles.dividerLine,
              { backgroundColor: colors.borderLight },
            ]}
          />
          <Text style={[styles.dividerText, { color: colors.muted }]}>
            ВЫБЕРИТЕ РОЛЬ
          </Text>
          <View
            style={[
              styles.dividerLine,
              { backgroundColor: colors.borderLight },
            ]}
          />
        </View>

        {roles.map((role) => (
          <RoleCard key={role.id} {...role} />
        ))}

        {isAuthenticated && (
          <Text style={[styles.footer, { color: colors.muted }]}>
            Вы вошли как {me?.displayName ?? me?.phone ?? "пользователь"}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  hero: {
    alignItems: "center",
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "400",
    letterSpacing: -1,
    lineHeight: 40,
    marginBottom: 8,
  },
  heroTagline: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  footer: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 12,
  },
});
