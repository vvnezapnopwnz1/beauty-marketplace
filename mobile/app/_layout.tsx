import React, { useEffect, useRef, useState } from "react";
import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Slot, router } from "expo-router";
import Constants from "expo-constants";
import { useAuthStore } from "../src/stores/authStore";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from "@expo-google-fonts/dm-sans";
import { DMSerifDisplay_400Regular } from "@expo-google-fonts/dm-serif-display";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform } from "react-native";
import AppProviders from "../src/providers/AppProviders";
import { NetworkBanner } from "../src/shared/net/NetworkBanner";
import { BiometricGate } from "../src/features/app-lock/BiometricGate";
import { registerExpoPushToken } from "../src/entities/devices/api";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const { tokenPair, setTokenPair } = useAuthStore();
  const setTokenPairRef = useRef(setTokenPair);

  useEffect(() => {
    setTokenPairRef.current = setTokenPair;
  }, [setTokenPair]);

  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    DMSerifDisplay_400Regular,
  });

  useEffect(() => {
    console.log("[RootLayout] Initializing...");
    async function prepare() {
      try {
        // Restore session
        const tokenPairStr = await SecureStore.getItemAsync("tokenPair");
        if (tokenPairStr) {
          const storedTokenPair = JSON.parse(tokenPairStr);
          setTokenPairRef.current(storedTokenPair);
          console.log("[RootLayout] Auth restored");
        }
      } catch (e) {
        console.warn("[RootLayout] Auth restoration failed:", e);
      } finally {
        setIsReady(true);
        console.log("[RootLayout] Readiness set to true");
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (isReady && (fontsLoaded || Platform.OS === "web")) {
      console.log("[RootLayout] Hiding splash screen");
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady, fontsLoaded]);

  useEffect(() => {
    if (!tokenPair?.accessToken) {
      return;
    }
    if (Platform.OS === "web") {
      console.log(
        "[RootLayout] Web detected, skipping push token registration",
      );
    } else {
      void registerExpoPushToken().catch(() => {});
    }
  }, [tokenPair?.accessToken]);

  // Deep-link push taps to /chat/[appointmentId] when payload type is "chat.message".
  useEffect(() => {
    if (
      Platform.OS === "web" ||
      Constants.executionEnvironment === "storeClient"
    ) {
      return;
    }
    let subscription: { remove: () => void } | undefined;
    void (async () => {
      const Notifications = await import("expo-notifications");
      subscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data = (response.notification.request.content.data ?? {}) as {
            type?: string;
            appointmentId?: string;
          };
          if (data.type !== "chat.message" || !data.appointmentId) return;
          router.push({
            pathname: "/chat/[appointmentId]",
            params: { appointmentId: data.appointmentId },
          });
        },
      );
    })();
    return () => {
      subscription?.remove();
    };
  }, []);

  // On web, if fonts fail or take too long, we still want to show SOMETHING
  if (!isReady) {
    console.log("[RootLayout] Still not ready...");
    return null;
  }

  if (!fontsLoaded && Platform.OS !== "web") {
    console.log("[RootLayout] Fonts still loading on native...");
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider style={{ flex: 1 }}>
        <NetworkBanner />
        <AppProviders>
          <BiometricGate timeoutMs={5 * 60 * 1000}>
            <Slot />
          </BiometricGate>
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
