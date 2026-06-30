// src/screens/Settings/NotificationScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { SettingsStackParamsList } from "../../navigation/SettingsStack";
import { useAppearance } from "../../appearance/AppearanceContext";
import {
  unregisterPushTokens,
  fetchPushStatus,
  enableLocalNotifications,
} from "../../notifications/api";
import {
  buildReminderNotificationContent,
  getTestNotificationArgs,
  scheduleAllTestNotifications,
  scheduleTestNotification,
} from "../../notifications/notification";
import type { ReminderNotificationKind } from "../../notifications/notification";
import { Screen } from "../../components/Screen";

type Props = NativeStackScreenProps<SettingsStackParamsList, "Notifications">;

type NotificationColors = {
  background: string;
  card: string;
  title: string;
  text: string;
  primary: string;
  button: string;
  buttonText: string;
  border: string;
  muted: string;
  softCard: string;
  softPrimary: string;
  danger: string;
  warning: string;
  success: string;
  shadow: string;
};

type TestNotificationOption = {
  key: ReminderNotificationKind;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const TEST_NOTIFICATION_OPTIONS: TestNotificationOption[] = [
  { key: "test", label: "Basic test", icon: "notifications-outline" },
  { key: "birthday", label: "Birthday", icon: "gift-outline" },
  { key: "anniversary", label: "Anniversary", icon: "heart-outline" },
  { key: "important_date", label: "Important date", icon: "star-outline" },
  { key: "meeting", label: "Meeting", icon: "people-outline" },
  { key: "holiday", label: "Holiday", icon: "sunny-outline" },
  { key: "event", label: "Event", icon: "calendar-outline" },
  { key: "check_in", label: "Check-in", icon: "chatbubble-outline" },
  { key: "ask_next_time", label: "Ask next time", icon: "help-circle-outline" },
  { key: "generic", label: "Generic", icon: "alarm-outline" },
];

export default function NotificationScreen({ navigation }: Props) {
  const { settings } = useAppearance();
  const colors = useMemo(() => makeNotificationColors(settings), [settings]);

  const [enabled, setEnabled] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingTestKind, setSendingTestKind] =
    useState<ReminderNotificationKind | null>(null);
  const [sendingAllTests, setSendingAllTests] = useState(false);

  useEffect(() => {
    navigation.setOptions?.({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        const data = await fetchPushStatus();

        if (isMounted) {
          setEnabled(Boolean(data.push_enabled));
        }
      } catch (error) {
        console.log("Error fetching notification status", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadStatus();

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
          setEnabled(false);

          Alert.alert(
            "Notifications",
            result.detail ||
              "Could not enable notifications. Please allow notification permission in your phone settings."
          );

          return;
        }

        setEnabled(true);

        Alert.alert(
          "Notifications",
          "Local reminders are enabled on this device."
        );

        return;
      }

      await unregisterPushTokens();

      setEnabled(false);

      Alert.alert(
        "Notifications",
        "Local reminders are disabled. Scheduled reminder notifications were cancelled."
      );
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

  async function onSendTest(kind: ReminderNotificationKind) {
    if (sendingTestKind || sendingAllTests) return;

    setSendingTestKind(kind);

    try {
      const status = await fetchPushStatus();

      if (!status.push_enabled) {
        Alert.alert(
          "Notifications",
          "Enable notifications first before sending a test."
        );

        setEnabled(false);
        return;
      }

      const notificationId = await scheduleTestNotification(kind);

      if (!notificationId) {
        Alert.alert(
          "Notifications",
          "Could not schedule the test notification. Check phone permissions."
        );

        return;
      }

      Alert.alert(
        "Notifications",
        `${getNotificationLabel(kind)} test scheduled. It should appear in a few seconds.`
      );
    } catch (error) {
      console.log("Test notification error", error);

      Alert.alert("Notifications", "Could not schedule test notification.");
    } finally {
      setSendingTestKind(null);
    }
  }

  async function onSendAllTests() {
    if (sendingAllTests || sendingTestKind) return;

    setSendingAllTests(true);

    try {
      const status = await fetchPushStatus();

      if (!status.push_enabled) {
        Alert.alert(
          "Notifications",
          "Enable notifications first before sending tests."
        );

        setEnabled(false);
        return;
      }

      const notificationIds = await scheduleAllTestNotifications();

      if (notificationIds.length === 0) {
        Alert.alert(
          "Notifications",
          "Could not schedule the test notifications. Check phone permissions."
        );

        return;
      }

      Alert.alert(
        "Notifications",
        `${notificationIds.length} test notifications scheduled. They will appear one by one.`
      );
    } catch (error) {
      console.log("Send all test notifications error", error);

      Alert.alert("Notifications", "Could not schedule all test notifications.");
    } finally {
      setSendingAllTests(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} />

          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading notifications…
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <CompactHeader
            colors={colors}
            enabled={enabled}
            onBack={() => navigation.goBack()}
          />

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: colors.softPrimary },
                ]}
              >
                <Ionicons
                  name="notifications-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>

              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardTitle, { color: colors.title }]}>
                  Local reminders
                </Text>

                <Text style={[styles.cardSubtitle, { color: colors.text }]}>
                  Allow this app to remind you about birthdays, important dates,
                  meetings, and follow-ups.
                </Text>
              </View>

              <Switch
                value={enabled}
                onValueChange={handleToggle}
                disabled={updating}
                trackColor={{
                  false: withOpacity(colors.text, "24"),
                  true: colors.primary,
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={withOpacity(colors.text, "24")}
              />
            </View>

            <View
              style={[
                styles.statusBox,
                {
                  backgroundColor: enabled
                    ? withOpacity(colors.success, "14")
                    : withOpacity(colors.warning, "14"),
                  borderColor: enabled
                    ? withOpacity(colors.success, "34")
                    : withOpacity(colors.warning, "34"),
                },
              ]}
            >
              <View
                style={[
                  styles.statusIcon,
                  {
                    backgroundColor: enabled
                      ? withOpacity(colors.success, "18")
                      : withOpacity(colors.warning, "18"),
                  },
                ]}
              >
                <Ionicons
                  name={
                    enabled
                      ? "checkmark-circle-outline"
                      : "alert-circle-outline"
                  }
                  size={19}
                  color={enabled ? colors.success : colors.warning}
                />
              </View>

              <View style={styles.statusTextWrap}>
                <Text
                  style={[
                    styles.statusTitle,
                    { color: enabled ? colors.success : colors.warning },
                  ]}
                >
                  {enabled ? "Notifications enabled" : "Notifications disabled"}
                </Text>

                <Text style={[styles.statusSubtitle, { color: colors.text }]}>
                  {enabled
                    ? "Your phone can receive local reminder notifications."
                    : "Turn this on to receive reminder alerts on this device."}
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <View style={styles.testTopRow}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: colors.softPrimary },
                ]}
              >
                <Ionicons
                  name="paper-plane-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>

              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardTitle, { color: colors.title }]}>
                  Test notification styles
                </Text>

                <Text style={[styles.cardSubtitle, { color: colors.text }]}>
                  Tap any style to receive a real test notification in a few
                  seconds.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.sendAllButton,
                { backgroundColor: colors.button },
                (!enabled ||
                  updating ||
                  sendingAllTests ||
                  Boolean(sendingTestKind)) &&
                  styles.disabledButton,
              ]}
              onPress={onSendAllTests}
              disabled={
                !enabled || updating || sendingAllTests || Boolean(sendingTestKind)
              }
              activeOpacity={0.88}
            >
              {sendingAllTests ? (
                <ActivityIndicator color={colors.buttonText} />
              ) : (
                <>
                  <Ionicons
                    name="albums-outline"
                    size={18}
                    color={colors.buttonText}
                  />

                  <Text
                    style={[
                      styles.sendAllButtonText,
                      { color: colors.buttonText },
                    ]}
                  >
                    Send all preview notifications
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.testList}>
              {TEST_NOTIFICATION_OPTIONS.map((option) => {
                const preview = buildReminderNotificationContent(
                  getTestNotificationArgs(option.key)
                );

                const title = safeNotificationText(preview.title);
                const body = safeNotificationText(preview.body);

                return (
                  <TestNotificationRow
                    key={option.key}
                    option={option}
                    title={title}
                    body={body}
                    colors={colors}
                    enabled={enabled}
                    loading={sendingTestKind === option.key}
                    disabled={
                      Boolean(sendingTestKind) ||
                      sendingAllTests ||
                      updating ||
                      !enabled
                    }
                    onPress={() => onSendTest(option.key)}
                  />
                );
              })}
            </View>
          </View>

          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[styles.infoIcon, { backgroundColor: colors.softPrimary }]}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={18}
                color={colors.primary}
              />
            </View>

            <View style={styles.infoTextWrap}>
              <Text style={[styles.infoTitle, { color: colors.title }]}>
                Local-first reminders
              </Text>

              <Text style={[styles.infoText, { color: colors.text }]}>
                Notifications are scheduled locally on your phone. If permission
                is disabled, reminders still stay visible inside the app.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

