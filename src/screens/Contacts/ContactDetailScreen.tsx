import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  Modal,
  Platform,
  RefreshControl,
  ImageBackground,
  Dimensions,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { ContactsStackParamList } from "../../navigation/ContactsStack";
import { Contact } from "../../contacts/types";
import {
  deleteContact,
  fetchContactById,
  updateContact,
} from "../../contacts/repository";
import { EventDTO, EventTypeValue, EVENT_TYPE_META } from "../../events/types";
import { fetchEventsForContact } from "../../events/repository";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { formatDateEU } from "../../lib/date";
import { fetchInteractionForContact } from "../../interactions/repository";
import {
  Interaction,
  interactionTypeLabel,
} from "../../interactions/types";
import {
  fetchMemoriesForContact,
  createContactMemory,
  updateContactMemory,
  deleteContactMemory,
} from "../../memories/repository";
import { ContactMemory } from "../../memories/types";
import { MEMORY_TYPES } from "../../memories/helper";

type Props = NativeStackScreenProps<ContactsStackParamList, "ContactDetail">;

type MemoryType = "note" | "important" | "ask_next_time" | "date";

const BG = "#F7EFE7";
const CARD = "#FFF9F1";
const TEXT = "#2B211B";
const MUTED = "#7B6F66";
const BORDER = "#EEDDD0";
const RED = "#EE6A5E";
const RED_DARK = "#D94C43";
const ORANGE = "#EBA55B";
const GREEN = "#7DA56D";
const PURPLE = "#8A6BD8";
const BLUE = "#4D82D8";
const HEART_GOLD = "#F4B23E";
const SCREEN_WIDTH = Dimensions.get("window").width;
const NEXT_SLIDE_WIDTH = SCREEN_WIDTH - 58;
const DEFAULT_HERO =
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200";

function parseDate(value?: string | null) {
  if (!value) return null;

  const normalized = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

function todayStart() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date) {
  const ms = 24 * 60 * 60 * 1000;
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());

  return Math.round((b.getTime() - a.getTime()) / ms);
}

function daysSince(value?: string | null) {
  const date = parseDate(value);
  if (!date) return null;

  return daysBetween(date, todayStart());
}

function daysUntil(value?: string | null) {
  const date = parseDate(value);
  if (!date) return null;

  return daysBetween(todayStart(), date);
}

function daysUntilBirthday(value?: string | null) {
  const birthday = parseDate(value);
  if (!birthday) return null;

  const today = todayStart();
  const next = new Date(
    today.getFullYear(),
    birthday.getMonth(),
    birthday.getDate()
  );

  if (next.getTime() < today.getTime()) {
    next.setFullYear(next.getFullYear() + 1);
  }

  return daysBetween(today, next);
}

