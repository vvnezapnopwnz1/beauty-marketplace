import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../shared/theme/useTheme";
import { OnboardingShell } from "./OnboardingShell";
import {
  startMasterOnboarding,
  updateMyMasterProfile,
  advanceMasterOnboardingStep,
} from "../../api/masterOnboarding";
import { useAuthStore } from "../../stores/authStore";

export function StepProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user, setUser } = useAuthStore();

  const handleNext = async () => {
    setError(null);
    if (!displayName.trim()) {
      setError("Введите имя или псевдоним");
      return;
    }
    setSaving(true);
    try {
      // Ensure master profile exists before updating it.
      if (!user?.masterProfileId) {
        const startResult = await startMasterOnboarding();
        setUser({
          ...user!,
          masterProfileId: startResult.masterProfileId,
        });
      }

      await updateMyMasterProfile({
        displayName: displayName.trim(),
        bio: bio.trim() || null,
        specializations: [],
      });
      await advanceMasterOnboardingStep("specializations");
      router.push("/(onboarding)/specializations");
    } catch {
      setError("Не удалось сохранить профиль. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell
      currentStep="profile"
      title="Ваш профиль"
      subtitle="Как клиенты будут вас видеть?"
    >
      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.textSoft }]}>
          Имя или псевдоним *
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: colors.border,
              color: colors.text,
              backgroundColor: colors.surface,
            },
          ]}
          placeholder="Например, Анна Стилист"
          placeholderTextColor={colors.muted}
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
        />

        <Text style={[styles.label, { color: colors.textSoft }]}>О себе</Text>
        <TextInput
          style={[
            styles.input,
            styles.textarea,
            {
              borderColor: colors.border,
              color: colors.text,
              backgroundColor: colors.surface,
            },
          ]}
          placeholder="Расскажите о своём опыте и стиле"
          placeholderTextColor={colors.muted}
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {error && (
          <Text style={[styles.error, { color: colors.red }]}>{error}</Text>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={handleNext}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.textInverse }]}>
              Продолжить
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: -4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  textarea: {
    minHeight: 100,
    paddingTop: 14,
  },
  error: {
    fontSize: 13,
    textAlign: "center",
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
