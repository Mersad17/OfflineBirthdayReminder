import React from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { createReminder } from "../../reminders/api";
import { fetchEvents } from "../../events/api";
import { EventDTO } from "../../events/types";
import { Screen } from "../../components/Screen";

export default function AddReminderScreen({ navigation }: any) {
  const [events, setEvents] = React.useState<EventDTO[]>([]);
  const [eventId, setEventId] = React.useState<number | null>(null);
  const [days, setDays] = React.useState("3");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const e = await fetchEvents();
        setEvents(e);
        if (e.length > 0) setEventId(e[0].id);
      } catch {
        Alert.alert("Error", "Failed to load events");
      }
    })();
  }, []);

  async function onSave() {
    if (!eventId) {
      Alert.alert("Missing event", "Please select an event.");
      return;
    }
    setSaving(true);
    try {
      await createReminder(eventId, { days_before: Number(days) });
      Alert.alert("Success", "Reminder created!");
      navigation.goBack();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (detail) Alert.alert("Error", detail);
      else Alert.alert("Error", "Failed to create reminder");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll>

    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>Add Reminder</Text>
      <Text>Event ID (temporary dropdown)</Text>
      {events.map((e) => (
        <Button
        key={e.id}
          title={`Event ${e.id} (${e.date})`}
          color={eventId === e.id ? "green" : undefined}
          onPress={() => setEventId(e.id)}
          />
      ))}

      <Text>Days before</Text>
      <TextInput
        keyboardType="numeric"
        value={days}
        onChangeText={setDays}
        style={{ borderWidth: 1, padding: 8 }}
        />

      <Button title={saving ? "Saving..." : "Save"} onPress={onSave} />
    </View>
        </Screen>
  );
}
