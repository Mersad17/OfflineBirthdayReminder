import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ensureNotificationPermissions } from "./notification";

const NOTIFICATIONS_ENABLED_KEY = "notifications_enabled";

export type PushStatusResponse = {
  push_enabled: boolean;
  detail?: string;
};

export async function fetchPushStatus(): Promise<PushStatusResponse> {
  const storedValue = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  const appEnabled = storedValue !== "false";

  const permissions = await Notifications.getPermissionsAsync();

  const pushEnabled = appEnabled && permissions.status === "granted";

  return {
    push_enabled: pushEnabled,
    detail: pushEnabled
      ? "Local reminders are enabled on this device."
      : "Local reminders are disabled or permission is not granted.",
  };
}

export async function enableLocalNotifications(): Promise<PushStatusResponse> {
  const granted = await ensureNotificationPermissions();

  if (!granted) {
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false");

    return {
      push_enabled: false,
      detail: "Notification permission was not granted.",
    };
  }

  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "true");

  return {
    push_enabled: true,
    detail: "Local reminders are enabled.",
  };
}

export async function unregisterPushTokens() {
  /**
   * Offline-first:
   * There is no backend token to unregister.
   *
   * We use this function name to avoid changing screens.
   * It now means: disable local reminders in this app.
   */
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false");

  /**
   * This cancels scheduled local notifications.
   * Existing reminders can still stay in SQLite.
   */
  await Notifications.cancelAllScheduledNotificationsAsync();

  return {
    data: null,
    status: 204,
  };
}

export async function areLocalNotificationsEnabled() {
  const status = await fetchPushStatus();
  return status.push_enabled;
}