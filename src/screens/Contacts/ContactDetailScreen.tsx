import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useIsFocused } from "@react-navigation/native";

import { ContactsStackParamList } from "../../navigation/ContactsStack";
import { Contact } from "../../contacts/types";
import { deleteContact, fetchContactById } from "../../contacts/api";

import { EventDTO, EventTypeValue, EVENT_TYPE_META } from "../../events/types";
import { fetchAllEvents } from "../../events/api";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";

type Props = NativeStackScreenProps<ContactsStackParamList, "ContactDetail">;

export default function ContactDetailScreen({ route, navigation }: Props) {
  const { contactId, contactName } = route.params;
  const isFocused = useIsFocused();
  const { settings } = useAppearance();

  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<Contact | null>(null);
  const [events, setEvents] = useState<EventDTO[]>([]);

  useEffect(() => {
    if (contactName) navigation.setOptions({ title: contactName });
  }, [contactName, navigation]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const c = await fetchContactById(contactId);
      setContact(c);

      const allEvents = await fetchAllEvents();

      const related = allEvents.filter((e: any) => {
        if (e.contact_id === contactId) return true;
        if (e.contact === contactId) return true;
        if (e.contact && typeof e.contact === "object" && e.contact.id === contactId)
          return true;
        return false;
      });

      setEvents(related);
    } catch {
      Alert.alert("Error", "Failed to load contact details.");
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (isFocused) loadData();
  }, [isFocused, loadData]);

  useEffect(() => {
    if (!contact) return;

    navigation.setOptions({
      title: contactName || "Contact",
      headerRight: () => (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("EditContact", {
              contactId,
            })
          }
        >
          <Text style={{ color: settings.primaryColor, fontWeight: "700" }}>
            Edit
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [contact, contactId, contactName, navigation, settings.primaryColor]);

  function handleAddEvent() {
    if (!contact) return;
    navigation.navigate("AddEvent", {
      contactId: contact.id,
      contactName: `${contact.first_name} ${contact.last_name}`,
    });
  }

  function iconForType(type: number) {
    const meta = EVENT_TYPE_META[type as EventTypeValue];
    return meta?.icon ?? "🎉";
  }

  function typeLabel(type: number) {
    const meta = EVENT_TYPE_META[type as EventTypeValue];
    return meta?.label ?? "Event";
  }

  function friendlyCountdown(days: number) {
    if (days === 0) return "🎉 Today!";
    if (days === 1) return "Tomorrow 🎈";
    if (days < 7) return `in ${days} days`;
    if (days < 30) return `in ${Math.ceil(days / 7)} weeks`;
    return "";
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={settings.primaryColor} />
          <Text style={{ marginTop: 8, color: settings.textColor }}>Loading…</Text>
        </View>
      </Screen>
    );
  }

  if (!contact) {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={{ color: settings.textColor }}>Contact not found.</Text>
        </View>
      </Screen>
    );
  }

  // ✅ must be here (render scope)
  const initials = `${contact.first_name?.[0] || ""}${contact.last_name?.[0] || ""}`.toUpperCase();

  function confirmDelete() {
    if (!contact) return; 
    const contactIdToDelete = contact.id;

    Alert.alert("Delete Contact", "Are you sure you want to delete this contact?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteContact(contactIdToDelete);
            Alert.alert("Contact deleted successfully!");
            navigation.navigate("ContactsList");
          } catch {
            Alert.alert("Error", "Could not delete contact.");
          }
        },
      },
    ]);
  }

  return (
    <Screen scroll>
      <ScrollView contentContainerStyle={styles.page}>
        {/* HEADER */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: settings.cardColor,
              borderColor: settings.primaryColor + "40",
            },
          ]}
        >
          {contact.photo ? (
            <Image source={{ uri: contact.photo }} style={styles.headerAvatarImage} />
          ) : (
            <View
              style={[
                styles.headerAvatarFallback,
                { backgroundColor: settings.primaryColor + "22" },
              ]}
            >
              <Text style={[styles.headerAvatarText, { color: settings.primaryColor }]}>
                {initials || "?"}
              </Text>
            </View>
          )}

          <Text style={[styles.headerName, { color: settings.primaryColor }]}>
            {contact.first_name} {contact.last_name}
          </Text>

          {contact.birthday ? (
            <Text style={[styles.headerTitle, { color: settings.textColor }]}>
              🎂 Birthday: {contact.birthday}
            </Text>
          ) : (
            <Text style={[styles.headerTitleMuted, { color: settings.textColor }]}>
              No birthday set
            </Text>
          )}

          <Text style={[styles.confettiBottom, { color: settings.textColor }]}>
            ✨🎊✨
          </Text>
        </View>

        {/* EVENTS SECTION */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: settings.titleColor }]}>Events</Text>

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: settings.buttonColor }]}
              onPress={handleAddEvent}
            >
              <Text style={[styles.addButtonText, { color: settings.buttonTextColor }]}>
                ＋ Add
              </Text>
            </TouchableOpacity>
          </View>

          {events.length === 0 && (
            <View style={[styles.emptyBox, { backgroundColor: settings.cardColor }]}>
              <Text style={{ color: settings.textColor }}>No events yet for this contact.</Text>
            </View>
          )}

          {events.map((item, index) => {
            const previous = index > 0 ? events[index - 1] : null;
            const showMonthHeader = !previous || previous.month_label !== item.month_label;

            return (
              <View key={item.id}>
                {showMonthHeader && (
                  <Text
                    style={[
                      styles.monthHeader,
                      {
                        backgroundColor: settings.cardColor,
                        color: settings.titleColor,
                      },
                    ]}
                  >
                    {item.month_label}
                  </Text>
                )}

                <TouchableOpacity
                  style={[styles.card, { backgroundColor: settings.cardColor }]}
                  onPress={() =>
                    navigation.navigate("EventDetails", {
                      eventId: item.id,
                      eventTitle: item.title || typeLabel(item.type),
                      from: "contact",
                      contactId,
                    })
                  }
                >
                  <Text style={[styles.cardTitle, { color: settings.titleColor }]} numberOfLines={1}>
                    {iconForType(item.type)} {typeLabel(item.type)}
                  </Text>

                  <Text style={[styles.cardSub, { color: settings.textColor }]} numberOfLines={1}>
                    {item.title || "Untitled Event"} • {item.next_occurrence}
                    {item.days_until < 30 && (
                      <Text style={{ color: settings.primaryColor }}>
                        {" "}
                        • {friendlyCountdown(item.days_until)}
                      </Text>
                    )}
                  </Text>

                  <Text style={[styles.cardStatus, { color: settings.textColor }]}>
                    {item.has_reminder
                      ? `🔔 ${item.reminder_count} reminder${item.reminder_count > 1 ? "s" : ""}`
                      : "⚠️ No reminder"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={confirmDelete}>
          <Text style={styles.deleteButtonText}>Delete Contact</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 16,
    gap: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 26,
    borderRadius: 22,
    alignItems: "center",
    borderWidth: 2,
  },
  headerName: {
    fontSize: 26,
    fontWeight: "800",
    marginTop: 6,
  },
  headerTitle: {
    fontSize: 16,
    marginTop: 4,
  },
  headerTitleMuted: {
    fontSize: 16,
    marginTop: 4,
  },
  confettiBottom: {
    fontSize: 20,
    opacity: 0.7,
    marginTop: 8,
  },

  // ✅ avatar in header
  headerAvatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 8,
    resizeMode: "cover",
  },
  headerAvatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  headerAvatarText: {
    fontSize: 34,
    fontWeight: "800",
  },

  section: {
    marginTop: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  monthHeader: {
    fontSize: 18,
    fontWeight: "700",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 6,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  cardSub: {
    fontSize: 14,
    marginTop: 2,
  },
  cardStatus: {
    marginTop: 6,
    fontSize: 13,
  },
  emptyBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  deleteButton: {
    backgroundColor: "#FEE2E2",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  deleteButtonText: {
    color: "#B91C1C",
    fontWeight: "700",
  },
});
