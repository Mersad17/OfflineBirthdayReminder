import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ContactsStackParamList } from "../../navigation/ContactsStack";

import { Contact } from "../../contacts/types";
import { deleteContact, fetchContactById } from "../../contacts/api";

import { EventDTO } from "../../events/types";
import { fetchAllEvents } from "../../events/api";
import { useIsFocused } from "@react-navigation/native";

type Props = NativeStackScreenProps<ContactsStackParamList, "ContactDetail">;

export default function ContactDetailScreen({ route, navigation }: Props) {
  const { contactId, contactName } = route.params;
  const isFocused = useIsFocused();
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

      // 🔍 Only events for this contact (handles different possible API shapes)
      const related = allEvents.filter((e: any) => {
        if (e.contact_id === contactId) return true;
        if (e.contact === contactId) return true;
        if (e.contact && typeof e.contact === "object" && e.contact.id === contactId)
          return true;
        return false;
      });

      setEvents(related);
    } catch (err) {
      Alert.alert("Error", "Failed to load contact details.");
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  // ✅ Fetch once on mount
  useEffect(() => {
    loadData();
  }, []);
  useEffect(() => {
    if (isFocused){
      loadData();

    }
  }, [isFocused]);
  useEffect(()=>{
    if (!contact)return;
    navigation.setOptions({
      title: contactName || "Contact",
      headerRight:()=>(
        <TouchableOpacity 
          onPress={()=>
            navigation.navigate("EditContact",{
              contactId,
            })
          }
        >
          <Text style={{color:"#1D4ED8",fontWeight:"700"}}>Edit</Text>
        </TouchableOpacity>
      )
    })
  },[contact,contactId])
  // ✅ Single handleAddEvent with onSaved callback
  function handleAddEvent() {
    if (!contact) return;
    navigation.navigate("AddEvent", {
      contactId: contact.id,
      contactName: `${contact.first_name} ${contact.last_name}`,
     
    });
  }

  function iconForType(type: number) {
    if (type === 1) return "🎂";
    if (type === 2) return "💍";
    return "🎉";
  }

  function typeLabel(type: number) {
    if (type === 1) return "Birthday";
    if (type === 2) return "Anniversary";
    return "Custom Event";
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
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading…</Text>
      </View>
    );
  }

  if (!contact) {
    return (
      <View style={styles.center}>
        <Text>Contact not found.</Text>
      </View>
    );
  }
  function confirmDelete(){
    if(!contact) return;
    const contactIdToDelete = contact.id;
    Alert.alert("Delete Contact","Are you sure you want to delete this event?",[
      {text:"Cancel",style: "cancel"},
      {
        text: "Delete",
        style:"destructive",
        onPress: async ()=>{
          try{
            await deleteContact(contactIdToDelete);
            Alert.alert("Contact Deleted with success!");
           
            navigation.navigate("ContactsList");
          }catch{
            Alert.alert("Error","Could not delete contact.");
          }
        }
      }
    ])
  }
  return (
    <ScrollView contentContainerStyle={styles.page}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>🧑‍🤝‍🧑</Text>

        <Text style={styles.headerName}>
          {contact.first_name} {contact.last_name}
        </Text>

        {contact.birthday ? (
          <Text style={styles.headerTitle}>
            🎂 Birthday: {contact.birthday}
          </Text>
        ) : (
          <Text style={styles.headerTitleMuted}>No birthday set</Text>
        )}

        <Text style={styles.confettiBottom}>✨🎊✨</Text>
      </View>

      {/* EVENTS SECTION */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Events</Text>

          <TouchableOpacity style={styles.addButton} onPress={handleAddEvent}>
            <Text style={styles.addButtonText}>＋ Add</Text>
          </TouchableOpacity>
        </View>

        {events.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={{ color: "#777" }}>
              No events yet for this contact.
            </Text>
          </View>
        )}

        {events.map((item, index) => {
          const previous = index > 0 ? events[index - 1] : null;
          const showMonthHeader =
            !previous || previous.month_label !== item.month_label;

          return (
            <View key={item.id}>
              {showMonthHeader && (
                <Text style={styles.monthHeader}>{item.month_label}</Text>
              )}

              <TouchableOpacity
                style={styles.card}
                onPress={() =>
                  navigation.navigate("EventDetails", {
                    eventId: item.id,
                    eventTitle: item.title || typeLabel(item.type),
                    from: "contact",
                    contactId,
                  })
                }
              >
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {iconForType(item.type)} {typeLabel(item.type)}
                </Text>

                <Text style={styles.cardSub} numberOfLines={1}>
                  {item.title || "Untitled Event"} • {item.next_occurrence}
                  {item.days_until < 30 && (
                    <Text style={{ color: "#007AFF" }}>
                      {" "}
                      • {friendlyCountdown(item.days_until)}
                    </Text>
                  )}
                </Text>

                <Text style={styles.cardStatus}>
                  {item.has_reminder
                    ? `🔔 ${item.reminder_count} reminder${
                        item.reminder_count > 1 ? "s" : ""
                      }`
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
    backgroundColor: "#E5F0FF",
    borderWidth: 2,
    borderColor: "#C3D9FF",
  },
  headerEmoji: {
    fontSize: 60,
  },
  headerName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1D4ED8",
    marginTop: 6,
  },
  headerTitle: {
    fontSize: 16,
    color: "#4B5563",
    marginTop: 4,
  },
  headerTitleMuted: {
    fontSize: 16,
    color: "#888",
    marginTop: 4,
  },
  confettiBottom: {
    fontSize: 20,
    opacity: 0.7,
    marginTop: 8,
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
    color: "#1D4ED8",
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#007AFF",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  monthHeader: {
    fontSize: 18,
    fontWeight: "700",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 6,
    color: "#333",
  },
  card: {
    backgroundColor: "#fafafa",
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
    color: "#666",
    fontSize: 14,
    marginTop: 2,
  },
  cardStatus: {
    marginTop: 6,
    fontSize: 13,
    color: "#777",
  },
  emptyBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#eee",
  },
  deleteButton:{
    backgroundColor:"#FEE2E2",
    padding:14,
    borderRadius:12,
    alignItems:"center",
    borderWidth:1,
    borderColor:"#FCA5A5",
  },
  deleteButtonText:{
    color:"#FCA5A5",
    fontWeight:"700",
  },

});
