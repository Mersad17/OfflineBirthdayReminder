import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useEffect, useState } from "react";
import { Platform, Alert } from "react-native";
import { api } from "../lib/api";
import { configureAndroidChannel } from "./notification";
import Constants from "expo-constants";

// tiny cache to avoid re-registering constantly
let cachedToken = "";

export function useRegisterPushToken() {
  const [expoPushToken, setExpoPushToken] = useState<string>("");

  useEffect(() => {
    (async () => {
      // on Android, ensure channel exists
      await configureAndroidChannel();

      // only physical devices receive real push
      if (!Device.isDevice) {
        console.log("Push notifications require a physical device.");
        return;
      }

      // 1) request permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        // (best practice: show your own value prompt **before** this system dialog)
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        console.log("Permission for notifications not granted.");
        return;
      }
      const projectId =
      Constants.expoConfig?.extra?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      console.warn("No projectId found in app config; push may fail on EAS builds.");
    }

      // 2) get expo push token
      const token = (
        await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        )
      ).data; // EAS builds: pass projectId
      setExpoPushToken(token);

      // 3) register to your backend (only if changed)
      if (token && token !== cachedToken) {
        try {
          await api.post("/push/register/", { expo_push_token: token });
          cachedToken = token;
          console.log("Registered push token with backend.");
        }  catch (e: any) {
  console.log(
    "Register push token failed:",
    e.response?.status,
    e.response?.data || e.message
  );
}
      }

      // iOS: notification permissions also require enabling in app.json (handled by expo)
      if (Platform.OS === "android") {
        // no-op, already configured channel
      }
    })();
  }, []);

  return expoPushToken;
}