function formatShortDate(value?: string | null) {
  const date = parseDate(value);
  if (!date) return "Not set";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatPrettyDate(value?: string | null) {
  const date = parseDate(value);
  if (!date) return "Not set";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatMonthYear(value?: string | null) {
  const date = parseDate(value);
  if (!date) return "—";

  return date.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayLabel(value?: string | null) {
  const date = parseDate(value);
  if (!date) return "Unknown";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function fullName(contact: Contact) {
  return `${contact.first_name || ""} ${contact.last_name || ""}`.trim();
}

function initials(contact: Contact) {
  const first = contact.first_name?.[0] ?? "";
  const last = contact.last_name?.[0] ?? "";

  return `${first}${last}`.toUpperCase() || "?";
}

function iconForEventType(type: number) {
  return EVENT_TYPE_META[type as EventTypeValue]?.icon ?? "✨";
}

function labelForEventType(type: number) {
  return EVENT_TYPE_META[type as EventTypeValue]?.label ?? "Event";
}

function getAny<T = any>(item: unknown, key: string): T | undefined {
  if (!item || typeof item !== "object") return undefined;
  return (item as Record<string, T>)[key];
}

function withOpacity(hexColor?: string | null, opacityHex = "22") {
  if (!hexColor || typeof hexColor !== "string") return `#000000${opacityHex}`;

  const normalized = hexColor.trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
    return `${normalized}${opacityHex}`;
  }

  return normalized;
}

type IoniconName = Extract<keyof typeof Ionicons.glyphMap, string>;

function isIoniconName(
  value?: string | null
): value is IoniconName {
  if (!value) return false;
  return Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, value);
}

function renderSmallIcon(
  icon: string | undefined | null,
  color: string,
  fallback: keyof typeof Ionicons.glyphMap,
  size = 12
) {
  if (isIoniconName(icon)) {
    return <Ionicons name={icon} size={size} color={color} />;
  }

  if (icon && icon.length <= 3) {
    return <Text style={[styles.inlineEmoji, { color }]}>{icon}</Text>;
  }

  return <Ionicons name={fallback} size={size} color={color} />;
}

function getNextAction(memories: ContactMemory[]) {
  const askNext = memories.filter(
    (memory) => memory.memory_type === "ask_next_time"
  );

  const pinned = askNext.find((memory) => memory.is_pinned);

  return pinned ?? askNext[0] ?? null;
}

function getAskNextMemories(memories: ContactMemory[]) {
  return memories
    .filter((memory) => memory.memory_type === "ask_next_time")
    .slice(0, 3);
}

function getImportantMemories(memories: ContactMemory[]) {
  return memories
    .filter((memory) => memory.memory_type === "important" || memory.is_pinned)
    .slice(0, 5);
}

function getMainNotes(contact: Contact, memories: ContactMemory[]) {
  const notes = memories.filter((memory) => memory.memory_type === "note");

  if (notes.length > 0) {
    return notes.slice(0, 2);
  }

  if (contact.notes) {
    return [
      {
        id: "contact-note" as any,
        text: contact.notes,
        memory_type: "note",
        is_pinned: false,
        date: null,
        created_at: "",
        updated_at: "",
      } as ContactMemory,
    ];
  }

  return [];
}

function getFirstInteractionDate(interactions: Interaction[]) {
  if (!interactions.length) return null;

  const sorted = [...interactions].sort(
    (a, b) =>
      new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime()
  );

  return sorted[0]?.happened_at ?? null;
}

function getLastInteractionDate(contact: Contact, interactions: Interaction[]) {
  return contact.talk_last_at || interactions[0]?.happened_at || null;
}

function lastContactLabel(value?: string | null) {
  const date = parseDate(value);
  if (!date) return "—";

  const since = daysSince(value);

  if (since === null) return formatShortDate(value);
  if (since === 0) return "Today";
  if (since === 1) return "1 day ago";

  return `${since} days ago`;
}
function toYMD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getTalkBaseDate(contact: Contact, interactions: Interaction[]) {
  const lastContacted = getLastInteractionDate(contact, interactions);
  return parseDate(lastContacted) ?? todayStart();
}

function getNextTalkDate(contact: Contact, interactions: Interaction[]) {
  if (!contact.talk_every_days) return null;

  const baseDate = getTalkBaseDate(contact, interactions);
  return addDays(baseDate, contact.talk_every_days);
}

function nextTalkLabel(contact: Contact, interactions: Interaction[]) {
  const nextDate = getNextTalkDate(contact, interactions);
  if (!nextDate) return "Not active";

  const diff = daysBetween(todayStart(), nextDate);

  if (diff < 0) return `Overdue by ${Math.abs(diff)} day${Math.abs(diff) > 1 ? "s" : ""}`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";

  return `In ${diff} days`;
}

function getTalkStatus(contact: Contact, interactions: Interaction[]) {
  if (!contact.talk_every_days) {
    return {
      label: "Off",
      bg: "#EFE6DD",
      fg: MUTED,
    };
  }

  const nextDate = getNextTalkDate(contact, interactions);

  if (!nextDate) {
    return {
      label: "Active",
      bg: "#E8F3E2",
      fg: GREEN,
    };
  }

  const diff = daysBetween(todayStart(), nextDate);

  if (diff < 0) {
    return {
      label: `Overdue ${Math.abs(diff)}d`,
      bg: "#FEE2E2",
      fg: "#B91C1C",
    };
  }

  if (diff === 0) {
    return {
      label: "Due today",
      bg: "#FFF1D8",
      fg: ORANGE,
    };
  }

  return {
    label: "Good",
    bg: "#E8F3E2",
    fg: GREEN,
  };
}
function getHeartFillPercent(score: number) {
  const safeScore = Math.max(0, Math.min(5, score));
  return (safeScore / 5) * 100;
}

function relationshipHealth(contact: Contact, interactions: Interaction[]) {
  const lastContact =
    contact.talk_last_at ||
    interactions[0]?.happened_at?.slice(0, 10) ||
    null;

  const since = daysSince(lastContact);
  const rhythm = contact.talk_every_days;

  if (since === null) {
    return {
      title: "New connection",
      subtitle: "No interaction logged yet",
      color: PURPLE,
      score: 2,
    };
  }

  if (!rhythm) {
    return {
      title: "Strong connection",
      subtitle: since === 0 ? "You talked today" : `You talked ${since} days ago`,
      color: RED,
      score: since <= 7 ? 5 : since <= 14 ? 4 : 3,
    };
  }

  if (since <= rhythm) {
    return {
      title: "Strong connection",
      subtitle: since === 0 ? "You talked today" : `You talked ${since} days ago`,
      color: RED,
      score: 5,
    };
  }

  if (since <= rhythm * 1.25) {
    return {
      title: "Good connection",
      subtitle: "A small check-in would be nice",
      color: ORANGE,
      score: 4,
    };
  }

  if (since <= rhythm * 1.5) {
    return {
      title: "Getting distant",
      subtitle: "Time to reconnect soon",
      color: ORANGE,
      score: 3,
    };
  }

  return {
    title: "Needs attention",
    subtitle: `You haven’t contacted them in ${since} days`,
    color: RED_DARK,
    score: 1,
  };
}

function getMetAt(contact: Contact, interactions: Interaction[]) {
  const directMetAt =
    getAny<string>(contact, "met_at") ||
    getAny<string>(contact, "metAt") ||
    getAny<string>(contact, "met_location") ||
    getAny<string>(contact, "metLocation");

  if (directMetAt) return directMetAt;

  if (interactions.length > 0) {
    const first = [...interactions].sort(
      (a, b) =>
        new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime()
    )[0];

    if (first?.note) return first.note;
  }

  return "Not set";
}

function getRelationshipLabel(contact: Contact) {
  return (
    getAny<string>(contact, "relationship") ||
    getAny<string>(contact, "relationship_label") ||
    contact.group_detail?.name ||
    "Not set"
  );
}

export default function ContactDetailScreen({ route, navigation }: Props) {
  const { contactId } = route.params;
  const isFocused = useIsFocused();
  const { settings } = useAppearance();

  const [contact, setContact] = useState<Contact | null>(null);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [memories, setMemories] = useState<ContactMemory[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState("");
  const [newMemoryType, setNewMemoryType] = useState<MemoryType>("note");
  const [newMemoryDate, setNewMemoryDate] = useState("");
  const [newMemoryDateObj, setNewMemoryDateObj] = useState<Date>(new Date());
  const [showMemoryDatePicker, setShowMemoryDatePicker] = useState(false);
  const [newMemoryPinned, setNewMemoryPinned] = useState(false);
  const [savingMemory, setSavingMemory] = useState(false);
  const [savingTalk, setSavingTalk] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const [contactData, memoriesData, eventsData, interactionsData] =
        await Promise.all([
          fetchContactById(contactId),
          fetchMemoriesForContact(contactId as any),
          fetchEventsForContact(contactId as any, 1),
          fetchInteractionForContact(contactId as any),
        ]);

      setContact(contactData);
      setMemories(memoriesData ?? []);
      setInteractions(interactionsData ?? []);

      const eventResults = Array.isArray(eventsData)
        ? eventsData
        : eventsData?.results ?? [];

      setEvents(eventResults);
    } catch (error) {
      console.log("Failed to load contact profile:", error);
      Alert.alert("Contact", "Could not load this contact.");
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    if (isFocused) {
      loadProfile();
    }
  }, [isFocused, loadProfile]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  async function onRefresh() {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }

  async function toggleFavorite() {
    if (!contact) return;

    const previous = contact;
    const nextValue = !contact.is_favorite;

    setContact({
      ...contact,
      is_favorite: nextValue,
    });

    try {
      const updated = await updateContact(contact.id as any, {
        is_favorite: nextValue,
      });

      setContact(updated);
    } catch {
      setContact(previous);
      Alert.alert("Favorite", "Could not update favorite.");
    }
  }
async function saveTalkCadence(days: number | null) {
  if (!contact || savingTalk) return;

  const previous = contact;

  const nextTalkAt =
    days === null
      ? null
      : toYMD(addDays(getTalkBaseDate(contact, interactions), days));

  const optimisticContact = {
    ...contact,
    talk_every_days: days,
    talk_next_at: nextTalkAt,
  };

  setContact(optimisticContact);

  try {
    setSavingTalk(true);

    const updated = await updateContact(contact.id as any, {
      talk_every_days: days,
      talk_next_at: nextTalkAt,
    } as any);

    setContact(updated);
  } catch (error) {
    console.log("Save talk cadence failed:", error);
    setContact(previous);
    Alert.alert("Prendre des nouvelles", "Could not save this reminder rhythm.");
  } finally {
    setSavingTalk(false);
  }
}
  async function markNextActionDone(memory: ContactMemory) {
    try {
      await updateContactMemory(memory.id as any, {
        memory_type: "note",
        is_pinned: false,
      } as any);

      await loadProfile();
    } catch {
      Alert.alert("Next up", "Could not mark this as done.");
    }
  }

  function resetMemoryForm() {
    setNewMemoryText("");
    setNewMemoryType("note");
    setNewMemoryDate("");
    setNewMemoryDateObj(new Date());
    setShowMemoryDatePicker(false);
    setNewMemoryPinned(false);
  }

  function openCreateMemoryModal(type: MemoryType = "note") {
    resetMemoryForm();
    setNewMemoryType(type);
    setShowMemoryModal(true);
  }

  function onMemoryDateChange(_: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setShowMemoryDatePicker(false);
    }

    if (!selectedDate) return;

    setNewMemoryDateObj(selectedDate);

    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");

    setNewMemoryDate(`${y}-${m}-${d}`);
  }

  async function handleSaveMemory() {
    const text = newMemoryText.trim();
    const date = newMemoryDate.trim();

    if (!text) {
      Alert.alert("Memory required", "Write something to remember.");
      return;
    }

    setSavingMemory(true);

    try {
      await createContactMemory(contactId as any, {
        text,
        memory_type: newMemoryType,
        date: date || null,
        is_pinned: newMemoryPinned,
      });

      resetMemoryForm();
      setShowMemoryModal(false);
      await loadProfile();
    } catch (error) {
      console.log("Save memory failed:", error);
      Alert.alert("Memory", "Could not save memory.");
    } finally {
      setSavingMemory(false);
    }
  }

  async function confirmDeleteMemory(memory: ContactMemory) {
    Alert.alert("Delete memory?", "This memory will be removed.", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteContactMemory(memory.id as any);
            await loadProfile();
          } catch {
            Alert.alert("Memory", "Could not delete memory.");
          }
        },
      },
    ]);
  }

  function confirmDeleteContact() {
    if (!contact) return;

    Alert.alert(
      "Delete contact?",
      "This will remove this contact and their local data from this app.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteContact(contact.id as any);
              navigation.navigate("ContactsList");
            } catch {
              Alert.alert("Delete", "Could not delete contact.");
            }
          },
        },
      ]
    );
  }


  const profile = useMemo(() => {
    if (!contact) return null;

    const nextAction = getNextAction(memories);
    const askNextMemories = getAskNextMemories(memories);
    const importantMemories = getImportantMemories(memories);
    const notes = getMainNotes(contact, memories);
    const health = relationshipHealth(contact, interactions);

    const sortedEvents = [...events].sort((a, b) => {
      const aDays = a.days_until ?? daysUntil(a.next_occurrence) ?? 99999;
      const bDays = b.days_until ?? daysUntil(b.next_occurrence) ?? 99999;

      return aDays - bDays;
    });

    const upcomingEvents = sortedEvents
      .filter(
        (event) =>
          (event.days_until ?? daysUntil(event.next_occurrence) ?? 0) >= 0
      )
      .slice(0, 3);

    const importantDates = sortedEvents.slice(0, 4);
    const recentHistory = interactions.slice(0, 3);

    return {
      nextAction,
      askNextMemories,
      importantMemories,
      notes,
      health,
      upcomingEvents,
      importantDates,
      recentHistory,
    };
  }, [contact, events, interactions, memories]);

  if (loading && !contact) {
    return (
      <Screen>
        <View style={[styles.center, { backgroundColor: "#101010" }]}>
          <ActivityIndicator color={RED} />
        </View>
      </Screen>
    );
  }

  if (!contact || !profile) {
    return (
      <Screen>
        <View style={[styles.center, { backgroundColor: BG }]}>
          <Text style={{ color: TEXT }}>Contact not found.</Text>
        </View>
      </Screen>
    );
  }

  const name = fullName(contact);
  const birthdayLeft = daysUntilBirthday(contact.birthday);

  return (
    <Screen>
      <View style={styles.root}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={RED}
            />
          }
          contentContainerStyle={styles.scrollContent}
        >
          <ProfileHero
            contact={contact}
            name={name}
            onBack={() => navigation.goBack()}
            onFavorite={toggleFavorite}
            onEdit={() =>
              navigation.navigate("EditContact", {
                contactId: contact.id as any,
              })
            }
            onAddTag={() => openCreateMemoryModal("important")}
          />

          <PrimaryActionBar
            onQuickNote={() =>
            navigation.navigate("QuickNote", {
              contactId: contact.id as any,
              contactName: `${contact.first_name || ""} ${
                contact.last_name || ""
              }`.trim(),
            })
          }
          onLogInteraction={() =>
            navigation.navigate("LogInteraction", {
              contactId: contact.id as any,
            })
          }
           onSetReminder={() =>
            navigation.navigate("AddReminder", {
              contactId: contact.id as any,
              contactName: name,
            })
          }
            onSaveMemory={() => openCreateMemoryModal("important")}
          />

          <AboutContactCard
            contact={contact}
            interactions={interactions}
          />

          <RelationshipHealthCard
            health={profile.health}
            contact={contact}
            interactions={interactions}
            saving={savingTalk}
            onSave={saveTalkCadence}
          />
         <NextUpCarousel
    items={profile.askNextMemories}
    onAdd={() => openCreateMemoryModal("ask_next_time")}
    onDone={markNextActionDone}
    onSetReminder={(memory) =>
      navigation.navigate("AddReminder", {
        contactId: contact.id as any,
        contactName: name,
        note: memory.text,
        })
      }
  />

          <MemoryHubCard
          contact={contact}
          importantMemories={profile.importantMemories}
          askNextMemories={profile.askNextMemories}
          notes={profile.notes}
          onAddImportant={() => openCreateMemoryModal("important")}
          onAddAskNext={() => openCreateMemoryModal("ask_next_time")}
          onAddNote={() => openCreateMemoryModal("note")}
          onDelete={confirmDeleteMemory}
        />
          <View style={styles.eventsGridRow}>
            <UpcomingPanel
              variant="half"
              contact={contact}
              events={profile.upcomingEvents}
              birthdayLeft={birthdayLeft}
              onAdd={() =>
                navigation.navigate("AddEvent", {
                  contactId: contact.id as any,
                  contactName: name,
                })
              }
              onOpen={(event) =>
                navigation.navigate("EventDetails", {
                  eventId: event.id as any,
                  eventTitle: event.title,
                  from: "contact",
                  contactId: contact.id as any,
                })
              }
            />

            <ImportantDatesPanel
              variant="half"
              contact={contact}
              events={profile.importantDates}
              onAdd={() =>
                navigation.navigate("AddEvent", {
                  contactId: contact.id as any,
                  contactName: name,
                })
              }
            />
          </View>

          <RecentHistoryPanel
            variant="full"
            interactions={profile.recentHistory}
            onViewAll={() =>
              navigation.navigate("InteractionsHistory", {
                contactId: contact.id as any,
              })
            }
          />

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={confirmDeleteContact}
          >
            <Text style={styles.deleteText}>Delete contact</Text>
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity
          style={styles.floatingAddButton}
          onPress={() => openCreateMemoryModal("note")}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={34} color="#FFFFFF" />
        </TouchableOpacity>

        <MemoryModal
          visible={showMemoryModal}
          text={newMemoryText}
          setText={setNewMemoryText}
          type={newMemoryType}
          setType={setNewMemoryType}
          date={newMemoryDate}
          setDate={setNewMemoryDate}
          dateObj={newMemoryDateObj}
          showDatePicker={showMemoryDatePicker}
          setShowDatePicker={setShowMemoryDatePicker}
          onDateChange={onMemoryDateChange}
          pinned={newMemoryPinned}
          setPinned={setNewMemoryPinned}
          saving={savingMemory}
          onCancel={() => {
            resetMemoryForm();
            setShowMemoryModal(false);
          }}
          onSave={handleSaveMemory}
          settings={settings}
        />
      </View>
    </Screen>
  );
}

