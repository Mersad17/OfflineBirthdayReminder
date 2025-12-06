// src/screens/settings/NotificationScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Alert,
  Button,
  ActivityIndicator,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SettingsStackParamsList } from "../../navigation/SettingsStack";
import { useAppearance } from "../../appearance/AppearanceContext";
import { unregisterPushTokens, fetchPushStatus } from "../../notifications/api";
import { api } from "../../lib/api";
import {
  clearCachedToken,
  registerPushTokenOnce,
} from "../../notifications/useRegisterPushToken";

type Props = NativeStackScreenProps<SettingsStackParamsList, "Notifications">;

export default function NotificationScreen({}: Props) {
  const { settings } = useAppearance();

  const [enabled, setEnabled] = useState(false);
  const [expoToken, setExpoToken] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔹 hydrate the toggle from backend on mount
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const data = await fetchPushStatus();
        if (isMounted) {
          setEnabled(data.push_enabled);
        }
      } catch (e) {
        console.log("Error fetching push status", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleToggle(value: boolean) {
    if (updating) return;
    setUpdating(true);

    try {
      if (value) {
        // Turn ON: request permission, get token, register to backend
        const token = await registerPushTokenOnce();

        if (!token) {
          Alert.alert(
            "Notifications",
            "Could not enable notifications (permission denied or simulator)."
          );
          setEnabled(false);
          return;
        }

        setExpoToken(token);
        setEnabled(true);
      } else {
        // Turn OFF: tell backend to remove tokens
        try {
          await unregisterPushTokens(expoToken ?? undefined);
        } catch (e) {
          console.log("Error unregistering push tokens", e);
        } finally {
          clearCachedToken(); // so next ON re-registers
          setEnabled(false);
        }
      }
    } catch (e) {
      console.log("Toggle notification error", e);
      Alert.alert(
        "Notifications",
        "Something went wrong while updating your notification settings."
      );
    } finally {
      setUpdating(false);
    }
  }

  async function onSendTest() {
    try {
      const res = await api.post("/notifications/test/");
      console.log("Test push response", res.data);
      Alert.alert("Notifications", "Test notification triggered.");
    } catch (e) {
      console.log("Test push error", e);
      Alert.alert(
        "Notifications",
        "Could not send test notification. Check backend logs."
      );
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: settings.titleColor }]}>
        Notifications
      </Text>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: settings.textColor }]}>
            Push notifications
          </Text>
          <Text style={[styles.rowSubtitle, { color: settings.textColor }]}>
            Allow reminders and updates via push notifications.
          </Text>
        </View>

        <Switch
          value={enabled}
          onValueChange={handleToggle}
          disabled={updating}
          trackColor={{ false: "#D1D5DB", true: settings.buttonColor }}
          thumbColor="#FFFFFF"
        />
      </View>

      <View style={{ marginTop: 24 }}>
        <Button
          title="Send test notification"
          color={settings.buttonColor}
          onPress={onSendTest}
          disabled={!enabled}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  rowSubtitle: {
    fontSize: 13,
    marginTop: 2,
    opacity: 0.7,
  },
});
