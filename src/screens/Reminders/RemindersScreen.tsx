// src/screens/Reminders/RemindersScreen.tsx
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { fetchReminders } from "../../reminders/repository";
import { formatReminder, formatSendAt } from "../../reminders/utils";
import { Screen } from "../../components/Screen";
import { REMINDER_STATUS, ReminderDTO } from "../../events/types";
import { useAppearance } from "../../appearance/AppearanceContext";

type ReminderColors = {
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

export default function RemindersScreen({ navigation }: any) {
  const { settings } = useAppearance();
  const colors = useMemo(() => makeReminderColors(settings), [settings]);

  const [reminders, setReminders] = React.useState<ReminderDTO[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function load() {
    setLoading(true);

    try {
      const data = await fetchReminders();

      const sorted = [...data].sort((a, b) => {
        if (!a.send_at && !b.send_at) return 0;
        if (!a.send_at) return 1;
        if (!b.send_at) return -1;

        return new Date(a.send_at).getTime() - new Date(b.send_at).getTime();
      });

      setReminders(sorted);
    } catch (error) {
      console.log("Failed to load reminders", error);
      Alert.alert("Error", "Failed to load reminders.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    navigation.setOptions?.({
      headerShown: false,
    });
  }, [navigation]);

  React.useEffect(() => {
    const unsubscribe = navigation?.addListener?.("focus", load);

    load();

    return unsubscribe;
  }, [navigation]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function openAddReminder() {
    navigation.navigate("AddReminder");
  }

  const isEmpty = !loading && reminders.length === 0;

  if (loading && reminders.length === 0) {
    return (
      <Screen>
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} />

          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading reminders…
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <FlatList
          data={reminders}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            isEmpty ? styles.emptyContent : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <ReminderHeader
              count={reminders.length}
              colors={colors}
              onAdd={openAddReminder}
            />
          }
          ListEmptyComponent={
            isEmpty ? (
              <EmptyRemindersState colors={colors} onAdd={openAddReminder} />
            ) : null
          }
          ListFooterComponent={<View style={styles.footerSpace} />}
          renderItem={({ item }) => (
            <ReminderCard reminder={item} colors={colors} />
          )}
        />
      </View>
    </Screen>
  );
}

function ReminderHeader({
  count,
  colors,
  onAdd,
}: {
  count: number;
  colors: ReminderColors;
  onAdd: () => void;
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

      <View style={styles.headerRow}>
        <View style={styles.headerIconBubble}>
          <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>REMINDERS</Text>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Reminders
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {count} {count === 1 ? "reminder" : "reminders"} connected to your moments
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerAddButton}
          onPress={onAdd}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

function ReminderCard({
  reminder,
  colors,
}: {
  reminder: ReminderDTO;
  colors: ReminderColors;
}) {
  const status = getStatusStyle(reminder.status, colors);
  const hasNotification = Boolean(reminder.notification_id);

  return (
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
      <View style={styles.cardTopRow}>
        <View
          style={[
            styles.cardIcon,
            { backgroundColor: withOpacity(status.color, "18") },
          ]}
        >
          <Ionicons
            name={status.icon}
            size={18}
            color={status.color}
          />
        </View>

        <View style={styles.cardTextWrap}>
          <Text
            style={[styles.cardTitle, { color: colors.title }]}
            numberOfLines={2}
          >
            {formatReminder(reminder)}
          </Text>

          <Text
            style={[styles.cardSub, { color: colors.text }]}
            numberOfLines={1}
          >
            Send at · {formatSendAt(reminder)}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.cardDivider,
          { backgroundColor: colors.border },
        ]}
      />

      <View style={styles.metaRow}>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: withOpacity(status.color, "16"),
              borderColor: withOpacity(status.color, "34"),
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: status.color },
            ]}
          />

          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>

        <View
          style={[
            styles.notificationPill,
            {
              backgroundColor: hasNotification
                ? withOpacity(colors.success, "14")
                : withOpacity(colors.warning, "14"),
              borderColor: hasNotification
                ? withOpacity(colors.success, "34")
                : withOpacity(colors.warning, "34"),
            },
          ]}
        >
          <Ionicons
            name={hasNotification ? "checkmark-circle-outline" : "warning-outline"}
            size={13}
            color={hasNotification ? colors.success : colors.warning}
          />

          <Text
            style={[
              styles.notificationText,
              { color: hasNotification ? colors.success : colors.warning },
            ]}
            numberOfLines={1}
          >
            {hasNotification ? "Scheduled" : "Not scheduled"}
          </Text>
        </View>
      </View>
    </View>
  );
}