function ProfileHero({
  contact,
  name,
  onBack,
  onFavorite,
  onEdit,
  onAddTag,
}: {
  contact: Contact;
  name: string;
  onBack: () => void;
  onFavorite: () => void;
  onEdit: () => void;
  onAddTag: () => void;
}) {
  const tags = contact.tags_detail || [];

  const group = contact.group_detail;
  const groupColor = getAny<string>(group, "color") || RED;
  const groupIcon = getAny<string>(group, "icon");

  return (
    <ImageBackground
      source={{ uri: contact.photo || DEFAULT_HERO }}
      style={styles.hero}
      imageStyle={styles.heroImage}
      blurRadius={3}
    >
      <LinearGradient
        colors={[
          "rgba(8,7,6,0.30)",
          "rgba(8,7,6,0.70)",
          "rgba(8,7,6,0.92)",
        ]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.heroButtonsRow}>
        <TouchableOpacity style={styles.heroCircleButton} onPress={onBack}>
          <Ionicons name="chevron-back" size={23} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.heroRightButtons}>
          <TouchableOpacity style={styles.heroCircleButton} onPress={onFavorite}>
            <Ionicons
              name={contact.is_favorite ? "star" : "star-outline"}
              size={22}
              color={contact.is_favorite ? ORANGE : "#FFFFFF"}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.heroCircleButton} onPress={onEdit}>
            <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.heroContentRow}>
        <View style={styles.heroPortraitBlock}>
          <View style={[styles.sparkle, styles.sparkleOne]}>
            <Text style={styles.sparkleText}>✦</Text>
          </View>
          <View style={[styles.sparkle, styles.sparkleTwo]}>
            <Text style={styles.sparkleText}>✧</Text>
          </View>

          <View style={styles.portraitOuterRing}>
            <View style={styles.portraitInnerRing}>
              {contact.photo ? (
                <Image source={{ uri: contact.photo }} style={styles.portrait} />
              ) : (
                <LinearGradient
                  colors={["#FFD8C2", "#F1B7A8"]}
                  style={styles.portrait}
                >
                  <Text style={styles.portraitInitials}>{initials(contact)}</Text>
                </LinearGradient>
              )}
            </View>
          </View>
        </View>

        <View style={styles.heroTextBlock}>
          <Text style={styles.heroName} numberOfLines={2}>
            {name || "Unnamed contact"}
          </Text>

          <View style={styles.heroMetaRow}>
            <View
              style={[
                styles.heroGroupPill,
                {
                  backgroundColor: withOpacity(groupColor, "30"),
                  borderColor: withOpacity(groupColor, "70"),
                },
              ]}
            >
              {renderSmallIcon(groupIcon, groupColor, "people")}
              <Text
                style={[styles.heroGroupText, { color: groupColor }]}
                numberOfLines={1}
              >
                {group?.name || "No group"}
              </Text>
            </View>

            {group?.name ? (
              <View style={styles.heroMiniGroup}>
                {renderSmallIcon(groupIcon, "#FFFFFF", "people")}
                <Text style={styles.heroMiniGroupText} numberOfLines={1}>
                  {group.name}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.heroQuote} numberOfLines={3}>
            Kind, creative soul who loves deep talks and spontaneous trips. ♡
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.heroTags}
      >
        {tags.length > 0 ? (
          tags.slice(0, 8).map((tag) => {
            const tagColor = getAny<string>(tag, "color") || "#FFFFFF";
            const tagIcon = getAny<string>(tag, "icon");

            return (
              <View
                key={String(tag.id)}
                style={[
                  styles.heroTag,
                  {
                    backgroundColor: withOpacity(tagColor, "26"),
                    borderColor: withOpacity(tagColor, "50"),
                  },
                ]}
              >
                {tagIcon ? renderSmallIcon(tagIcon, tagColor, "pricetag") : null}
                <Text
                  style={[styles.heroTagText, { color: tagColor }]}
                  numberOfLines={1}
                >
                  {tag.name}
                </Text>
              </View>
            );
          })
        ) : (
          <View style={styles.heroTag}>
            <Text style={styles.heroTagText}>No tags yet</Text>
          </View>
        )}

        <TouchableOpacity style={styles.heroTagAdd} onPress={onAddTag}>
          <Ionicons name="add" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    </ImageBackground>
  );
}

function PrimaryActionBar({
  onQuickNote,
  onLogInteraction,
  onSetReminder,
  onSaveMemory,
}: {
  onQuickNote: () => void;
  onLogInteraction: () => void;
  onSetReminder: () => void;
  onSaveMemory: () => void;
}) {
  return (
    <View style={styles.primaryActionsCard}>
      <PrimaryAction
        icon="create-outline"
        iconColor={RED}
        title="Quick note"
        subtitle="Capture a thought"
        onPress={onQuickNote}
      />
      <PrimaryAction
        icon="heart-outline"
        iconColor={RED}
        title="Log interaction"
        subtitle="Record a moment"
        onPress={onLogInteraction}
      />
      <PrimaryAction
        icon="notifications-outline"
        iconColor={ORANGE}
        title="Set reminder"
        subtitle="Never forget"
        onPress={onSetReminder}
      />
      <PrimaryAction
        icon="book-outline"
        iconColor={PURPLE}
        title="Save memory"
        subtitle="Keep it forever"
        onPress={onSaveMemory}
      />
    </View>
  );
}

