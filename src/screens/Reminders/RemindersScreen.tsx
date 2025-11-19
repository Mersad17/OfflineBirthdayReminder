import React from "react";
import { View, Text, FlatList, RefreshControl } from "react-native";
import { fetchReminders } from "../../reminders/api";
import { ReminderDTO } from "../../reminders/types";
import { formatReminder, formatSendAt } from "../../reminders/utils";

export default function RemindersScreen() {
  const [reminders, setReminders] = React.useState<ReminderDTO[]>([]);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchReminders();
      // sort by send_at ascending
      const sorted = [...data].sort((a, b) => {
        const aTime = new Date(a.send_at || 0).getTime();
        const bTime = new Date(b.send_at || 0).getTime();
        return aTime - bTime;
      });
      setReminders(sorted);
    } catch {
      alert("Failed to load reminders");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading && reminders.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Loading reminders…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {reminders.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Text>No reminders yet.</Text>
          <Text style={{ color: "#666" }}>They will appear here once created.</Text>
        </View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(r) => String(r.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <View style={{ padding: 12, borderBottomWidth: 1, borderColor: "#eee" }}>
              <Text style={{ fontWeight: "600" }}>{formatReminder(item)}</Text>
              <Text style={{ color: "#555" }}>Send at: {formatSendAt(item)}</Text>
              <Text style={{ color: "#888" }}>Status: {statusLabel(item.status)}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function statusLabel(status: number) {
  switch (status) {
    case 0: return "Pending";
    case 1: return "Sent";
    case 2: return "Skipped";
    default: return "Unknown";
  }
}
