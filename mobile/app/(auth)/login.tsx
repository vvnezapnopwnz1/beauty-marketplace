import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore } from "../../src/stores/authStore";
import { authApi } from "../../src/api/auth";
import { startMasterOnboarding } from "../../src/api/masterOnboarding";
import type { MasterOnboardingStartResult, MeResponse } from "../../src/api/types";
import { useTheme } from "../../src/theme";
import { Button } from "../../src/components/ui/Button";
import { Input } from "../../src/components/ui/Input";

function normalizePhoneToRuE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8"))
    return `+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  if (digits.length === 10) return `+7${digits}`;
  if (raw.startsWith("+7") && digits.length === 11) return `+${digits}`;
  return null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function resolveOnboardingStep(
  me: MeResponse,
  startResult: MasterOnboardingStartResult | null,
  resolvedMasterProfileId: string | null,
): string | undefined {
  if (!resolvedMasterProfileId) return undefined;
  if (me.masterProfileId) {
    return me.master?.onboardingStep ?? "completed";
  }
  return startResult?.onboardingStep ?? "profile";
}

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) {
    const d = digits;
    return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
  }
  if (digits.length === 10) {
    const d = digits;
    return `+7 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 8)}-${d.slice(8, 10)}`;
  }
  return raw;
}

export default function LoginScreen() {
  const { colors, typography } = useTheme();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState<string | null>(null);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams<{ intent?: string | string[] }>();
  const intentParam = params.intent;
  const intent =
    typeof intentParam === "string"
      ? intentParam
      : Array.isArray(intentParam)
        ? intentParam[0]
        : undefined;
  const { setTokenPair, setUser } = useAuthStore();

  const handleRequestOTP = async () => {
    const normalizedE164 = normalizePhoneToRuE164(phone);
    if (!normalizedE164) {
      Alert.alert("Ошибка", "Введите корректный номер телефона");
      return;
    }

    setLoading(true);
    try {
      await authApi.requestOtp({ phone: normalizedE164, channel: "sms" });
      setNormalizedPhone(normalizedE164);
      setStep("code");
    } catch (error) {
      Alert.alert(
        "Ошибка",
        getErrorMessage(error, "Не удалось отправить код. Попробуйте позже."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!normalizedPhone) {
      Alert.alert("Ошибка", "Сначала запросите код подтверждения");
      setStep("phone");
      return;
    }
    if (!code.trim()) {
      Alert.alert("Ошибка", "Введите код из SMS");
      return;
    }

    setLoading(true);
    try {
      const verify = await authApi.verifyOtp({
        phone: normalizedPhone,
        code: code.trim(),
      });
      setTokenPair(verify.tokenPair);
      let me = await authApi.fetchMe();
      let startResult: MasterOnboardingStartResult | null = null;

      if (intent === "master" && !(me.effectiveRoles?.isMaster ?? false)) {
        try {
          startResult = await startMasterOnboarding();
          me = await authApi.fetchMe();
        } catch {
          Alert.alert(
            "Не удалось открыть кабинет мастера",
            "Проверьте сеть и попробуйте снова с главного экрана.",
          );
        }
      }

      const resolvedMasterProfileId =
        me.masterProfileId ?? startResult?.masterProfileId ?? null;
      const onboardingStep = resolveOnboardingStep(
        me,
        startResult,
        resolvedMasterProfileId,
      );
      const hasMasterCabinet =
        !!(me.effectiveRoles?.isMaster ?? false) || !!resolvedMasterProfileId;
      const roles = me.effectiveRoles;
      const effectiveRoles =
        resolvedMasterProfileId && !roles.isMaster
          ? { ...roles, isMaster: true }
          : roles;

      setUser({
        id: me.id,
        phone: me.phone,
        displayName: me.displayName ?? null,
        globalRole: me.globalRole,
        effectiveRoles,
        masterProfileId: resolvedMasterProfileId,
      });

      if (hasMasterCabinet) {
        if (resolvedMasterProfileId && onboardingStep === "completed") {
          router.replace("/(tabs)");
        } else {
          router.replace("/(onboarding)");
        }
      } else {
        router.replace("/");
      }
    } catch (error) {
      setTokenPair(null);
      setUser(null);
      Alert.alert(
        "Ошибка",
        getErrorMessage(error, "Неверный код. Попробуйте ещё раз."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUseDifferentPhone = () => {
    setCode("");
    setNormalizedPhone(null);
    setStep("phone");
  };

  const steps = [
    { icon: "smartphone" as const, text: "Введите номер телефона" },
    { icon: "message-square" as const, text: "Получите SMS-код" },
    { icon: "unlock" as const, text: "Войдите без пароля" },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text
            style={[
              styles.brand,
              { color: colors.text, fontFamily: typography.fonts.serif },
            ]}
          >
            Beautica
          </Text>
          <Text
            style={[
              styles.tagline,
              { color: colors.textSoft, fontFamily: typography.fonts.regular },
            ]}
          >
            Вход в аккаунт
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderLight,
              shadowColor: colors.text,
            },
          ]}
        >
          {step === "phone" ? (
            <>
              <Input
                label="Номер телефона"
                placeholder="+7 (999) 000-00-00"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoFocus
                inputStyle={{
                  fontSize: 16,
                  fontFamily: typography.fonts.medium,
                }}
              />
              <Button onPress={handleRequestOTP} disabled={loading}>
                {loading ? "Отправка..." : "Получить код"}
              </Button>
            </>
          ) : (
            <>
              <Text
                style={[
                  styles.codeSent,
                  {
                    color: colors.textSoft,
                    fontFamily: typography.fonts.regular,
                  },
                ]}
              >
                Код отправлен на{" "}
                {normalizedPhone ? formatPhoneDisplay(normalizedPhone) : phone}
              </Text>
              <Input
                label="Код из SMS"
                placeholder="0000"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoFocus
                maxLength={6}
                textContentType="oneTimeCode"
                inputStyle={{
                  fontSize: 20,
                  fontFamily: typography.fonts.medium,
                  letterSpacing: 4,
                  textAlign: "center",
                }}
              />
              <Button onPress={handleVerifyOTP} disabled={loading}>
                {loading ? "Проверка..." : "Войти"}
              </Button>
              <TouchableOpacity
                onPress={handleUseDifferentPhone}
                style={styles.changePhone}
              >
                <Text
                  style={[
                    styles.changePhoneText,
                    {
                      color: colors.accent,
                      fontFamily: typography.fonts.medium,
                    },
                  ]}
                >
                  Изменить номер
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.infoSection}>
          <Text
            style={[
              styles.infoTitle,
              { color: colors.textSoft, fontFamily: typography.fonts.bold },
            ]}
          >
            Как это работает
          </Text>
          {steps.map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <View
                style={[
                  styles.stepIcon,
                  { backgroundColor: colors.accentLight },
                ]}
              >
                <Feather name={s.icon} size={16} color={colors.accent} />
              </View>
              <Text
                style={[
                  styles.stepText,
                  {
                    color: colors.textSoft,
                    fontFamily: typography.fonts.regular,
                  },
                ]}
              >
                {s.text}
              </Text>
            </View>
          ))}
        </View>

        <Text
          style={[
            styles.disclaimer,
            { color: colors.muted, fontFamily: typography.fonts.regular },
          ]}
        >
          Мы не передаём ваш номер третьим лицам. Вход по SMS — это быстро и
          безопасно.
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/")}
          style={styles.backLink}
        >
          <Text
            style={[
              styles.backLinkText,
              { color: colors.muted, fontFamily: typography.fonts.medium },
            ]}
          >
            ← Вернуться на главную
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  hero: {
    alignItems: "center",
    marginBottom: 28,
  },
  brand: {
    fontSize: 36,
    fontWeight: "400",
    letterSpacing: -1,
    lineHeight: 40,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  codeSent: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    textAlign: "center",
  },
  changePhone: {
    marginTop: 14,
    alignItems: "center",
  },
  changePhoneText: {
    fontSize: 14,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    fontSize: 13,
    lineHeight: 18,
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  backLink: {
    alignItems: "center",
  },
  backLinkText: {
    fontSize: 14,
  },
});
