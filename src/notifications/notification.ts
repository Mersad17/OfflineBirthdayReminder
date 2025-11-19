import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// 1) how notifications behave when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,     // show banner
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// 2) ensure Android has a default channel
export async function configureAndroidChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}
