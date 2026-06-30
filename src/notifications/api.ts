import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  cancelAllScheduledNotifications,
  configureAndroidChannel,
  ensureNotificationPermissions,
} from "./notification";

const NOTIFICATIONS_ENABLED_KEY = "notifications_enabled";

export type PushStatusResponse = {
  push_enabled: boolean;
  permission_granted: boolean;
  app_enabled: boolean;
  can_ask_again?: boolean;
  detail?: string;
};

function isGranted(status: Notifications.NotificationPermissionsStatus) {
  return Boolean(status.granted || status.status === "granted");
}

export async function fetchPushStatus(): Promise<PushStatusResponse> {
  await configureAndroidChannel();

  const storedValue = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);

  /**
   * Default behavior:
   * - If the user never touched the setting, reminders are enabled inside the app.
   * - Real OS permission still decides whether a phone notification can fire.
   */
  const appEnabled = storedValue !== "false";

  const permissions = await Notifications.getPermissionsAsync();
  const permissionGranted = isGranted(permissions);
  const pushEnabled = appEnabled && permissionGranted;

  return {
    push_enabled: pushEnabled,
    permission_granted: permissionGranted,
    app_enabled: appEnabled,
    can_ask_again: permissions.canAskAgain,
    detail: pushEnabled
      ? "Local reminders are enabled on this device."
      : !appEnabled
      ? "Local reminders are turned off inside the app."
      : "Notification permission is not granted on this device.",
  };
}

export async function enableLocalNotifications(): Promise<PushStatusResponse> {
  /**
   * The user explicitly turned the app setting ON.
   * Keep app_enabled=true even if the OS permission is denied,
   * otherwise future scheduling would look like the app setting is disabled.
   */
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "true");

  const granted = await ensureNotificationPermissions();

  if (!granted) {
    return {
      push_enabled: false,
      permission_granted: false,
      app_enabled: true,
      detail:
        "Notification permission was not granted. Please allow notifications in your phone settings.",
    };
  }

  return {
    push_enabled: true,
    permission_granted: true,
    app_enabled: true,
    detail: "Local reminders are enabled.",
  };
}

export async function unregisterPushTokens() {
  /**
   * Offline-first:
   * There is no backend push token to unregister.
   *
   * This function name stays for compatibility with existing screens.
   * In this app it means: disable local reminder notifications on this device.
   */
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false");

  /**
   * Existing reminders stay in SQLite.
   * Only already-scheduled phone notifications are cancelled.
   */
  await cancelAllScheduledNotifications();

  return {
    data: null,
    status: 204,
  };
}

export async function areLocalNotificationsEnabled() {
  const status = await fetchPushStatus();

  return status.push_enabled;
}
