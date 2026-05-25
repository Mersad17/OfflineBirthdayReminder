import React from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fetchReminders } from "../../reminders/repository";
import { formatReminder, formatSendAt } from "../../reminders/utils";
import { Screen } from "../../components/Screen";
import { REMINDER_STATUS, ReminderDTO } from "../../events/types";
import { useAppearance } from "../../appearance/AppearanceContext";

export default function RemindersScreen({ navigation }: any) {
  const { settings } = useAppearance();

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
      Alert.alert("Error", "Failed to load reminders");
    } finally {
      setLoading(false);
    }
  }

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

  if (loading && reminders.length === 0) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={[styles.loadingText, { color: settings.textColor }]}>Loading reminders…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: settings.titleColor }]}>Reminders</Text>
            <Text style={[styles.subtitle, { color: settings.textColor }]}>Smart reminders connected to people.</Text>
          </View>
<TouchableOpacity
  style={{
    margin: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#111827",
    alignItems: "center",
  }}
  onPress={() => navigation.navigate("AddReminder")}
>
  <Text style={{ color: "#fff", fontWeight: "900" }}>
    Add smart reminder
  </Text>
</TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: settings.buttonColor }]}
            onPress={() => navigation.navigate("AddSmartReminder")}
          >
            <Ionicons name="add" size={18} color={settings.buttonTextColor} />
            <Text style={[styles.addButtonText, { color: settings.buttonTextColor }]}>Smart</Text>
          </TouchableOpacity>
        </View>

        {reminders.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: settings.cardColor }]}> 
            <View style={[styles.emptyIcon, { backgroundColor: settings.primaryColor + "18" }]}> 
              <Ionicons name="notifications-outline" size={28} color={settings.primaryColor} />
            </View>
            <Text style={[styles.emptyTitle, { color: settings.titleColor }]}>No reminders yet</Text>
            <Text style={[styles.emptyText, { color: settings.textColor }]}>Create one for birthdays, check-ins, interviews, promises, or anything you want to remember.</Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: settings.buttonColor }]}
              onPress={() => navigation.navigate("AddSmartReminder")}
            >
              <Text style={[styles.emptyButtonText, { color: settings.buttonTextColor }]}>Create smart reminder</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={reminders}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item }) => (
              <View style={[styles.card, { backgroundColor: settings.cardColor }]}> 
                <View style={styles.cardTopRow}>
                  <View style={[styles.cardIcon, { backgroundColor: statusColor(item.status).bg }]}> 
                    <Ionicons name="notifications-outline" size={18} color={statusColor(item.status).fg} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: settings.titleColor }]} numberOfLines={2}>
                      {formatReminder(item)}
                    </Text>
                    <Text style={[styles.cardSub, { color: settings.textColor }]} numberOfLines={1}>
                      Send at: {formatSendAt(item)}
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View style={[styles.statusPill, { backgroundColor: statusColor(item.status).bg }]}> 
                    <Text style={[styles.statusText, { color: statusColor(item.status).fg }]}>{statusLabel(item.status)}</Text>
                  </View>

                  <Text style={[styles.notificationText, { color: item.notification_id ? "#15803D" : "#B45309" }]}>
                    {item.notification_id ? "Local notification scheduled" : "No local notification scheduled"}
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </Screen>
  );
}

function statusLabel(status: number) {
  switch (status) {
    case REMINDER_STATUS.PENDING:
      return "Pending";
    case REMINDER_STATUS.SENT:
      return "Sent";
    case REMINDER_STATUS.FAILED:
      return "Failed";
    case REMINDER_STATUS.CANCELLED:
      return "Cancelled";
    default:
      return "Unknown";
  }
}

function statusColor(status: number) {
  switch (status) {
    case REMINDER_STATUS.PENDING:
      return { bg: "#FEF3C7", fg: "#B45309" };
    case REMINDER_STATUS.SENT:
      return { bg: "#DCFCE7", fg: "#15803D" };
    case REMINDER_STATUS.FAILED:
      return { bg: "#FEE2E2", fg: "#B91C1C" };
    case REMINDER_STATUS.CANCELLED:
      return { bg: "#E5E7EB", fg: "#4B5563" };
    default:
      return { bg: "#E5E7EB", fg: "#4B5563" };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.75,
    fontWeight: "600",
    marginTop: 2,
  },
  addButton: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },
  listContent: {
    paddingBottom: 22,
    gap: 10,
  },
  card: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
  },
  cardSub: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    opacity: 0.75,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 12,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  notificationText: {
    flex: 1,
    textAlign: "right",
    fontSize: 11,
    fontWeight: "800",
  },
  emptyCard: {
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    opacity: 0.75,
    fontWeight: "600",
    marginTop: 6,
  },
  emptyButton: {
    marginTop: 16,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  emptyButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },
});
