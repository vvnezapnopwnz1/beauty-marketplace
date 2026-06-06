import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import apiClient from "../../api/client";
import { DEVICES } from "../../api/endpoints";

export async function registerExpoPushToken() {
  // Expo Go on Android does not support remote push via expo-notifications (SDK 53+).
  if (Constants.executionEnvironment === "storeClient") {
    return;
  }

  if (!Device.isDevice) {
    return;
  }

  const Notifications = await import("expo-notifications");
  const permissions = await Notifications.getPermissionsAsync();
  let status = (permissions as any).status;
  if (status !== "granted") {
    const asked = await Notifications.requestPermissionsAsync();
    status = (asked as any).status;
  }
  if (status !== "granted") {
    return;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

  await apiClient.post(DEVICES.register, {
    device_token: token.data,
    platform: Platform.OS === "android" ? "android" : "ios",
    app_version: Constants.expoConfig?.version ?? "dev",
  });
}
