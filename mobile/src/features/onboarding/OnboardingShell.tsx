import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useTheme } from "../../shared/theme/useTheme";

const STEP_ORDER = [
  "profile",
  "specializations",
  "services",
  "schedule",
  "publish",
] as const;

type StepName = (typeof STEP_ORDER)[number];

function stepIndex(step: StepName): number {
  return STEP_ORDER.indexOf(step);
}

type Props = {
  currentStep: StepName;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function OnboardingShell({
  currentStep,
  title,
  subtitle,
  children,
}: Props) {
  const { colors, typography } = useTheme();
  const active = stepIndex(currentStep);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              { color: colors.text, fontFamily: typography.fonts.serif },
            ]}
          >
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textSoft }]}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.dotsRow}>
          {STEP_ORDER.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === active
                      ? colors.accent
                      : i < active
                        ? colors.accentBorder
                        : colors.borderLight,
                },
              ]}
            />
          ))}
        </View>

        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "400",
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