function PrimaryAction({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.primaryAction} onPress={onPress}>
      <Ionicons name={icon} size={26} color={iconColor} />
      <Text style={styles.primaryActionTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.primaryActionSubtitle} numberOfLines={1}>
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

function AboutContactCard({
  contact,
  interactions,
}: {
  contact: Contact;
  interactions: Interaction[];
}) {
  const firstMet = getFirstInteractionDate(interactions);
  const lastContacted = getLastInteractionDate(contact, interactions);

  return (
    <View style={styles.aboutCard}>
      <Text style={styles.aboutTitle}>
        ABOUT {contact.first_name?.toUpperCase() || "CONTACT"}
      </Text>

      <View style={styles.aboutGrid}>
        <AboutItem
          icon="calendar-outline"
          iconColor={RED}
          label="Birthday"
          value={contact.birthday ? formatShortDate(contact.birthday) : "Not set"}
        />

        <AboutItem
          icon="star-outline"
          iconColor={ORANGE}
          label="Met at"
          value={getMetAt(contact, interactions)}
        />

        <AboutItem
          icon="call-outline"
          iconColor={GREEN}
          label="Phone"
          value={contact.phone || "Not set"}
        />

        <AboutItem
          icon="heart-outline"
          iconColor={RED}
          label="Relationship"
          value={getRelationshipLabel(contact)}
        />

        <AboutItem
          icon="calendar-number-outline"
          iconColor={GREEN}
          label="Known since"
          value={firstMet ? formatMonthYear(firstMet) : formatMonthYear(contact.created_at)}
        />

        <AboutItem
          icon="time-outline"
          iconColor={ORANGE}
          label="Last contacted"
          value={lastContactLabel(lastContacted)}
        />
      </View>
    </View>
  );
}

function AboutItem({
  icon,
  customIcon,
  iconColor,
  label,
  value,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  customIcon?: React.ReactNode;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.aboutItem}>
      <View style={styles.aboutIconWrap}>
        {customIcon ?? (
          <Ionicons name={icon || "ellipse-outline"} size={15} color={iconColor} />
        )}
      </View>

      <View style={styles.aboutTextWrap}>
        <Text style={styles.aboutLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.aboutValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function RelationshipHealthCard({
  health,
  contact,
  interactions,
  saving,
  onSave,
}: {
  health: ReturnType<typeof relationshipHealth>;
  contact: Contact;
  interactions: Interaction[];
  saving: boolean;
  onSave: (days: number | null) => void;
}) {
  const enabled = !!contact.talk_every_days;
  const cadence = contact.talk_every_days ?? 7;
  const fillPercent = getHeartFillPercent(health.score);
  const status = getTalkStatus(contact, interactions);
  const lastContacted = getLastInteractionDate(contact, interactions);
  const presets = [7, 14, 30];

  const [customOpen, setCustomOpen] = useState(false);
  const [customDays, setCustomDays] = useState(String(cadence));

  useEffect(() => {
    setCustomDays(String(contact.talk_every_days ?? 21));
  }, [contact.talk_every_days]);

  const customActive = enabled && !presets.includes(cadence);

  function openCustom() {
    setCustomDays(String(contact.talk_every_days ?? 21));
    setCustomOpen(true);
  }

  function saveCustomCadence() {
    const parsed = Number.parseInt(customDays.trim(), 10);

    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 365) {
      Alert.alert(
        "Prendre des nouvelles",
        "Enter a number between 1 and 365 days."
      );
      return;
    }

    setCustomOpen(false);
    onSave(parsed);
  }

  return (
    <View style={styles.connectionCompactCard}>
      <View style={styles.connectionCompactHeader}>
        <View style={styles.connectionCompactLeft}>
          <View style={styles.connectionCompactIconCircle}>
            <HeartStrengthIcon score={health.score} />
          </View>

          <View style={styles.connectionCompactTextWrap}>
            <View style={styles.connectionCompactEyebrowRow}>
              <Text style={styles.connectionCompactEyebrow}>
                CONNECTION RHYTHM
              </Text>

              <View
                style={[
                  styles.connectionCompactStatus,
                  { backgroundColor: status.bg },
                ]}
              >
                <Text
                  style={[
                    styles.connectionCompactStatusText,
                    { color: status.fg },
                  ]}
                  numberOfLines={1}
                >
                  {status.label}
                </Text>
              </View>
            </View>

            <Text style={styles.connectionCompactTitle} numberOfLines={1}>
              {health.title}
            </Text>

            <Text style={styles.connectionCompactSubtitle} numberOfLines={1}>
              {health.subtitle}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={saving}
          onPress={() => onSave(enabled ? null : 7)}
        >
          <View
            style={[
              styles.connectionCompactToggle,
              enabled && styles.connectionCompactToggleActive,
              saving && styles.connectionCompactSaving,
            ]}
          >
            <View
              style={[
                styles.connectionCompactKnob,
                enabled && styles.connectionCompactKnobActive,
              ]}
            />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.connectionCompactProgressTrack}>
        <View
          style={[
            styles.connectionCompactProgressFill,
            { width: `${fillPercent}%` },
          ]}
        />
      </View>

      <View style={styles.rhythmCompactBox}>
        <View style={styles.rhythmCompactTopRow}>
          <View style={styles.rhythmCompactTextWrap}>
            <Text style={styles.rhythmCompactLabel}>
              Prendre des nouvelles
            </Text>
            <Text style={styles.rhythmCompactValue} numberOfLines={1}>
              {enabled
                ? `Remind me every ${cadence} day${cadence > 1 ? "s" : ""}`
                : "Reminder rhythm is off"}
            </Text>
          </View>

          <Text style={styles.rhythmNextValue} numberOfLines={1}>
            {nextTalkLabel(contact, interactions)}
          </Text>
        </View>

        {enabled ? (
          <View style={styles.rhythmPresetRow}>
            {presets.map((days) => {
              const active = cadence === days;

              return (
                <TouchableOpacity
                  key={days}
                  activeOpacity={0.85}
                  disabled={saving}
                  style={[
                    styles.rhythmPresetButton,
                    active && styles.rhythmPresetButtonActive,
                  ]}
                  onPress={() => onSave(days)}
                >
                  <Text
                    style={[
                      styles.rhythmPresetText,
                      active && styles.rhythmPresetTextActive,
                    ]}
                  >
                    {days}d
                  </Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={saving}
              style={[
                styles.rhythmPresetButton,
                customActive && styles.rhythmPresetButtonActive,
              ]}
              onPress={openCustom}
            >
              <Text
                style={[
                  styles.rhythmPresetText,
                  customActive && styles.rhythmPresetTextActive,
                ]}
                numberOfLines={1}
              >
                {customActive ? `${cadence}d` : "Custom"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View style={styles.rhythmMetaCompactRow}>
        <RhythmMetaCompactItem
          icon="time-outline"
          color={ORANGE}
          label="Last"
          value={lastContactLabel(lastContacted)}
        />

        <RhythmMetaCompactItem
          icon="notifications-outline"
          color={GREEN}
          label="Next"
          value={nextTalkLabel(contact, interactions)}
        />
      </View>

      <CustomCadenceModal
        visible={customOpen}
        value={customDays}
        saving={saving}
        onChangeText={setCustomDays}
        onCancel={() => setCustomOpen(false)}
        onSave={saveCustomCadence}
      />
    </View>
  );
}

function HeartStrengthIcon({ score }: { score: number }) {
  const fillPercent = getHeartFillPercent(score);

  return (
    <View style={styles.heartStrengthBox}>
      <Ionicons
        name="heart"
        size={30}
        color="#E8DCD3"
        style={styles.heartStrengthLayer}
      />

      <View
        style={[
          styles.heartStrengthFillClip,
          { height: `${fillPercent}%` },
        ]}
      >
        <View style={styles.heartStrengthFillInner}>
          <Ionicons name="heart" size={30} color={HEART_GOLD} />
        </View>
      </View>

      <Ionicons
        name="heart-outline"
        size={30}
        color={HEART_GOLD}
        style={styles.heartStrengthLayer}
      />
    </View>
  );
}

function RhythmMetaCompactItem({
  icon,
  color,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.rhythmMetaCompactItem}>
      <View
        style={[
          styles.rhythmMetaCompactIcon,
          { backgroundColor: withOpacity(color, "18") },
        ]}
      >
        <Ionicons name={icon} size={14} color={color} />
      </View>

      <View style={styles.rhythmMetaCompactTextWrap}>
        <Text style={styles.rhythmMetaCompactLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.rhythmMetaCompactValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function CustomCadenceModal({
  visible,
  value,
  saving,
  onChangeText,
  onCancel,
  onSave,
}: {
  visible: boolean;
  value: string;
  saving: boolean;
  onChangeText: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.cadenceModalOverlay}>
        <View style={styles.cadenceModalCard}>
          <Text style={styles.cadenceModalTitle}>
            Custom check-in rhythm
          </Text>

          <Text style={styles.cadenceModalSubtitle}>
            How many days should pass before we remind you to reconnect?
          </Text>

          <View style={styles.cadenceInputRow}>
            <TextInput
              value={value}
              onChangeText={(text) =>
                onChangeText(text.replace(/[^0-9]/g, ""))
              }
              keyboardType="number-pad"
              placeholder="21"
              placeholderTextColor="#B8A79A"
              maxLength={3}
              style={styles.cadenceInput}
            />
            <Text style={styles.cadenceInputSuffix}>days</Text>
          </View>

          <View style={styles.cadenceModalActions}>
            <TouchableOpacity
              style={styles.cadenceCancelButton}
              onPress={onCancel}
              disabled={saving}
            >
              <Text style={styles.cadenceCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.cadenceSaveButton,
                saving && { opacity: 0.6 },
              ]}
              onPress={onSave}
              disabled={saving}
            >
              <Text style={styles.cadenceSaveText}>
                {saving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}


function NextUpCarousel({
  items,
  onAdd,
  onDone,
  onSetReminder,
}: {
  items: ContactMemory[];
  onAdd: () => void;
  onDone: (memory: ContactMemory) => void;
  onSetReminder: (memory: ContactMemory) => void;
}) {
  const hasItems = items.length > 0;

  return (
    <View style={styles.nextCarouselCard}>
      <View style={[styles.cardTitleRow, styles.nextCarouselHeader]}>
        <View style={styles.cardTitleLeft}>
          <View style={[styles.smallIconBubble, { backgroundColor: "#FFF1D8" }]}>
            <Ionicons name="bulb-outline" size={17} color={ORANGE} />
          </View>

          <View>
            <Text style={styles.cardTitle}>Ask next time</Text>
            <Text style={styles.nextCarouselSubtitle}>
              Swipe through thoughtful things to ask
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={onAdd}>
          <Ionicons name="add" size={21} color={MUTED} />
        </TouchableOpacity>
      </View>

      {hasItems ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={NEXT_SLIDE_WIDTH + 10}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            contentContainerStyle={styles.nextCarouselScroll}
          >
            {items.map((memory, index) => (
              <View key={String(memory.id)} style={styles.nextSlide}>
                <View style={styles.nextSlideTopRow}>
                  <View style={styles.nextBadge}>
                    <Text style={styles.nextBadgeText}>
                      {index + 1}/{items.length}
                    </Text>
                  </View>

                  {memory.is_pinned ? (
                    <View style={styles.pinnedBadge}>
                      <Ionicons name="star" size={11} color={ORANGE} />
                      <Text style={styles.pinnedBadgeText}>Pinned</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.nextSlideText} numberOfLines={4}>
                  {memory.text}
                </Text>

                <View style={styles.nextSlideActions}>
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => onDone(memory)}
                  >
                    <Ionicons name="checkmark-circle" size={17} color="#FFFFFF" />
                    <Text style={styles.doneButtonText}>Mark done</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => onSetReminder(memory)}
                >
                  <Text style={styles.secondaryButtonText}>Set reminder</Text>
                </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.carouselHintRow}>
            {items.slice(0, 5).map((item, index) => (
              <View
                key={String(item.id)}
                style={[
                  styles.carouselDot,
                  index === 0 && styles.carouselDotActive,
                ]}
              />
            ))}
          </View>
        </>
      ) : (
        <TouchableOpacity style={styles.emptyNextSlide} onPress={onAdd}>
          <View style={styles.emptyNextIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={24} color={ORANGE} />
          </View>

          <Text style={styles.emptyNextTitle}>Nothing to ask yet</Text>
          <Text style={styles.emptyNextText}>
            Add something thoughtful to remember for the next conversation.
          </Text>

          <View style={styles.emptyNextButton}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.emptyNextButtonText}>Add ask next time</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

type MemoryHubTab = "important" | "ask_next_time" | "note";

const MEMORY_HUB_TABS: {
  key: MemoryHubTab;
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: "important",
    label: "Important",
    color: RED,
    icon: "sparkles-outline",
  },
  {
    key: "ask_next_time",
    label: "Ask",
    color: ORANGE,
    icon: "chatbubble-ellipses-outline",
  },
  {
    key: "note",
    label: "Notes",
    color: GREEN,
    icon: "document-text-outline",
  },
];

function MemoryHubCard({
  contact,
  importantMemories,
  askNextMemories,
  notes,
  onAddImportant,
  onAddAskNext,
  onAddNote,
  onDelete,
}: {
  contact: Contact;
  importantMemories: ContactMemory[];
  askNextMemories: ContactMemory[];
  notes: ContactMemory[];
  onAddImportant: () => void;
  onAddAskNext: () => void;
  onAddNote: () => void;
  onDelete: (memory: ContactMemory) => void;
}) {
  const [activeTab, setActiveTab] = useState<MemoryHubTab>("important");
  const [journalOpen, setJournalOpen] = useState(false);

  const itemsByTab: Record<MemoryHubTab, ContactMemory[]> = {
    important: importantMemories,
    ask_next_time: askNextMemories,
    note: notes,
  };

  const activeItems = itemsByTab[activeTab];
  const activeConfig =
    MEMORY_HUB_TABS.find((tab) => tab.key === activeTab) ?? MEMORY_HUB_TABS[0];

  const visibleItems = activeItems.slice(0, 3);
  const hiddenCount = Math.max(activeItems.length - visibleItems.length, 0);

  const totalCount =
    importantMemories.length + askNextMemories.length + notes.length;

  function handleAddForActiveTab() {
    if (activeTab === "important") {
      onAddImportant();
      return;
    }

    if (activeTab === "ask_next_time") {
      onAddAskNext();
      return;
    }

    onAddNote();
  }

  return (
    <View style={styles.memoryHubCard}>
      <View style={styles.memoryHubHeader}>
        <View style={styles.cardTitleLeft}>
          <View style={[styles.smallIconBubble, { backgroundColor: "#FFF1D8" }]}>
            <Ionicons name="albums-outline" size={16} color={ORANGE} />
          </View>

          <View>
            <Text style={styles.cardTitle}>Things to remember</Text>
            <Text style={styles.memoryHubSubtitle} numberOfLines={1}>
              {totalCount} saved {totalCount === 1 ? "memory" : "memories"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.memoryHubAddButton}
          onPress={handleAddForActiveTab}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.memoryTabs}>
        {MEMORY_HUB_TABS.map((tab) => {
          const active = activeTab === tab.key;
          const count = itemsByTab[tab.key].length;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.memoryTab,
                active && {
                  backgroundColor: withOpacity(tab.color, "18"),
                  borderColor: withOpacity(tab.color, "55"),
                },
              ]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.85}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={active ? tab.color : MUTED}
              />

              <Text
                style={[
                  styles.memoryTabText,
                  active && { color: tab.color },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>

              <View
                style={[
                  styles.memoryTabCount,
                  active && { backgroundColor: tab.color },
                ]}
              >
                <Text
                  style={[
                    styles.memoryTabCountText,
                    active && { color: "#FFFFFF" },
                  ]}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.memoryPreviewBox}>
        {visibleItems.length === 0 ? (
          <TouchableOpacity
            style={styles.memoryEmptyState}
            onPress={handleAddForActiveTab}
            activeOpacity={0.85}
          >
            <View
              style={[
                styles.memoryEmptyIcon,
                { backgroundColor: withOpacity(activeConfig.color, "18") },
              ]}
            >
              <Ionicons
                name={activeConfig.icon}
                size={22}
                color={activeConfig.color}
              />
            </View>

            <Text style={styles.memoryEmptyTitle}>
              No {activeConfig.label.toLowerCase()} yet
            </Text>

            <Text style={styles.memoryEmptyText}>
              Add something meaningful about {contact.first_name || "this person"}.
            </Text>
          </TouchableOpacity>
        ) : (
          visibleItems.map((memory) => (
            <MemoryHubRow
              key={String(memory.id)}
              memory={memory}
              color={activeConfig.color}
              onDelete={onDelete}
            />
          ))
        )}
      </View>

      <TouchableOpacity
        style={styles.memoryViewAllRow}
        onPress={() => setJournalOpen(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.memoryViewAllText}>
          {hiddenCount > 0
            ? `View all ${activeItems.length} ${activeConfig.label.toLowerCase()}`
            : "Open memory journal"}
        </Text>

        <Ionicons name="chevron-forward" size={17} color={MUTED} />
      </TouchableOpacity>

      <MemoryJournalModal
        visible={journalOpen}
        contact={contact}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        itemsByTab={itemsByTab}
        onClose={() => setJournalOpen(false)}
        onAddImportant={onAddImportant}
        onAddAskNext={onAddAskNext}
        onAddNote={onAddNote}
        onDelete={onDelete}
      />
    </View>
  );
}

function MemoryHubRow({
  memory,
  color,
  onDelete,
}: {
  memory: ContactMemory;
  color: string;
  onDelete: (memory: ContactMemory) => void;
}) {
  const isContactNote = String(memory.id).startsWith("contact-note");

  return (
    <View style={styles.memoryHubRow}>
      <View style={[styles.memoryHubBullet, { backgroundColor: color }]} />

      <View style={styles.memoryHubRowTextWrap}>
        <Text style={styles.memoryHubRowText} numberOfLines={2}>
          {memory.text}
        </Text>

        {memory.date ? (
          <Text style={styles.memoryHubDate} numberOfLines={1}>
            {formatPrettyDate(memory.date)}
          </Text>
        ) : null}
      </View>

      {!isContactNote ? (
        <TouchableOpacity
          style={styles.memoryHubDelete}
          onPress={() => onDelete(memory)}
        >
          <Ionicons name="close" size={16} color={MUTED} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function MemoryJournalModal({
  visible,
  contact,
  activeTab,
  setActiveTab,
  itemsByTab,
  onClose,
  onAddImportant,
  onAddAskNext,
  onAddNote,
  onDelete,
}: {
  visible: boolean;
  contact: Contact;
  activeTab: MemoryHubTab;
  setActiveTab: (tab: MemoryHubTab) => void;
  itemsByTab: Record<MemoryHubTab, ContactMemory[]>;
  onClose: () => void;
  onAddImportant: () => void;
  onAddAskNext: () => void;
  onAddNote: () => void;
  onDelete: (memory: ContactMemory) => void;
}) {
  const activeConfig =
    MEMORY_HUB_TABS.find((tab) => tab.key === activeTab) ?? MEMORY_HUB_TABS[0];

  const activeItems = itemsByTab[activeTab];

  function handleAdd() {
    if (activeTab === "important") {
      onAddImportant();
      return;
    }

    if (activeTab === "ask_next_time") {
      onAddAskNext();
      return;
    }

    onAddNote();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.memoryJournalScreen}>
        <View style={styles.memoryJournalHeader}>
          <TouchableOpacity style={styles.journalCloseButton} onPress={onClose}>
            <Ionicons name="chevron-down" size={22} color={TEXT} />
          </TouchableOpacity>

          <View style={styles.journalTitleWrap}>
            <Text style={styles.journalTitle}>Memory journal</Text>
            <Text style={styles.journalSubtitle} numberOfLines={1}>
              {contact.first_name || "Contact"}’s remembered details
            </Text>
          </View>

          <TouchableOpacity style={styles.journalAddButton} onPress={handleAdd}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.journalTabs}>
          {MEMORY_HUB_TABS.map((tab) => {
            const active = activeTab === tab.key;

            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.journalTab,
                  active && {
                    backgroundColor: withOpacity(tab.color, "18"),
                    borderColor: withOpacity(tab.color, "55"),
                  },
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={active ? tab.color : MUTED}
                />

                <Text
                  style={[
                    styles.journalTabText,
                    active && { color: tab.color },
                  ]}
                >
                  {tab.label}
                </Text>

                <Text
                  style={[
                    styles.journalTabCount,
                    active && { color: tab.color },
                  ]}
                >
                  {itemsByTab[tab.key].length}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.journalListContent}
        >
          {activeItems.length === 0 ? (
            <View style={styles.journalEmpty}>
              <View
                style={[
                  styles.memoryEmptyIcon,
                  { backgroundColor: withOpacity(activeConfig.color, "18") },
                ]}
              >
                <Ionicons
                  name={activeConfig.icon}
                  size={26}
                  color={activeConfig.color}
                />
              </View>

              <Text style={styles.memoryEmptyTitle}>
                No {activeConfig.label.toLowerCase()} yet
              </Text>

              <Text style={styles.memoryEmptyText}>
                Add something meaningful and it will appear here.
              </Text>

              <TouchableOpacity
                style={[
                  styles.journalEmptyButton,
                  { backgroundColor: activeConfig.color },
                ]}
                onPress={handleAdd}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.journalEmptyButtonText}>Add memory</Text>
              </TouchableOpacity>
            </View>
          ) : (
            activeItems.map((memory) => (
              <View key={String(memory.id)} style={styles.journalMemoryCard}>
                <MemoryHubRow
                  memory={memory}
                  color={activeConfig.color}
                  onDelete={onDelete}
                />
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function UpcomingPanel({
  variant = "half",
  contact,
  events,
  birthdayLeft,
  onAdd,
  onOpen,
}: {
  variant?: "half" | "full";
  contact: Contact;
  events: EventDTO[];
  birthdayLeft: number | null;
  onAdd: () => void;
  onOpen: (event: EventDTO) => void;
}) {
  return (
    <View style={[styles.panel, variant === "full" ? styles.panelFull : styles.panelHalf]}>
      <PanelTitle
        icon="calendar-outline"
        color={ORANGE}
        title="Upcoming"
        onPress={onAdd}
      />

      {contact.birthday ? (
        <PanelRow
          emoji="🎂"
          title={`${contact.first_name}'s birthday`}
          subtitle={`${formatShortDate(contact.birthday)}${
            birthdayLeft !== null ? ` · in ${birthdayLeft} days` : ""
          }`}
        />
      ) : null}

      {events.slice(0, 2).map((event) => (
        <TouchableOpacity key={String(event.id)} onPress={() => onOpen(event)}>
          <PanelRow
            emoji={iconForEventType(event.type)}
            title={event.title || labelForEventType(event.type)}
            subtitle={formatPrettyDate(event.next_occurrence)}
          />
        </TouchableOpacity>
      ))}

      {events.length === 0 && !contact.birthday ? (
        <Text style={styles.panelEmpty}>No upcoming reminders.</Text>
      ) : null}
    </View>
  );
}

function ImportantDatesPanel({
  variant = "half",
  contact,
  events,
  onAdd,
}: {
  variant?: "half" | "full";
  contact: Contact;
  events: EventDTO[];
  onAdd: () => void;
}) {
  return (
    <View style={[styles.panel, variant === "full" ? styles.panelFull : styles.panelHalf]}>
      <PanelTitle
        icon="heart-outline"
        color={RED}
        title="Important dates"
        onPress={onAdd}
      />

      {contact.birthday ? (
        <PanelRow
          emoji="🎂"
          title="Birthday"
          subtitle={formatShortDate(contact.birthday)}
        />
      ) : null}

      {events.slice(0, 3).map((event) => (
        <PanelRow
          key={String(event.id)}
          emoji={iconForEventType(event.type)}
          title={event.title || labelForEventType(event.type)}
          subtitle={formatPrettyDate(event.next_occurrence)}
        />
      ))}

      {!contact.birthday && events.length === 0 ? (
        <Text style={styles.panelEmpty}>No dates yet.</Text>
      ) : null}
    </View>
  );
}

function RecentHistoryPanel({
  variant = "full",
  interactions,
  onViewAll,
}: {
  variant?: "half" | "full";
  interactions: Interaction[];
  onViewAll: () => void;
}) {
  return (
    <View style={[styles.panel, variant === "full" ? styles.panelFull : styles.panelHalf]}>
      <PanelTitle
        icon="time-outline"
        color={BLUE}
        title="Recent history"
        onPress={onViewAll}
      />

      {interactions.length === 0 ? (
        <Text style={styles.panelEmpty}>No history yet.</Text>
      ) : (
        interactions.map((item) => (
          <PanelRow
            key={String(item.id)}
            emoji={
              item.type === 1
                ? "📞"
                : item.type === 3
                ? "💬"
                : item.type === 2
                ? "🤝"
                : "☕"
            }
            title={interactionTypeLabel(item.type)}
            subtitle={
              item.note
                ? item.note
                : `${dayLabel(item.happened_at)} ${formatTime(item.happened_at)}`
            }
          />
        ))
      )}
    </View>
  );
}

function PanelTitle({
  icon,
  color,
  title,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.panelTitleRow}>
      <View style={styles.panelTitleLeft}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={[styles.panelTitle, { color }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <TouchableOpacity onPress={onPress}>
        <Ionicons name="add" size={18} color={MUTED} />
      </TouchableOpacity>
    </View>
  );
}

function PanelRow({
  emoji,
  title,
  subtitle,
}: {
  emoji: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.panelRow}>
      <Text style={styles.panelEmoji}>{emoji}</Text>

      <View style={{ flex: 1 }}>
        <Text style={styles.panelRowTitle} numberOfLines={1}>
          {title}
        </Text>

        <Text style={styles.panelRowSubtitle} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function MemoryModal({
  visible,
  settings,
  text,
  setText,
  type,
  setType,
  date,
  setDate,
  dateObj,
  showDatePicker,
  setShowDatePicker,
  onDateChange,
  pinned,
  setPinned,
  saving,
  onCancel,
  onSave,
}: {
  visible: boolean;
  settings: any;
  text: string;
  setText: (value: string) => void;
  type: MemoryType;
  setType: (value: MemoryType) => void;
  date: string;
  setDate: (value: string) => void;
  dateObj: Date;
  showDatePicker: boolean;
  setShowDatePicker: (value: boolean) => void;
  onDateChange: (event: DateTimePickerEvent, selectedDate?: Date) => void;
  pinned: boolean;
  setPinned: (value: boolean) => void;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: settings.cardColor }]}>
          <Text style={[styles.modalTitle, { color: settings.titleColor }]}>
            Add memory
          </Text>

          <Text style={[styles.modalLabel, { color: settings.titleColor }]}>
            What do you want to remember?
          </Text>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Example: Ask about her apartment search."
            placeholderTextColor={settings.textColor + "66"}
            multiline
            textAlignVertical="top"
            style={[
              styles.memoryInput,
              {
                color: settings.textColor,
                borderColor: settings.textColor + "18",
              },
            ]}
          />

          <Text style={[styles.modalLabel, { color: settings.titleColor }]}>
            Type
          </Text>

          <View style={styles.memoryTypeWrap}>
            {MEMORY_TYPES.map((memoryType) => {
              const active = type === memoryType.value;

              return (
                <TouchableOpacity
                  key={memoryType.value}
                  style={[
                    styles.memoryTypeChip,
                    {
                      backgroundColor: active
                        ? settings.primaryColor
                        : settings.textColor + "10",
                      borderColor: active
                        ? settings.primaryColor
                        : settings.textColor + "15",
                    },
                  ]}
                  onPress={() => setType(memoryType.value as MemoryType)}
                >
                  <Text
                    style={[
                      styles.memoryTypeText,
                      {
                        color: active
                          ? settings.buttonTextColor
                          : settings.textColor,
                      },
                    ]}
                  >
                    {memoryType.icon} {memoryType.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {type === "date" ? (
            <>
              <Text style={[styles.modalLabel, { color: settings.titleColor }]}>
                Date
              </Text>

              <TouchableOpacity
                style={[
                  styles.dateButton,
                  {
                    borderColor: settings.primaryColor + "60",
                    backgroundColor: settings.primaryColor + "15",
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text
                  style={[
                    styles.dateButtonText,
                    { color: settings.primaryColor },
                  ]}
                >
                  {formatDateEU(date) || "Pick a date"}
                </Text>
              </TouchableOpacity>

              {date ? (
                <TouchableOpacity onPress={() => setDate("")}>
                  <Text style={styles.clearDateText}>Clear date</Text>
                </TouchableOpacity>
              ) : null}

              {showDatePicker ? (
                <DateTimePicker
                  mode="date"
                  value={dateObj}
                  onChange={onDateChange}
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                />
              ) : null}
            </>
          ) : null}

          <TouchableOpacity
            style={styles.pinRow}
            onPress={() => setPinned(!pinned)}
          >
            <View
              style={[
                styles.pinBox,
                {
                  backgroundColor: pinned ? settings.primaryColor : "transparent",
                  borderColor: settings.primaryColor,
                },
              ]}
            >
              {pinned ? (
                <Text
                  style={{
                    color: settings.buttonTextColor,
                    fontWeight: "900",
                  }}
                >
                  ✓
                </Text>
              ) : null}
            </View>

            <Text style={{ color: settings.textColor, fontWeight: "700" }}>
              Show in important section
            </Text>
          </TouchableOpacity>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={onCancel}
              disabled={saving}
            >
              <Text style={{ color: settings.textColor }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalSaveButton,
                { backgroundColor: settings.buttonColor },
                saving && { opacity: 0.6 },
              ]}
              onPress={onSave}
              disabled={saving}
            >
              <Text
                style={[
                  styles.modalSaveText,
                  { color: settings.buttonTextColor },
                ]}
              >
                {saving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 105,
  },

  hero: {
    height: 236,
    backgroundColor: "#111",
    justifyContent: "flex-start",
  },
  heroImage: {
    resizeMode: "cover",
  },
  heroButtonsRow: {
    position: "absolute",
    left: 8,
    right: 8,
    top: 18,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroRightButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroCircleButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroContentRow: {
    position: "absolute",
    left: 26,
    right: 16,
    top: 62,
    zIndex: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  heroPortraitBlock: {
    width: 128,
    height: 128,
    position: "relative",
  },
  portraitOuterRing: {
    width: 126,
    height: 126,
    borderRadius: 63,
    borderWidth: 1.5,
    borderColor: "rgba(230,194,149,0.95)",
    padding: 3,
  },
  portraitInnerRing: {
    flex: 1,
    borderRadius: 59,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
    overflow: "hidden",
  },
  portrait: {
    width: "100%",
    height: "100%",
    borderRadius: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  portraitInitials: {
    color: RED,
    fontSize: 38,
    fontWeight: "900",
  },
  sparkle: {
    position: "absolute",
    zIndex: 4,
  },
  sparkleOne: {
    left: -10,
    top: 36,
  },
  sparkleTwo: {
    right: -7,
    top: 13,
  },
  sparkleText: {
    color: "#C99A5C",
    fontSize: 13,
  },
  heroTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  heroName: {
    color: "#FFF3E9",
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "500",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  heroGroupPill: {
    maxWidth: 150,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  heroGroupText: {
    fontSize: 10,
    fontWeight: "800",
    maxWidth: 112,
  },
  heroMiniGroup: {
    maxWidth: 110,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  heroMiniGroupText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    opacity: 0.88,
    maxWidth: 86,
  },
  heroQuote: {
    marginTop: 14,
    color: "#F8E7D4",
    fontSize: 12,
    lineHeight: 19,
    fontStyle: "italic",
    fontWeight: "500",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  heroTags: {
    position: "absolute",
    left: 26,
    right: 14,
    bottom: 11,
    zIndex: 7,
    gap: 7,
    paddingRight: 24,
  },
  heroTag: {
    maxWidth: 96,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  heroTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    maxWidth: 72,
  },
  heroTagAdd: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  inlineEmoji: {
    fontSize: 11,
    fontWeight: "800",
  },

  primaryActionsCard: {
    marginHorizontal: 14,
    marginTop: 12,
    backgroundColor: CARD,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    paddingHorizontal: 6,
    paddingVertical: 13,
  },
  primaryAction: {
    flex: 1,
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 3,
  },
  primaryActionTitle: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  primaryActionSubtitle: {
    color: MUTED,
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
  },

  aboutCard: {
    marginHorizontal: 14,
    marginTop: 12,
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  aboutTitle: {
    color: "#8B5E20",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
    marginBottom: 12,
  },
  aboutGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 14,
  },
  aboutItem: {
    width: "33.333%",
    flexDirection: "row",
    alignItems: "flex-start",
    paddingRight: 8,
    gap: 7,
  },
  aboutIconWrap: {
    width: 17,
    alignItems: "center",
    paddingTop: 2,
  },
  aboutTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  aboutLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "700",
  },
  aboutValue: {
    color: TEXT,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    marginTop: 1,
  },

  connectionCard: {
    marginHorizontal: 14,
    marginTop: 12,
    backgroundColor: "#F7EDE5",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8D8CA",
    padding: 14,
  },
  connectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  connectionLabel: {
    color: "#8B5E20",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  connectionMainRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  connectionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF6EC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  heartMeterWrap: {
    width: 25,
    height: 25,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  heartBase: {
    position: "absolute",
  },
  heartFillMask: {
    position: "absolute",
    bottom: 0,
    width: 25,
    overflow: "hidden",
    alignItems: "center",
  },
  heartFill: {
    position: "absolute",
    bottom: 0,
  },
  heartOutline: {
    position: "absolute",
  },
  connectionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  connectionTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
  },
  connectionSubtitle: {
    color: MUTED,
    fontSize: 12,
    marginTop: 2,
    fontWeight: "700",
  },
  connectionBarTrack: {
    width: "100%",
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E8DED6",
    marginTop: 14,
    overflow: "hidden",
  },
  connectionBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#8DAA63",
  },
  connectionMetaList: {
    marginTop: 12,
    gap: 8,
  },
  connectionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  connectionMetaLabel: {
    width: 92,
    color: "#A28F82",
    fontSize: 11,
    fontWeight: "700",
  },
  connectionMetaValue: {
    flex: 1,
    color: "#3A2F28",
    fontSize: 13,
    fontWeight: "700",
  },
  checkInButton: {
    alignSelf: "flex-start",
    marginTop: 14,
    backgroundColor: RED,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  checkInText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  nextCard: {
    marginHorizontal: 14,
    marginTop: 12,
    backgroundColor: CARD,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 15,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  smallIconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFE8E4",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
  },
  nextText: {
    marginTop: 13,
    color: TEXT,
    fontSize: 22,
    lineHeight: 29,
    fontWeight: "800",
  },
  nextSub: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    marginTop: 8,
  },
  nextActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    flexWrap: "wrap",
  },
  doneButton: {
    backgroundColor: RED,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: RED,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  secondaryButtonText: {
    color: RED,
    fontWeight: "900",
    fontSize: 12,
  },

  rememberCard: {
    marginHorizontal: 14,
    marginTop: 12,
    backgroundColor: CARD,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 15,
  },
  memorySection: {
    marginTop: 14,
  },
  memorySectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  memorySectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  emptyText: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    marginTop: 7,
  },
  memoryLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
  },
  memoryBullet: {
    fontSize: 13,
    marginTop: 1,
  },
  memoryText: {
    flex: 1,
    color: TEXT,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },

  eventsGridRow: {
    marginHorizontal: 14,
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch",
  },
  panel: {
    backgroundColor: CARD,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  panelHalf: {
    flex: 1,
    minHeight: 198,
  },
  panelFull: {
    marginHorizontal: 14,
    marginTop: 10,
    minHeight: 170,
  },
  panelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  panelTitleLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  panelTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  panelRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  panelEmoji: {
    fontSize: 15,
    width: 21,
  },
  panelRowTitle: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
  },
  panelRowSubtitle: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
    lineHeight: 15,
  },
  panelEmpty: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },

  deleteButton: {
    marginHorizontal: 14,
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(216,76,67,0.13)",
    alignItems: "center",
  },
  deleteText: {
    color: RED_DARK,
    fontWeight: "900",
  },
  floatingAddButton: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: PURPLE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PURPLE,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 9,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 12,
  },
  memoryInput: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  memoryTypeWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  memoryTypeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  memoryTypeText: {
    fontSize: 13,
    fontWeight: "900",
  },
  dateButton: {
    marginTop: 2,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dateButtonText: {
    fontWeight: "900",
  },
  clearDateText: {
    fontSize: 12,
    color: "#B91C1C",
    marginTop: 6,
    fontWeight: "800",
  },
  pinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  pinBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  modalSaveText: {
    fontWeight: "900",
  },
 nextCarouselCard: {
  marginHorizontal: 14,
  marginTop: 12,
  backgroundColor: CARD,
  borderRadius: 22,
  borderWidth: 1,
  borderColor: BORDER,
  paddingVertical: 15,
},

nextCarouselHeader: {
  paddingHorizontal: 15,
},

nextCarouselSubtitle: {
  color: MUTED,
  fontSize: 11,
  fontWeight: "600",
  marginTop: 2,
},

nextCarouselScroll: {
  paddingHorizontal: 15,
  paddingTop: 14,
},

nextSlide: {
  width: NEXT_SLIDE_WIDTH,
  minHeight: 185,
  backgroundColor: "#FFF4E8",
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "#F0DCCB",
  padding: 16,
  marginRight: 10,
},

nextSlideTopRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

nextBadge: {
  backgroundColor: "#FFFFFF",
  borderRadius: 999,
  paddingHorizontal: 9,
  paddingVertical: 4,
  borderWidth: 1,
  borderColor: "#EBD8C8",
},

nextBadgeText: {
  color: MUTED,
  fontSize: 11,
  fontWeight: "900",
},

pinnedBadge: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  backgroundColor: "#FFF7E8",
  borderRadius: 999,
  paddingHorizontal: 8,
  paddingVertical: 4,
},

pinnedBadgeText: {
  color: ORANGE,
  fontSize: 10,
  fontWeight: "900",
},

nextSlideText: {
  color: TEXT,
  fontSize: 21,
  lineHeight: 29,
  fontWeight: "800",
  marginTop: 14,
},

nextSlideActions: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginTop: 16,
  flexWrap: "wrap",
},

carouselHintRow: {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: 5,
  marginTop: 10,
},

carouselDot: {
  width: 6,
  height: 6,
  borderRadius: 3,
  backgroundColor: "#E2D3C6",
},

carouselDotActive: {
  width: 18,
  backgroundColor: ORANGE,
},

emptyNextSlide: {
  marginHorizontal: 15,
  marginTop: 14,
  backgroundColor: "#FFF4E8",
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "#F0DCCB",
  padding: 16,
  alignItems: "center",
},

emptyNextIcon: {
  width: 48,
  height: 48,
  borderRadius: 24,
  backgroundColor: "#FFF8EF",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 10,
},

emptyNextTitle: {
  color: TEXT,
  fontSize: 16,
  fontWeight: "900",
},

emptyNextText: {
  color: MUTED,
  fontSize: 12,
  lineHeight: 18,
  textAlign: "center",
  marginTop: 5,
  fontWeight: "600",
},

emptyNextButton: {
  marginTop: 13,
  backgroundColor: ORANGE,
  borderRadius: 999,
  paddingHorizontal: 13,
  paddingVertical: 9,
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
},

emptyNextButtonText: {
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: "900",
},


memoryHubCard: {
  marginHorizontal: 14,
  marginTop: 12,
  backgroundColor: CARD,
  borderRadius: 22,
  borderWidth: 1,
  borderColor: BORDER,
  padding: 15,
},

memoryHubHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

memoryHubSubtitle: {
  color: MUTED,
  fontSize: 11,
  fontWeight: "600",
  marginTop: 2,
},

memoryHubAddButton: {
  width: 34,
  height: 34,
  borderRadius: 17,
  backgroundColor: ORANGE,
  alignItems: "center",
  justifyContent: "center",
},

memoryTabs: {
  flexDirection: "row",
  gap: 7,
  marginTop: 14,
},

memoryTab: {
  flex: 1,
  minHeight: 36,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: "#E9D9CA",
  backgroundColor: "#FFFDF9",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  paddingHorizontal: 6,
},

memoryTabText: {
  color: MUTED,
  fontSize: 11,
  fontWeight: "900",
},

memoryTabCount: {
  minWidth: 18,
  height: 18,
  borderRadius: 9,
  backgroundColor: "#F0E2D5",
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 5,
},

memoryTabCountText: {
  color: MUTED,
  fontSize: 10,
  fontWeight: "900",
},

memoryPreviewBox: {
  marginTop: 12,
  borderRadius: 18,
  backgroundColor: "#FFF4E8",
  borderWidth: 1,
  borderColor: "#F0DCCB",
  overflow: "hidden",
},

memoryHubRow: {
  minHeight: 58,
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 10,
  paddingHorizontal: 12,
  paddingVertical: 11,
  borderBottomWidth: 1,
  borderBottomColor: "rgba(0,0,0,0.06)",
},

memoryHubBullet: {
  width: 8,
  height: 8,
  borderRadius: 4,
  marginTop: 6,
},

memoryHubRowTextWrap: {
  flex: 1,
  minWidth: 0,
},

memoryHubRowText: {
  color: TEXT,
  fontSize: 13,
  lineHeight: 18,
  fontWeight: "800",
},

memoryHubDate: {
  color: MUTED,
  fontSize: 11,
  fontWeight: "700",
  marginTop: 4,
},

memoryHubDelete: {
  width: 24,
  height: 24,
  borderRadius: 12,
  alignItems: "center",
  justifyContent: "center",
},

memoryEmptyState: {
  minHeight: 130,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 18,
  paddingVertical: 18,
},

memoryEmptyIcon: {
  width: 48,
  height: 48,
  borderRadius: 24,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 10,
},

memoryEmptyTitle: {
  color: TEXT,
  fontSize: 15,
  fontWeight: "900",
},

memoryEmptyText: {
  color: MUTED,
  fontSize: 12,
  lineHeight: 18,
  fontWeight: "600",
  textAlign: "center",
  marginTop: 5,
},

memoryViewAllRow: {
  marginTop: 12,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

memoryViewAllText: {
  color: MUTED,
  fontSize: 12,
  fontWeight: "900",
},

memoryJournalScreen: {
  flex: 1,
  backgroundColor: BG,
  paddingTop: Platform.OS === "ios" ? 56 : 28,
},

memoryJournalHeader: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingBottom: 14,
},

journalCloseButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: "#FFFDF9",
  borderWidth: 1,
  borderColor: BORDER,
  alignItems: "center",
  justifyContent: "center",
},

journalTitleWrap: {
  flex: 1,
  paddingHorizontal: 12,
},

journalTitle: {
  color: TEXT,
  fontSize: 20,
  fontWeight: "900",
},

journalSubtitle: {
  color: MUTED,
  fontSize: 12,
  fontWeight: "700",
  marginTop: 2,
},

journalAddButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: ORANGE,
  alignItems: "center",
  justifyContent: "center",
},

journalTabs: {
  flexDirection: "row",
  gap: 8,
  paddingHorizontal: 16,
  paddingBottom: 12,
},

journalTab: {
  flex: 1,
  minHeight: 38,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: "#E9D9CA",
  backgroundColor: "#FFFDF9",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 5,
  paddingHorizontal: 8,
},

journalTabText: {
  color: MUTED,
  fontSize: 12,
  fontWeight: "900",
},

journalTabCount: {
  color: MUTED,
  fontSize: 11,
  fontWeight: "900",
},

journalListContent: {
  paddingHorizontal: 16,
  paddingBottom: 34,
},

journalMemoryCard: {
  backgroundColor: "#FFFDF9",
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 18,
  overflow: "hidden",
  marginBottom: 10,
},

journalEmpty: {
  marginTop: 40,
  backgroundColor: "#FFFDF9",
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 22,
  padding: 22,
  alignItems: "center",
},

journalEmptyButton: {
  marginTop: 14,
  borderRadius: 999,
  paddingHorizontal: 14,
  paddingVertical: 10,
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
},

journalEmptyButtonText: {
  color: "#FFFFFF",
  fontSize: 12,
  fontWeight: "900",
},
talkCard: {
  marginHorizontal: 14,
  marginTop: 12,
  backgroundColor: CARD,
  borderRadius: 22,
  borderWidth: 1,
  borderColor: BORDER,
  padding: 15,
},

talkTopRow: {
  flexDirection: "row",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
},

talkTitleWrap: {
  flex: 1,
  minWidth: 0,
},

talkTitle: {
  color: TEXT,
  fontSize: 17,
  fontWeight: "900",
},

talkSubtitle: {
  color: MUTED,
  fontSize: 12,
  fontWeight: "700",
  marginTop: 3,
},

talkStatusPill: {
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 5,
},

talkStatusText: {
  fontSize: 11,
  fontWeight: "900",
},

talkControlCard: {
  marginTop: 14,
  backgroundColor: "#FFF4E8",
  borderRadius: 18,
  borderWidth: 1,
  borderColor: "#F0DCCB",
  paddingHorizontal: 13,
  paddingVertical: 12,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

talkControlText: {
  flex: 1,
  minWidth: 0,
},

talkControlLabel: {
  color: MUTED,
  fontSize: 12,
  fontWeight: "700",
},

talkControlValue: {
  color: TEXT,
  fontSize: 20,
  fontWeight: "900",
  marginTop: 2,
},

talkToggle: {
  width: 52,
  height: 30,
  borderRadius: 15,
  backgroundColor: "#E5DDD5",
  padding: 3,
  justifyContent: "center",
},

talkToggleActive: {
  backgroundColor: RED,
},

talkToggleSaving: {
  opacity: 0.55,
},

talkToggleKnob: {
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: "#FFFFFF",
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
},

talkToggleKnobActive: {
  transform: [{ translateX: 22 }],
},

talkPresetRow: {
  flexDirection: "row",
  gap: 8,
  marginTop: 12,
},

talkPresetButton: {
  flex: 1,
  borderRadius: 999,
  borderWidth: 1,
  borderColor: "#E8D8CA",
  backgroundColor: "#FFFDF9",
  paddingVertical: 9,
  alignItems: "center",
},

talkPresetButtonActive: {
  backgroundColor: "#FFE8E4",
  borderColor: RED,
},

talkPresetText: {
  color: MUTED,
  fontSize: 12,
  fontWeight: "900",
},

talkPresetTextActive: {
  color: RED,
},

talkMetaRow: {
  flexDirection: "row",
  gap: 10,
  marginTop: 13,
},

talkMetaItem: {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
},

talkMetaIcon: {
  width: 32,
  height: 32,
  borderRadius: 16,
  alignItems: "center",
  justifyContent: "center",
},

talkMetaTextWrap: {
  flex: 1,
  minWidth: 0,
},

talkMetaLabel: {
  color: MUTED,
  fontSize: 10,
  fontWeight: "700",
},

talkMetaValue: {
  color: TEXT,
  fontSize: 12,
  fontWeight: "900",
  marginTop: 1,
},

  connectionCompactCard: {
    marginHorizontal: 14,
    marginTop: 12,
    backgroundColor: "#F7EDE5",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8D8CA",
    padding: 13,
  },
  connectionCompactHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  connectionCompactLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  connectionCompactIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF6EC",
    alignItems: "center",
    justifyContent: "center",
  },
  connectionCompactTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  connectionCompactEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  connectionCompactEyebrow: {
    color: "#8B5E20",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  connectionCompactStatus: {
    maxWidth: 92,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  connectionCompactStatusText: {
    fontSize: 9,
    fontWeight: "900",
  },
  connectionCompactTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 3,
  },
  connectionCompactSubtitle: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 1,
  },
  connectionCompactToggle: {
    width: 46,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#E5DDD5",
    padding: 3,
    justifyContent: "center",
  },
  connectionCompactToggleActive: {
    backgroundColor: RED,
  },
  connectionCompactSaving: {
    opacity: 0.55,
  },
  connectionCompactKnob: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  connectionCompactKnobActive: {
    transform: [{ translateX: 19 }],
  },
  connectionCompactProgressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E8DED6",
    marginTop: 11,
    overflow: "hidden",
  },
  connectionCompactProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#8DAA63",
  },
  rhythmCompactBox: {
    marginTop: 11,
    backgroundColor: "#FFF4E8",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0DCCB",
    padding: 11,
  },
  rhythmCompactTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rhythmCompactTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  rhythmCompactLabel: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
  },
  rhythmCompactValue: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  rhythmNextValue: {
    maxWidth: 104,
    color: GREEN,
    fontSize: 12,
    fontWeight: "900",
  },
  rhythmPresetRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 10,
  },
  rhythmPresetButton: {
    flex: 1,
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E8D8CA",
    backgroundColor: "#FFFDF9",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  rhythmPresetButtonActive: {
    backgroundColor: "#FFE8E4",
    borderColor: RED,
  },
  rhythmPresetText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "900",
  },
  rhythmPresetTextActive: {
    color: RED,
  },
  rhythmMetaCompactRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 10,
  },
  rhythmMetaCompactItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minWidth: 0,
  },
  rhythmMetaCompactIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rhythmMetaCompactTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  rhythmMetaCompactLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "700",
  },
  rhythmMetaCompactValue: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 1,
  },
  heartStrengthBox: {
    width: 34,
    height: 34,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heartStrengthLayer: {
    position: "absolute",
    left: 2,
    top: 2,
  },
  heartStrengthFillClip: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    alignItems: "center",
  },
  heartStrengthFillInner: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  cadenceModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 22,
  },
  cadenceModalCard: {
    backgroundColor: CARD,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
  },
  cadenceModalTitle: {
    color: TEXT,
    fontSize: 20,
    fontWeight: "900",
  },
  cadenceModalSubtitle: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 6,
  },
  cadenceInputRow: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F0DCCB",
    backgroundColor: "#FFF4E8",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  cadenceInput: {
    flex: 1,
    color: TEXT,
    fontSize: 28,
    fontWeight: "900",
    padding: 0,
  },
  cadenceInputSuffix: {
    color: MUTED,
    fontSize: 14,
    fontWeight: "900",
  },
  cadenceModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  cadenceCancelButton: {
    flex: 1,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
    paddingVertical: 12,
  },
  cadenceCancelText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "900",
  },
  cadenceSaveButton: {
    flex: 1,
    borderRadius: 15,
    backgroundColor: RED,
    alignItems: "center",
    paddingVertical: 12,
  },
  cadenceSaveText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },

});