function EmptyRemindersState({
  colors,
  onAdd,
}: {
  colors: ReminderColors;
  onAdd: () => void;
}) {
  return (
    <View
      style={[
        styles.emptyCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: colors.softPrimary },
        ]}
      >
        <Ionicons
          name="notifications-outline"
          size={28}
          color={colors.primary}
        />
      </View>

      <Text style={[styles.emptyTitle, { color: colors.title }]}>
        No reminders yet
      </Text>

      <Text style={[styles.emptyText, { color: colors.text }]}>
        Create reminders for birthdays, promises, check-ins, interviews, or any
        important moment connected to someone.
      </Text>

      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: colors.button }]}
        onPress={onAdd}
        activeOpacity={0.88}
      >
        <Ionicons
          name="add-circle-outline"
          size={17}
          color={colors.buttonText}
        />

        <Text style={[styles.emptyButtonText, { color: colors.buttonText }]}>
          Create reminder
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* helpers */

function makeReminderColors(settings: any): ReminderColors {
  return {
    background: settings.backgroundColor,
    card: settings.cardColor,
    title: settings.titleColor,
    text: settings.textColor,
    primary: settings.primaryColor,
    button: settings.buttonColor || settings.primaryColor,
    buttonText: settings.buttonTextColor,
    border: withOpacity(settings.textColor, "16"),
    muted: withOpacity(settings.textColor, "88"),
    softCard: withOpacity(settings.textColor, "08"),
    softPrimary: withOpacity(settings.primaryColor, "16"),
    danger: "#EE6A5E",
    warning: "#EBA55B",
    success: "#7DA56D",
    shadow: settings.themeMode === "dark" ? "#000000" : "#6F3D2E",
  };
}

function getStatusStyle(status: number, colors: ReminderColors) {
  switch (status) {
    case REMINDER_STATUS.PENDING:
      return {
        label: "Pending",
        color: colors.warning,
        icon: "time-outline" as keyof typeof Ionicons.glyphMap,
      };

    case REMINDER_STATUS.SENT:
      return {
        label: "Sent",
        color: colors.success,
        icon: "checkmark-circle-outline" as keyof typeof Ionicons.glyphMap,
      };

    case REMINDER_STATUS.FAILED:
      return {
        label: "Failed",
        color: colors.danger,
        icon: "alert-circle-outline" as keyof typeof Ionicons.glyphMap,
      };

    case REMINDER_STATUS.CANCELLED:
      return {
        label: "Cancelled",
        color: colors.muted,
        icon: "close-circle-outline" as keyof typeof Ionicons.glyphMap,
      };

    default:
      return {
        label: "Unknown",
        color: colors.muted,
        icon: "help-circle-outline" as keyof typeof Ionicons.glyphMap,
      };
  }
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

  listContent: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 34,
  },

  emptyContent: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 34,
  },

  compactHeader: {
    minHeight: 122,
    borderRadius: 28,
    padding: 16,
    marginBottom: 12,
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

  headerRow: {
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
    fontSize: 28,
    lineHeight: 33,
    fontWeight: "900",
    marginTop: 3,
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 2,
  },

  headerAddButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 12,
    marginBottom: 9,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  cardTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
  },

  cardSub: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 3,
  },

  cardDivider: {
    height: 1,
    marginTop: 12,
    marginBottom: 11,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  statusPill: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },

  notificationPill: {
    minHeight: 30,
    maxWidth: 150,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  notificationText: {
    fontSize: 11,
    fontWeight: "900",
  },

  emptyCard: {
    borderRadius: 30,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    marginTop: 14,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 7,
    fontWeight: "700",
    opacity: 0.76,
  },

  emptyButton: {
    minHeight: 44,
    borderRadius: 18,
    paddingHorizontal: 15,
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  emptyButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },

  footerSpace: {
    height: 18,
  },
});