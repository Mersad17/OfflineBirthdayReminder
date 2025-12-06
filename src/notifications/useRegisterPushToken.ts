// src/notifications/pushRegistration.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "../lib/api";
import { configureAndroidChannel } from "./notification";

// tiny cache to avoid re-registering constantly
let cachedToken = "";
export function clearCachedToken() {
  cachedToken = "";
}
export async function registerPushTokenOnce(): Promise<string | null> {
  // Android: ensure channel exists
  await configureAndroidChannel();

  // only physical devices receive real push
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device.");
    return null;
  }

  // 1) permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Permission for notifications not granted.");
    return null;
  }

  // 2) project id (for EAS)
  const projectId =
    Constants.expoConfig?.extra?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn(
      "No projectId found in app config; push may fail on EAS builds."
    );
  }

  // 3) get expo push token
  const token = (
    await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    )
  ).data;

  if (!token) return null;

  // 4) register to your backend (only if changed)
  if (token && token !== cachedToken) {
    try {
      await api.post("/notifications/register-push-token/", { expo_push_token: token });
      cachedToken = token;
      console.log("Registered push token with backend.");
    } catch (e: any) {
      console.log(
        "Register push token failed:",
        e.response?.status,
        e.response?.data || e.message
      );
      // you might still want to return token even if backend failed
    }
  }

  if (Platform.OS === "android") {
    // channel already configured above
  }

  return token;
}
