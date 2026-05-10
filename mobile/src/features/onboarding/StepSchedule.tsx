import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../../shared/theme/useTheme";
import { OnboardingShell } from "./OnboardingShell";
import { advanceMasterOnboardingStep } from "../../api/masterOnboarding";

export function StepScheduleScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleNext = async () => {
    setBusy(true);
    try {
      await advanceMasterOnboardingStep("completed");
    } finally {
      setBusy(false);
      router.push("/(onboarding)/publish");
    }
  };

  return (
    <OnboardingShell
      currentStep="schedule"
      title="Расписание"
      subtitle="Рабочие часы"
    >
      <View style={styles.center}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.accentLight },
          ]}
        >
          <Feather name="clock" size={28} color={colors.accent} />
        </View>
        <Text style={[styles.body, { color: colors.textSoft }]}>
          Настройте рабочие часы позже в кабинете мастера. Вы сможете задать
          график по дням недели и указать перерывы.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.accent }]}
        onPress={handleNext}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color={colors.textInverse} />
        ) : (
          <Text style={[styles.buttonText, { color: colors.textInverse }]}>
            Продолжить
          </Text>
        )}
      </TouchableOpacity>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    gap: 16,
    paddingVertical: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  button: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
