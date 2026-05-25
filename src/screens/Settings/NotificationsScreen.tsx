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
import * as Notifications from "expo-notifications";

import { SettingsStackParamsList } from "../../navigation/SettingsStack";
import { useAppearance } from "../../appearance/AppearanceContext";
import {
  unregisterPushTokens,
  fetchPushStatus,
  enableLocalNotifications,
} from "../../notifications/api";
import { Screen } from "../../components/Screen";

type Props = NativeStackScreenProps<SettingsStackParamsList, "Notifications">;

export default function NotificationScreen({}: Props) {
  const { settings } = useAppearance();

  const [enabled, setEnabled] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        const data = await fetchPushStatus();

        if (isMounted) {
          setEnabled(data.push_enabled);
        }
      } catch (error) {
        console.log("Error fetching notification status", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleToggle(value: boolean) {
    if (updating) return;

    setUpdating(true);

    try {
      if (value) {
        const result = await enableLocalNotifications();

        if (!result.push_enabled) {
          Alert.alert(
            "Notifications",
            result.detail ||
              "Could not enable notifications. Please allow notification permission in your phone settings."
          );

          setEnabled(false);
          return;
        }

        setEnabled(true);

        Alert.alert(
          "Notifications",
          "Local reminders are enabled on this device."
        );
      } else {
        await unregisterPushTokens();

        setEnabled(false);

        Alert.alert(
          "Notifications",
          "Local reminders are disabled. Scheduled reminder notifications were cancelled."
        );
      }
    } catch (error) {
      console.log("Toggle notification error", error);

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
      const status = await fetchPushStatus();

      if (!status.push_enabled) {
        Alert.alert(
          "Notifications",
          "Enable notifications first before sending a test."
        );
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Test reminder",
          body: "Your local notifications are working.",
          sound: true,
          data: {
            type: "test_notification",
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2,
        },
      });

      Alert.alert(
        "Notifications",
        "Test notification scheduled. It should appear in a few seconds."
      );
    } catch (error) {
      console.log("Test notification error", error);

      Alert.alert(
        "Notifications",
        "Could not schedule test notification."
      );
    }
  }

  if (loading) {
    return (
      <Screen>
        <View
          style={[
            styles.container,
            {
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <ActivityIndicator color={settings.primaryColor} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: settings.textColor }]}>
              Local reminders
            </Text>

            <Text style={[styles.rowSubtitle, { color: settings.textColor }]}>
              Allow this app to remind you about birthdays, important dates, and follow-ups.
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
            disabled={!enabled || updating}
          />
        </View>

        <Text style={[styles.note, { color: settings.textColor }]}>
          Notifications are scheduled locally on your phone. They work without your Django backend.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
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
    paddingRight: 12,
  },
  note: {
    marginTop: 16,
    fontSize: 13,
    opacity: 0.7,
    lineHeight: 18,
  },
});