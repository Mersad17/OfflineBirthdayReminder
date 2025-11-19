import React from "react";
import { View, Text, ActivityIndicator, ScrollView, Button, Modal, TextInput, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ContactsStackParamList } from "../../navigation/ContactsStack";
import { fetchContactById } from "../../contacts/api";
import { Contact } from "../../contacts/types";
import { fetchEvents } from "../../events/api";
import { EventDTO } from "../../events/types";
import { fetchRemindersByEvent, createReminder } from "../../reminders/api";
import { ReminderDTO } from "../../reminders/types";
import { formatReminder, formatSendAt } from "../../reminders/utils";
import { formatFriendly } from "../../events/dateUtils";

type Props = NativeStackScreenProps<ContactsStackParamList, "ContactDetail">;

export default function ContactDetailScreen({ route, navigation }: Props) {
  const { contactId, contactName } = route.params;
  const [loading, setLoading] = React.useState(true);
  const [contact, setContact] = React.useState<Contact | null>(null);
  const [events, setEvents] = React.useState<EventDTO[]>([]);
  const [remindersByEvent, setRemindersByEvent] = React.useState<Record<number, ReminderDTO[]>>({});

  // add-reminder sheet state
  const [sheetVisible, setSheetVisible] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<EventDTO | null>(null);
  const [daysBefore, setDaysBefore] = React.useState("3"); // default preset

  React.useEffect(() => {
    if (contactName) navigation.setOptions({ title: contactName });
  }, [contactName, navigation]);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // 1) contact
        const c = await fetchContactById(contactId);
        setContact(c);

        // 2) all events, but keep only this contact's
        const allEvents = await fetchEvents();
        const mine = allEvents.filter((e) => e.contact === contactId && e.is_active);
        setEvents(mine);

        // 3) reminders per event (parallel)
        const map: Record<number, ReminderDTO[]> = {};
        for (const e of mine) {
          try {
            const r = await fetchRemindersByEvent(e.id);
            map[e.id] = r;
          } catch {
            map[e.id] = [];
          }
        }
        setRemindersByEvent(map);
      } catch (e) {
        Alert.alert("Error", "Failed to load contact details.");
      } finally {
        setLoading(false);
      }
    })();
  }, [contactId]);

  function openAddReminder(e: EventDTO) {
    setSelectedEvent(e);
    setDaysBefore("3");
    setSheetVisible(true);
  }

  async function saveReminder() {
    if (!selectedEvent) return;
    try {
      const payload = { event: selectedEvent.id, days_before: Number(daysBefore) };
      const created = await createReminder(payload);
      // update local state
      setRemindersByEvent((prev) => ({
        ...prev,
        [selectedEvent.id]: [...(prev[selectedEvent.id] || []), created],
      }));
      setSheetVisible(false);
      Alert.alert("Success", "Reminder added.");
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      Alert.alert("Error", detail || "Could not create reminder.");
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading…</Text>
      </View>
    );
  }

  if (!contact) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Text>Contact not found.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Header */}
        <View style={{ padding: 16, borderWidth: 1, borderColor: "#eee", borderRadius: 12 }}>
          <Text style={{ fontSize: 22, fontWeight: "700" }}>{contact.first_name} {contact.last_name}</Text>
          {contact.birthday ? (
            <Text style={{ marginTop: 6, color: "#444" }}>
              🎂 Birthday: {contact.birthday}
            </Text>
          ) : (
            <Text style={{ marginTop: 6, color: "#888" }}>No birthday set</Text>
          )}
        </View>

        {/* Events section */}
        <View>
          <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>Events</Text>

          {events.length === 0 && (
            <View style={{ padding: 12, borderWidth: 1, borderColor: "#eee", borderRadius: 10 }}>
              <Text style={{ marginBottom: 6, color: "#555" }}>No events yet.</Text>
              <Button title="+ Add event" onPress={() => Alert.alert("Coming soon", "Add Event modal will go here.")} />
            </View>
          )}

          {events.map((e) => (
            <View key={e.id} style={{ marginBottom: 12, padding: 12, borderWidth: 1, borderColor: "#eee", borderRadius: 10 }}>
              <Text style={{ fontWeight: "700" }}>
                {iconForEvent(e)} {titleForEvent(e)} • {formatFriendly(new Date(e.date))}
              </Text>

              {/* Reminders list */}
              <View style={{ marginTop: 8 }}>
                {(remindersByEvent[e.id] || []).length === 0 ? (
                  <Text style={{ color: "#888" }}>No reminders yet.</Text>
                ) : (
                  (remindersByEvent[e.id] || [])
                    .sort((a, b) => new Date(a.send_at || 0).getTime() - new Date(b.send_at || 0).getTime())
                    .map((r) => (
                      <View key={r.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderColor: "#f1f1f1" }}>
                        <Text style={{ fontWeight: "600" }}>{formatReminder(r)}</Text>
                        <Text style={{ color: "#666" }}>Send at: {formatSendAt(r)}</Text>
                      </View>
                    ))
                )}
              </View>

              <View style={{ height: 8 }} />
              <Button title="Add reminder" onPress={() => openAddReminder(e)} />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Add Reminder bottom sheet (simple Modal for now) */}
      <Modal visible={sheetVisible} transparent animationType="slide" onRequestClose={() => setSheetVisible(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.2)" }}>
          <View style={{ padding: 16, backgroundColor: "white", borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: "700" }}>
              Add reminder{selectedEvent ? ` for ${titleForEvent(selectedEvent)}` : ""}
            </Text>
            <View style={{ height: 12 }} />
            <Text style={{ marginBottom: 6 }}>Days before</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
              {["0", "1", "3", "7", "14"].map((d) => (
                <Button key={d} title={d === "0" ? "Same day" : `${d}d`} onPress={() => setDaysBefore(d)} />
              ))}
            </View>
            <TextInput
              value={daysBefore}
              onChangeText={setDaysBefore}
              keyboardType="numeric"
              placeholder="Custom days"
              style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, marginBottom: 12 }}
            />
            <Button title="Save reminder" onPress={saveReminder} />
            <View style={{ height: 8 }} />
            <Button title="Cancel" onPress={() => setSheetVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function iconForEvent(e: EventDTO) {
  // you can map your EventTypes here; for now, assume 0 = birthday
  return e.type === 0 ? "🎂" : "🗓️";
}
function titleForEvent(e: EventDTO) {
  return e.type === 0 ? "Birthday" : (e.title || "Custom event");
}
