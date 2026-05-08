import React, { useState } from "react";
import { ScrollView, View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "../../shared/theme/useTheme";
import { useTodayQuery } from "../../entities/today/api";
import { useMeQuery } from "../../entities/me/api";
import { RoleModeToggle } from "./RoleModeToggle";
import { RevenueHeroCard } from "./RevenueHeroCard";
import { QuickActionsRow, type QuickAction } from "./QuickActionsRow";
import { BentoCard } from "./BentoCard";
import { BentoRow } from "./BentoGrid";

export function MoreScreen() {
  const { colors, typography } = useTheme();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayData } = useTodayQuery(today);
  const { data: me } = useMeQuery();
  const [mode, setMode] = useState<"master" | "salon">("master");

  const revenueRub = (todayData?.revenueCents ?? 0) / 100;
  const weekly = [
    28,
    45,
    38,
    62,
    55,
    71,
    Math.max(20, revenueRub / 1000) || 48,
  ]; // placeholder until weekly API exists

  const quickActions: QuickAction[] = [
    {
      id: "services",
      label: "Услуги",
      icon: "shape-outline",
      color: colors.nails,
      onPress: () => router.push("/(settings)/services"),
    },
    {
      id: "schedule",
      label: "Расписание",
      icon: "clock-outline",
      color: colors.hair,
      onPress: () => router.push("/(settings)/schedule"),
    },
    {
      id: "finance",
      label: "Финансы",
      icon: "credit-card-outline",
      color: colors.massage,
      onPress: () => router.push("/(settings)/finances"),
    },
    {
      id: "analytics",
      label: "Аналитика",
      icon: "chart-line",
      color: colors.makeup,
    },
    {
      id: "notif",
      label: "Уведомл.",
      icon: "bell-outline",
      color: colors.accent,
      badge: me?.effectiveRoles?.pendingInvites ?? 0,
      onPress: () => router.push("/(settings)/notifications"),
    },
    {
      id: "settings",
      label: "Настройки",
      icon: "cog-outline",
      color: colors.muted,
    },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.muted }]}>
              OVERVIEW
            </Text>
            <Text
              style={[
                styles.title,
                { color: colors.text, fontFamily: typography.fonts.serif },
              ]}
            >
              Бизнес
            </Text>
          </View>
          <RoleModeToggle mode={mode} onChange={setMode} />
        </View>

        <RevenueHeroCard
          label="Выручка · сегодня"
          amountRub={revenueRub}
          weekly={weekly}
        />

        <QuickActionsRow items={quickActions} />

        {/* Row 1: Services + Schedule */}
        <BentoRow
          left={
            <BentoCard gradient={[`${colors.nails}30`, `${colors.nails}08`]}>
              <Text style={[styles.bentoEyebrow, { color: colors.nails }]}>
                УСЛУГИ
              </Text>
              <Text
                style={[
                  styles.bentoBig,
                  { color: colors.text, fontFamily: typography.fonts.serif },
                ]}
              >
                {todayData?.appointmentsCount ?? "—"}
              </Text>
              <Text style={[styles.bentoSub, { color: colors.textSoft }]}>
                записей сегодня
              </Text>
            </BentoCard>
          }
          right={
            <BentoCard
              gradient={[`${colors.massage}28`, `${colors.massage}06`]}
            >
              <Text style={[styles.bentoEyebrow, { color: colors.massage }]}>
                ГРАФИК
              </Text>
              <Text
                style={[
                  styles.bentoSub,
                  { color: colors.massage, marginTop: 6, fontWeight: "600" },
                ]}
              >
                9:00–20:00
              </Text>
            </BentoCard>
          }
        />

        {/* Row 2: Salons + Finance */}
        <BentoRow
          leftFlex={1}
          rightFlex={1.55}
          left={
            <BentoCard gradient={[`${colors.brows}28`, `${colors.brows}06`]}>
              <Text style={[styles.bentoEyebrow, { color: colors.brows }]}>
                САЛОНЫ
              </Text>
              <Text
                style={[
                  styles.bentoBig,
                  { color: colors.text, fontFamily: typography.fonts.serif },
                ]}
              >
                {me?.effectiveRoles?.salonMemberships?.length ?? 0}
              </Text>
            </BentoCard>
          }
          right={
            <BentoCard
              gradient={[`${colors.massage}28`, `${colors.massage}06`]}
            >
              <Text style={[styles.bentoEyebrow, { color: colors.massage }]}>
                ФИНАНСЫ
              </Text>
              <Text
                style={[
                  styles.bentoBig,
                  { color: colors.text, fontFamily: typography.fonts.serif },
                ]}
              >
                {(revenueRub / 1000).toFixed(1)}к
              </Text>
              <Text style={[styles.bentoSub, { color: colors.muted }]}>
                Доход сегодня
              </Text>
            </BentoCard>
          }
        />

        {/* Notifications */}
        <BentoCard gradient={[`${colors.accent}1F`, `${colors.accent}08`]}>
          <Text style={[styles.bentoEyebrow, { color: colors.accent }]}>
            УВЕДОМЛЕНИЯ
          </Text>
          <Text
            style={[
              styles.bentoBig,
              {
                color: colors.text,
                fontSize: 18,
                marginTop: 4,
                fontFamily: typography.fonts.serif,
              },
            ]}
          >
            {me?.effectiveRoles?.pendingInvites
              ? `${me.effectiveRoles.pendingInvites} приглашение`
              : "Нет новых"}
          </Text>
        </BentoCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 80, gap: 10 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: "500",
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  bentoEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  bentoBig: {
    fontSize: 28,
    fontWeight: "500",
    lineHeight: 28,
    marginBottom: 8,
  },
  bentoSub: { fontSize: 11 },
});
