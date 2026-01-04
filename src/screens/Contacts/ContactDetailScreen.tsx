import React, { useEffect, useState, useCallback, useMemo ,useRef} from "react";
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
  Animated,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useIsFocused } from "@react-navigation/native";

import { ContactsStackParamList } from "../../navigation/ContactsStack";
import { Contact } from "../../contacts/types";
import { deleteContact, fetchContactById, updateContact } from "../../contacts/api";

import { EventDTO, EventTypeValue, EVENT_TYPE_META } from "../../events/types";
import {  fetchEventsForContact } from "../../events/api";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { formatDateEU } from "../../lib/date";

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

  const [contact, setContact] = useState<Contact | null>(null);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [isEditingTalk, setIsEditingTalk] = useState(false);
  const [loadingContact, setLoadingContact] = useState(true);
const [loadingEvents, setLoadingEvents] = useState(true);

  const [eventsPage, setEventsPage] = useState(1);
  const [eventsCount, setEventsCount] = useState(0);
  const PAGE_SIZE = 20; // doit matcher DRF
  
  // talk reminder
  const [talkEveryInput, setTalkEveryInput] = useState("");
  const [savingTalk, setSavingTalk] = useState(false);
  const talkEnabled = !!contact?.talk_every_days;
  const talkToggleAnim = useRef(
    new Animated.Value(talkEnabled ? 1 : 0)
  ).current;
  
  useEffect(() => {
    Animated.spring(talkToggleAnim, {
      toValue: talkEnabled ? 1 : 0,
      useNativeDriver: false,
      friction: 7,
    }).start();
  }, [talkEnabled]);
  
  useEffect(() => {
    if (contactName) navigation.setOptions({ title: contactName });
  }, [contactName, navigation]);
  const loadContact = useCallback(async () => {
    setLoadingContact(true);
    try {
      const c = await fetchContactById(contactId);
      setContact(c);
    } finally {
      setLoadingContact(false);
    }
  }, [contactId]);
  
  useEffect(() => {
    if (isFocused) {
      loadContact();
    }
  }, [isFocused, loadContact]);
  
  const loadEvents = useCallback(
    async (page: number) => {
      setLoadingEvents(true);
      try {
        const res = await fetchEventsForContact(contactId, page);
        setEvents(res.results);
        setEventsCount(res.count);
      } finally {
        setLoadingEvents(false);
      }
    },
    [contactId]
  );
  useEffect(() => {
    setEventsPage(1);
  }, [contactId]);
  
  useEffect(() => {
    loadEvents(eventsPage);
    scrollRef.current?.scrollTo({ y: 420, animated: true });
  }, [eventsPage, loadEvents]);
  
  const scrollRef = useRef<ScrollView>(null);

// when page changes

useEffect(() => {
  setEventsPage(1);
}, [contactId]);

 
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
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(eventsCount / PAGE_SIZE));
  }, [eventsCount]);
  
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

    const next = parseYMD(formatDateEU(contact.talk_next_at));
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
      setTalkEveryInput(n ? String(n) : "");
      setIsEditingTalk(false); // ✅ AUTO-CLOSE EDIT MODE

    } catch {
      Alert.alert("Error", "Could not save talk reminder.");
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

  if (loadingContact) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={settings.primaryColor} />
        </View>
      </Screen>
    );
  }
  
  function getVisiblePages(current: number, total: number) {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
  
    const pages = new Set<number>();
  
    // first pages
    pages.add(1);
    pages.add(2);
    pages.add(3);
  
    // around current
    if (current > 3 && current < total - 2) {
      pages.add(current - 1);
      pages.add(current);
      pages.add(current + 1);
    }
  
    // last page
    pages.add(total);
  
    return Array.from(pages).sort((a, b) => a - b);
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
              🎂 Birthday: {formatDateEU(contact.birthday)}
            </Text>
          ) : (
            <Text style={[styles.headerTitleMuted, { color: settings.textColor }]}>No birthday set</Text>
          )}

          <Text style={[styles.confettiBottom, { color: settings.textColor }]}>✨🎊✨</Text>
        </View>

        {/* ✅ COMPACT TALK REMINDER */}
       {/* 🔔 TALK TO CONTACT (REFACTORED) */}
<View
  style={[
    styles.talkCard,
    { backgroundColor: settings.cardColor, borderColor: settings.cardColor + "40" },
  ]}
