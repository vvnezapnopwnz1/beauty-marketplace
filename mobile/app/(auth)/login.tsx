import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../src/stores/authStore";
import { authApi } from "../../src/api/auth";

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

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState<string | null>(null);
  const [step, setStep] = useState<"phone" | "code" | "blocked">("phone");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setTokenPair, setUser } = useAuthStore();

  useEffect(() => {
    if (step === "code") {
      console.log("code", code);
      console.log("normalizedPhone", normalizedPhone);
      console.log("step", step);
      console.log("loading", loading);
      console.log("phone", phone);
      console.log("setPhone", setPhone);
      console.log("setCode", setCode);
      console.log("setNormalizedPhone", setNormalizedPhone);
      console.log("setStep", setStep);
      console.log("setLoading", setLoading);
    }
  }, [
    code,
    normalizedPhone,
    step,
    loading,
    phone,
    setPhone,
    setCode,
    setNormalizedPhone,
    setStep,
    setLoading,
  ]);

  const handleRequestOTP = async () => {
    const normalizedE164 = normalizePhoneToRuE164(phone);
    if (!normalizedE164) {
      Alert.alert("Error", "Please enter a valid phone number");
      return;
    }

    setLoading(true);
    try {
      await authApi.requestOtp({ phone: normalizedE164, channel: "sms" });
      setNormalizedPhone(normalizedE164);
      setStep("code");
    } catch (error) {
      Alert.alert(
        "Error",
        getErrorMessage(error, "Failed to send OTP. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!normalizedPhone) {
      Alert.alert("Error", "Please request a verification code first");
      setStep("phone");
      return;
    }
    if (!code.trim()) {
      Alert.alert("Error", "Please enter the verification code");
      return;
    }

    setLoading(true);
    try {
      const verify = await authApi.verifyOtp({
        phone: normalizedPhone,
        code: code.trim(),
      });
      console.log("verify", verify);
      // Persist tokens before any authenticated API call.
      setTokenPair(verify.tokenPair);
      const me = await authApi.fetchMe();
      console.log("me", me);
      console.log("me.masterProfileId", me.masterProfileId);
      if (!me.masterProfileId) {
        // Do not persist authenticated session for non-master accounts in this app.
        setTokenPair(null);
        setUser(null);
        setStep("blocked");
        return;
      }
      console.log("verify.tokenPair", verify.tokenPair);
      setUser({
        id: me.id,
        phone: me.phone,
        displayName: me.displayName ?? null,
        globalRole: me.globalRole,
        effectiveRoles: me.effectiveRoles,
        masterProfileId: me.masterProfileId ?? null,
      });

      router.replace("/(tabs)");
    } catch (error) {
      setTokenPair(null);
      setUser(null);
      Alert.alert(
        "Error",
        getErrorMessage(error, "Invalid verification code. Please try again."),
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>Sign in to your account</Text>

      {step === "phone" ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRequestOTP}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Sending..." : "Send Verification Code"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : step === "code" ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Verification code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerifyOTP}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Verifying..." : "Verify Code"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleUseDifferentPhone}
          >
            <Text style={styles.secondaryButtonText}>Change Phone Number</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.blockingTitle}>Master profile required</Text>
          <Text style={styles.blockingBody}>
            This app currently supports master accounts only. Please finish
            master profile setup in the web app and try again.
          </Text>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleUseDifferentPhone}
          >
            <Text style={styles.secondaryButtonText}>Use Another Number</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
  },
  form: {
    width: "100%",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 16,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 16,
  },
  blockingTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  blockingBody: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
});
