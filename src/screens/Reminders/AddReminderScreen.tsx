import React from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";

import { createReminder } from "../../reminders/repository";
import { fetchEvents } from "../../events/repository";
import { EventDTO } from "../../events/types";
import { Screen } from "../../components/Screen";
import { AppId } from "../../contacts/types";

export default function AddReminderScreen({ navigation }: any) {
  const [events, setEvents] = React.useState<EventDTO[]>([]);
  const [eventId, setEventId] = React.useState<AppId | null>(null);
  const [days, setDays] = React.useState("3");
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    async function loadEvents() {
      try {
        const res = await fetchEvents();

        const results: EventDTO[] = Array.isArray(res)
          ? res
          : res.results ?? [];

        if (!mounted) return;

        setEvents(results);

        if (results.length > 0) {
          setEventId(results[0].id);
        }
      } catch (error) {
        console.log("Failed to load events", error);
        Alert.alert("Error", "Failed to load events");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      mounted = false;
    };
  }, []);

  async function onSave() {
    if (!eventId) {
      Alert.alert("Missing event", "Please select an event.");
      return;
    }

    const daysBefore = Number(days);

    if (Number.isNaN(daysBefore) || daysBefore < 0) {
      Alert.alert("Invalid days", "Days before must be 0 or more.");
      return;
    }

    setSaving(true);

    try {
      await createReminder(eventId, {
        days_before: daysBefore,
        time_of_day: "09:00",
      });

      Alert.alert("Success", "Reminder created!");
      navigation.goBack();
    } catch (error: any) {
      console.log("Failed to create reminder", error);

      const detail = error?.response?.data?.detail || error?.message;

      Alert.alert("Error", detail || "Failed to create reminder");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen scroll>
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>
          Add Reminder
        </Text>

        <Text>Event</Text>

        {loading ? (
          <Text>Loading events...</Text>
        ) : events.length === 0 ? (
          <Text>No events found. Create an event first.</Text>
        ) : (
          events.map((event) => (
            <Button
              key={event.id}
              title={`${event.title || "Event"} - ${event.start_date}`}
              color={eventId === event.id ? "green" : undefined}
              onPress={() => setEventId(event.id)}
            />
          ))
        )}

        <Text>Days before</Text>

        <TextInput
          keyboardType="numeric"
          value={days}
          onChangeText={setDays}
          style={{ borderWidth: 1, padding: 8, borderRadius: 8 }}
        />

        <Button
          title={saving ? "Saving..." : "Save"}
          onPress={onSave}
          disabled={saving || !eventId}
        />
      </View>
    </Screen>
  );
}