>
  {/* HEADER */}
  <View style={styles.talkTopRow}>
    <Text style={[styles.talkTitle, { color: settings.titleColor }]}>
      Prendre des nouvelles
    </Text>

    {/* TOGGLE */}
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() =>
        talkEnabled
          ? saveTalkCadence("") // OFF
          : saveTalkCadence("7") // ON default
      }
    >
      <Animated.View
        style={[
          styles.toggle,
          {
            backgroundColor: talkToggleAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["#E5E7EB", settings.primaryColor],
            }),
          },
        ]}
      >
        <Animated.View
          style={[
            styles.toggleKnob,
            {
              transform: [
                {
                  translateX: talkToggleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [2, 22],
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  </View>

  {/* OFF STATE */}
  {!talkEnabled && (
    <Text style={{ marginTop: 8, color: settings.textColor + "AA", fontSize: 13 }}>
      Aucun rappel actif pour ce contact.
    </Text>
  )}

  {/* ON STATE */}
{talkEnabled && (
  <>
    {/* ===== READ MODE ===== */}
    {!isEditingTalk && (
      <>
        <Text style={{ marginTop: 10, fontSize: 13, color: settings.textColor }}>
          Activé · Tous les{" "}
          <Text style={{ fontWeight: "900" }}>
            {contact.talk_every_days} jours
          </Text>
        </Text>

        <Text style={{ marginTop: 4, fontSize: 13, color: settings.textColor }}>
          Prochain rappel :{" "}
          <Text style={{ fontWeight: "700" }}>
            {formatDateEU(contact.talk_next_at) || "—"}
          </Text>
        </Text>

        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <TouchableOpacity
            onPress={() => setIsEditingTalk(true)}
            style={[
              styles.smallBtn,
              { backgroundColor: settings.textColor + "22" },
            ]}
          >
            <Text style={{ fontWeight: "900", color: settings.textColor }}>
              Modifier
            </Text>
          </TouchableOpacity>
          
        </View>
      </>
    )}

    {/* ===== EDIT MODE ===== */}
    {isEditingTalk && (
      <>
        {/* FREQUENCY CHIPS */}
        <View style={{ marginTop: 12 }}>
          <Text
            style={{
              color: settings.textColor + "AA",
              fontWeight: "700",
              marginBottom: 6,
            }}
          >
            Tous les
          </Text>

          <View style={styles.chipsRow}>
            {[7, 14, 30].map((n) => (
              <TouchableOpacity
                key={n}
                disabled={savingTalk}
                onPress={() => saveTalkCadence(String(n))}
                style={[
                  styles.chip,
                  contact.talk_every_days === n && {
                    backgroundColor: settings.primaryColor + "22",
                    borderColor: settings.primaryColor,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      contact.talk_every_days === n
                        ? settings.primaryColor
                        : settings.textColor,
                    fontWeight: "900",
                  }}
                >
                  {n} jours
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* MANUAL INPUT */}
        <View style={{ marginTop: 10 }}>
          <Text
            style={{
              color: settings.textColor + "AA",
              fontWeight: "700",
              marginBottom: 6,
            }}
          >
            Ou tous les
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              value={talkEveryInput}
              onChangeText={(v) => {
                if (/^\d*$/.test(v)) setTalkEveryInput(v);
              }}
              keyboardType="number-pad"
              placeholder="ex: 10"
              style={[
                styles.talkInputCompact,
                {
                  borderColor: settings.primaryColor + "55",
                  color: settings.titleColor,
                },
              ]}
              maxLength={3}
            />

            <Text style={{ fontWeight: "700", color: settings.textColor }}>
              jours
            </Text>

            <TouchableOpacity
              disabled={savingTalk || talkEveryInput.trim() === ""}
              onPress={() => saveTalkCadence()}
              style={[
                styles.smallBtn,
                {
                  backgroundColor:
                    talkEveryInput.trim() !== ""
                      ? settings.primaryColor
                      : settings.textColor + "22",
                },
              ]}
            >
              <Text
                style={{
                  color:
                    talkEveryInput.trim() !== ""
                      ? settings.buttonTextColor
                      : settings.textColor,
                  fontWeight: "900",
                }}
              >
                Appliquer
              </Text>
            </TouchableOpacity>
          </View>
        </View>

       
      </>
    )}
  </>
)}
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
                    {item.title || "Untitled Event"} • {formatDateEU(item.next_occurrence)}
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

        {totalPages > 1 && (
  <View style={styles.pagination}>
    {/* PREVIOUS */}
    <TouchableOpacity
      disabled={eventsPage === 1}
      onPress={() => setEventsPage((p) => Math.max(1, p - 1))}
      style={[
        styles.pageBtn,
        eventsPage === 1 && styles.pageBtnDisabled,
      ]}
    >
      <Text>‹</Text>
    </TouchableOpacity>

    {/* PAGE NUMBERS */}
    {getVisiblePages(eventsPage, totalPages).map((page, index, arr) => {
  const prev = arr[index - 1];
  const isGap = prev && page - prev > 1;
  const isActive = page === eventsPage;

  return (
    <React.Fragment key={page}>
      {isGap && <Text style={{ marginHorizontal: 4 }}>…</Text>}

      <TouchableOpacity
        onPress={() => setEventsPage(page)}
        style={[
          styles.pageBtn,
          isActive && styles.pageBtnActive,
        ]}
      >
        <Text
          style={{
            fontWeight: "900",
            color: isActive
              ? settings.buttonTextColor
              : settings.textColor,
          }}
        >
          {page}
        </Text>
      </TouchableOpacity>
    </React.Fragment>
  );
})}


    {/* NEXT */}
    <TouchableOpacity
      disabled={eventsPage === totalPages}
      onPress={() =>
        setEventsPage((p) => Math.min(totalPages, p + 1))
      }
      style={[
        styles.pageBtn,
        eventsPage === totalPages && styles.pageBtnDisabled,
      ]}
    >
      <Text>›</Text>
    </TouchableOpacity>
  </View>
)}

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
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: "center",
  },
  
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    elevation: 2,
  },
  
  talkedButton: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  
  pageBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  
  pageBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  
  pageBtnDisabled: {
    opacity: 0.4,
  },
  
  
});