function TestNotificationRow({
  option,
  title,
  body,
  colors,
  enabled,
  loading,
  disabled,
  onPress,
}: {
  option: TestNotificationOption;
  title: string;
  body: string;
  colors: NotificationColors;
  enabled: boolean;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.testRow,
        {
          backgroundColor: colors.softCard,
          borderColor: colors.border,
          opacity: disabled && !loading ? 0.56 : 1,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.86}
    >
      <View style={[styles.testIcon, { backgroundColor: colors.softPrimary }]}>
        <Ionicons name={option.icon} size={18} color={colors.primary} />
      </View>

      <View style={styles.testTextWrap}>
        <Text style={[styles.testLabel, { color: colors.primary }]}>
          {option.label}
        </Text>

        <Text
          style={[styles.testTitle, { color: colors.title }]}
          numberOfLines={1}
        >
          {title}
        </Text>

        <Text
          style={[styles.testBody, { color: colors.text }]}
          numberOfLines={2}
        >
          {body}
        </Text>
      </View>

      <View style={[styles.testAction, { backgroundColor: colors.button }]}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.buttonText} />
        ) : (
          <Ionicons
            name={enabled ? "send-outline" : "lock-closed-outline"}
            size={16}
            color={colors.buttonText}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

function CompactHeader({
  colors,
  enabled,
  onBack,
}: {
  colors: NotificationColors;
  enabled: boolean;
  onBack: () => void;
}) {
  return (
    <LinearGradient
      colors={[colors.primary, colors.button] as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.compactHeader}
    >
      <View style={styles.headerGlowOne} />
      <View style={styles.headerGlowTwo} />

      <View style={styles.headerTopRow}>
        <TouchableOpacity
          style={styles.headerCircleButton}
          onPress={onBack}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-back" size={23} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerPill}>
          <View
            style={[
              styles.headerStatusDot,
              { backgroundColor: enabled ? colors.success : colors.warning },
            ]}
          />

          <Text style={styles.headerPillText}>
            {enabled ? "Enabled" : "Disabled"}
          </Text>
        </View>
      </View>

      <View style={styles.headerMainRow}>
        <View style={styles.headerIconBubble}>
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>NOTIFICATIONS</Text>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Reminders
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={2}>
            Preview each notification style before using it in real reminders.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

/* helpers */

function getNotificationLabel(kind: ReminderNotificationKind) {
  return (
    TEST_NOTIFICATION_OPTIONS.find((option) => option.key === kind)?.label ??
    "Notification"
  );
}

function safeNotificationText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function makeNotificationColors(settings: any): NotificationColors {
  return {
    background: settings.backgroundColor ?? "#F8F4FF",
    card: settings.cardColor ?? "#FFFFFF",
    title: settings.titleColor ?? "#10162F",
    text: settings.textColor ?? "#5F6680",
    primary: settings.primaryColor ?? "#6651E5",
    button: settings.buttonColor || settings.primaryColor || "#6651E5",
    buttonText: settings.buttonTextColor ?? "#FFFFFF",
    border: withOpacity(settings.textColor ?? "#10162F", "16"),
    muted: withOpacity(settings.textColor ?? "#10162F", "88"),
    softCard: withOpacity(settings.textColor ?? "#10162F", "08"),
    softPrimary: withOpacity(settings.primaryColor ?? "#6651E5", "16"),
    danger: "#EE6A5E",
    warning: "#EBA55B",
    success: "#7DA56D",
    shadow:
      settings.resolvedThemeMode === "dark" || settings.themeMode === "dark"
        ? "#000000"
        : "#6F3D2E",
  };
}

function withOpacity(hexColor?: string | null, opacityHex = "22") {
  if (!hexColor || typeof hexColor !== "string") {
    return `#000000${opacityHex}`;
  }

  const normalized = hexColor.trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
    return `${normalized}${opacityHex}`;
  }

  return normalized;
}

/* styles */

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "800",
  },

  content: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 40,
    gap: 12,
  },

  compactHeader: {
    minHeight: 154,
    borderRadius: 28,
    padding: 16,
    overflow: "hidden",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  headerGlowOne: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 145,
    height: 145,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.16)",
  },

  headerGlowTwo: {
    position: "absolute",
    bottom: -75,
    left: -55,
    width: 160,
    height: 160,
    borderRadius: 86,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerCircleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerPill: {
    minHeight: 36,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  headerStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  headerPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  headerMainRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  headerIconBubble: {
    width: 54,
    height: 54,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  headerEyebrow: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "900",
    marginTop: 3,
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 2,
  },

  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 15,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  cardHeaderRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  cardHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
  },

  cardSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 3,
  },

  statusBox: {
    minHeight: 76,
    borderRadius: 22,
    borderWidth: 1,
    padding: 12,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  statusTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  statusTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  statusSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 2,
  },

  testTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 14,
  },

  sendAllButton: {
    minHeight: 50,
    borderRadius: 19,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  sendAllButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },

  disabledButton: {
    opacity: 0.6,
  },

  testList: {
    gap: 9,
  },

  testRow: {
    minHeight: 82,
    borderRadius: 22,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  testIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  testTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  testLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },

  testTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
  },

  testBody: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.76,
    marginTop: 3,
  },

  testAction: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  infoCard: {
    minHeight: 78,
    borderRadius: 24,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  infoTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  infoText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 2,
  },
});