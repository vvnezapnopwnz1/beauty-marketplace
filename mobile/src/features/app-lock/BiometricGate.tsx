import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import * as LocalAuthentication from "expo-local-authentication";

type Props = {
  children: React.ReactNode;
  timeoutMs?: number;
};

export function BiometricGate({ children, timeoutMs = 5 * 60 * 1000 }: Props) {
  const [isUnlocked, setIsUnlocked] = useState(Platform.OS === "web");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const backgroundedAtRef = useRef<number | null>(null);

  const requestUnlock = useCallback(async () => {
    if (isAuthenticating) {
      return;
    }

    setIsAuthenticating(true);
    setErrorText(null);

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      // If biometrics are unavailable on device, avoid locking the app.
      if (!hasHardware || !isEnrolled) {
        setIsUnlocked(true);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Подтвердите вход",
        cancelLabel: "Отмена",
        fallbackLabel: "Использовать код",
        disableDeviceFallback: true,
      });

      if (result.success) {
        setIsUnlocked(true);
        return;
      }

      setIsUnlocked(false);
      setErrorText("Не удалось подтвердить личность. Попробуйте еще раз.");
    } catch (_error) {
      setIsUnlocked(false);
      setErrorText("Ошибка биометрической проверки. Попробуйте еще раз.");
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating]);

  useEffect(() => {
    void requestUnlock();
  }, [requestUnlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        backgroundedAtRef.current = Date.now();
        return;
      }

      if (nextState === "active" && backgroundedAtRef.current) {
        const elapsed = Date.now() - backgroundedAtRef.current;
        backgroundedAtRef.current = null;

        if (elapsed >= timeoutMs) {
          setIsUnlocked(false);
          void requestUnlock();
        }
      }
    });

    return () => subscription.remove();
  }, [requestUnlock, timeoutMs]);

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Приложение заблокировано</Text>
      <Text style={styles.subtitle}>Подтвердите вход с помощью биометрии.</Text>
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
      <TouchableOpacity
        style={styles.button}
        disabled={isAuthenticating}
        onPress={() => {
          void requestUnlock();
        }}
      >
        <Text style={styles.buttonText}>
          {isAuthenticating ? "Проверка..." : "Повторить"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#10141D",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#D6D9E0",
    textAlign: "center",
  },
  error: {
    marginTop: 12,
    fontSize: 13,
    color: "#F2B8B5",
    textAlign: "center",
  },
  button: {
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#C99673",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
