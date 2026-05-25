import React from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Alert,
} from "react-native";

import { fetchReminders } from "../../reminders/repository";

import { formatReminder, formatSendAt } from "../../reminders/utils";
import { Screen } from "../../components/Screen";
import { REMINDER_STATUS, ReminderDTO } from "../../events/types";

export default function RemindersScreen() {
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
    load();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading && reminders.length === 0) {
    return (
      <Screen>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text>Loading reminders…</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        {reminders.length === 0 ? (
          <View style={{ padding: 16 }}>
            <Text>No reminders yet.</Text>
            <Text style={{ color: "#666", marginTop: 4 }}>
              They will appear here once created.
            </Text>
          </View>
        ) : (
          <FlatList
            data={reminders}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
            renderItem={({ item }) => (
              <View
                style={{
                  padding: 12,
                  borderBottomWidth: 1,
                  borderColor: "#eee",
                }}
              >
                <Text style={{ fontWeight: "600" }}>
                  {formatReminder(item)}
                </Text>

                <Text style={{ color: "#555", marginTop: 4 }}>
                  Send at: {formatSendAt(item)}
                </Text>

                <Text style={{ color: "#888", marginTop: 2 }}>
                  Status: {statusLabel(item.status)}
                </Text>

                {item.notification_id ? (
                  <Text style={{ color: "#888", marginTop: 2 }}>
                    Local notification scheduled
                  </Text>
                ) : (
                  <Text style={{ color: "#B45309", marginTop: 2 }}>
                    No local notification scheduled
                  </Text>
                )}
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