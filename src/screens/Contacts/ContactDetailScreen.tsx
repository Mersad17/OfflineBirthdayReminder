import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useIsFocused } from "@react-navigation/native";

import { ContactsStackParamList } from "../../navigation/ContactsStack";
import { Contact } from "../../contacts/types";
import { deleteContact, fetchContactById, updateContact } from "../../contacts/api";

import { EventDTO, EventTypeValue, EVENT_TYPE_META } from "../../events/types";
import { fetchAllEvents } from "../../events/api";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";

type Props = NativeStackScreenProps<ContactsStackParamList, "ContactDetail">;

function parseYMD(s?: string | null) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function todayDate() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(a: Date, b: Date) {
  const ms = 24 * 60 * 60 * 1000;
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((end - start) / ms);
}

export default function ContactDetailScreen({ route, navigation }: Props) {
  const { contactId, contactName } = route.params;
  const isFocused = useIsFocused();
  const { settings } = useAppearance();

  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<Contact | null>(null);
  const [events, setEvents] = useState<EventDTO[]>([]);

  // talk reminder
  const [talkEveryInput, setTalkEveryInput] = useState("");
  const [savingTalk, setSavingTalk] = useState(false);

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

  // sync input
  useEffect(() => {
    if (!contact) return;
    setTalkEveryInput(contact.talk_every_days ? String(contact.talk_every_days) : "");
  }, [contact]);

  // header button
  useEffect(() => {
    if (!contact) return;

    navigation.setOptions({
      title: contactName || "Contact",
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate("EditContact", { contactId })}>
          <Text style={{ color: settings.primaryColor, fontWeight: "700" }}>Edit</Text>
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

  function todayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const talkStatus = useMemo(() => {
    if (!contact) return { label: "—", bg: settings.textColor + "14", fg: settings.textColor };

    if (!contact.talk_every_days) {
      return { label: "Disabled", bg: settings.textColor + "14", fg: settings.textColor };
    }

    const next = parseYMD(contact.talk_next_at);
    if (!next) {
      return { label: "Active", bg: settings.primaryColor + "22", fg: settings.primaryColor };
    }

    const d = daysBetween(todayDate(), next);

    if (d < 0) return { label: `Overdue ${Math.abs(d)}d`, bg: "#FEE2E2", fg: "#B91C1C" };
    if (d === 0) return { label: "Due today", bg: settings.primaryColor + "22", fg: settings.primaryColor };
    return { label: `Next ${d}d`, bg: settings.primaryColor + "22", fg: settings.primaryColor };
  }, [contact, settings.primaryColor, settings.textColor]);

  async function saveTalkCadence(nextValue?: string) {
    if (!contact) return;

    const raw = (nextValue ?? talkEveryInput).trim();
    const n = raw === "" ? null : Number(raw);

    if (n !== null && (!Number.isFinite(n) || n < 1)) {
      Alert.alert("Invalid", "Enter a number of days (>= 1), or leave empty to disable.");
      return;
    }

    setSavingTalk(true);
    try {
      const updated = await updateContact(contact.id, { talk_every_days: n });
      setContact(updated);
      // keep input consistent
      setTalkEveryInput(n ? String(n) : "");
    } catch {
      Alert.alert("Error", "Could not save talk reminder.");
    } finally {
      setSavingTalk(false);
    }
  }

  async function markTalkedToday() {
    if (!contact) return;

    if (!contact.talk_every_days) {
      Alert.alert("Set a cadence first", "Choose how often you want to talk (days).");
      return;
    }

    setSavingTalk(true);
    try {
      const updated = await updateContact(contact.id, { talk_last_at: todayStr() });
      setContact(updated);
    } catch {
      Alert.alert("Error", "Could not update last talked date.");
    } finally {
      setSavingTalk(false);
    }
  }

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

  const initials = `${contact.first_name?.[0] || ""}${contact.last_name?.[0] || ""}`.toUpperCase();

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
            <View style={[styles.headerAvatarFallback, { backgroundColor: settings.primaryColor + "22" }]}>
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
            <Text style={[styles.headerTitleMuted, { color: settings.textColor }]}>No birthday set</Text>
          )}

          <Text style={[styles.confettiBottom, { color: settings.textColor }]}>✨🎊✨</Text>
        </View>

        {/* ✅ COMPACT TALK REMINDER */}
        <View
          style={[
            styles.talkCard,
            { backgroundColor: settings.cardColor, borderColor: settings.cardColor + "40" },
          ]}
        >
          <View style={styles.talkTopRow}>
            <Text style={[styles.talkTitle, { color: settings.titleColor }]}>Talk</Text>

            <View style={[styles.statusPill, { backgroundColor: talkStatus.bg }]}>
              <Text style={[styles.statusText, { color: talkStatus.fg }]}>{talkStatus.label}</Text>
            </View>

            <TouchableOpacity
              disabled={savingTalk || !contact.talk_every_days}
              onPress={markTalkedToday}
              style={[
                styles.smallBtnOutline,
                { borderColor: settings.primaryColor + "55" },
                (savingTalk || !contact.talk_every_days) && { opacity: 0.5 },
              ]}
            >
              <Text style={{ color: settings.primaryColor, fontWeight: "900" }}>Talked</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.talkBottomRow}>
            <View style={styles.chipsRow}>
              {[7, 14, 30].map((n) => (
                <TouchableOpacity
                  key={n}
                  disabled={savingTalk}
                  onPress={() => saveTalkCadence(String(n))}
                  style={[styles.chip, { borderColor: settings.primaryColor + "55" }]}
                >
                  <Text style={{ color: settings.primaryColor, fontWeight: "900" }}>{n}d</Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                disabled={savingTalk}
                onPress={() => saveTalkCadence("")}
                style={[styles.chipDanger]}
              >
                <Text style={{ color: "#B91C1C", fontWeight: "900" }}>Off</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputRow}>
              <Text style={{ color: settings.textColor + "AA", fontWeight: "700" }}>Every</Text>

              <TextInput
                value={talkEveryInput}
                onChangeText={setTalkEveryInput}
                placeholder="7"
                keyboardType="number-pad"
                placeholderTextColor={settings.textColor + "66"}
                style={[
                  styles.talkInputCompact,
                  {
                    color: settings.titleColor,
                    borderColor: settings.cardColor + "60",
                    backgroundColor: settings.cardColor,
                  },
                ]}
              />

              <Text style={{ color: settings.textColor + "AA", fontWeight: "700" }}>days</Text>

              <TouchableOpacity
                disabled={savingTalk}
                onPress={() => saveTalkCadence()}
                style={[
                  styles.smallBtn,
                  { backgroundColor: settings.buttonColor },
                  savingTalk && { opacity: 0.6 },
                ]}
              >
                <Text style={{ color: settings.buttonTextColor, fontWeight: "900" }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* tiny detail line */}
          <Text style={{ marginTop: 8, fontSize: 12, color: settings.textColor + "99" }}>
            Next: {contact.talk_next_at || "—"} • Last: {contact.talk_last_at || "—"}
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
              <Text style={[styles.addButtonText, { color: settings.buttonTextColor }]}>＋ Add</Text>
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
                      { backgroundColor: settings.cardColor, color: settings.titleColor },
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
                      <Text style={{ color: settings.primaryColor }}> • {friendlyCountdown(item.days_until)}</Text>
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
    gap: 14,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    padding: 24,
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

  headerAvatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
    marginBottom: 8,
    resizeMode: "cover",
  },
  headerAvatarFallback: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  headerAvatarText: {
    fontSize: 32,
    fontWeight: "800",
  },

  // ✅ compact Talk card
  talkCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  talkTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  talkTitle: {
    fontSize: 16,
    fontWeight: "900",
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "900",
  },
  smallBtnOutline: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  talkBottomRow: {
    marginTop: 10,
    gap: 10,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipDanger: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEE2E2",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  talkInputCompact: {
    width: 64,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  smallBtn: {
    marginLeft: "auto",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  section: {
    marginTop: 6,
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
    marginTop: 4,
  },
  deleteButtonText: {
    color: "#B91C1C",
    fontWeight: "700",
  },
});
