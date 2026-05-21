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
  Modal,
  Platform,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ContactsStackParamList } from "../../navigation/ContactsStack";
import { Contact } from "../../contacts/types";
import { deleteContact, fetchContactById, updateContact } from "../../contacts/api";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { EventDTO, EventTypeValue, EVENT_TYPE_META } from "../../events/types";
import {  fetchEventsForContact } from "../../events/api";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { formatDateEU } from "../../lib/date";
import { fetchInteractionForContact } from "../../interactions/api";
import { Interaction, interactionTypeLabel } from "../../interactions/types";
import {
  fetchMemoriesForContact,
  createContactMemory,
  updateContactMemory,
  deleteContactMemory,
} from "../../memories/api";
import { ContactMemory } from "../../memories/types";
import { MEMORY_TYPES } from "../../memories/helper";
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
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [newMemoryText, setNewMemoryText] = useState("");
  
  const [newMemoryType, setNewMemoryType] =
    useState<"note" | "important" | "ask_next_time" | "date">("note");
    const [newMemoryDateObj, setNewMemoryDateObj] = useState<Date | undefined>(
  undefined
);
const [showMemoryDatePicker, setShowMemoryDatePicker] = useState(false);
  const [newMemoryDate, setNewMemoryDate] = useState("");
  const [newMemoryPinned, setNewMemoryPinned] = useState(false);
  const [savingMemory, setSavingMemory] = useState(false);
  const [editingMemory, setEditingMemory] = useState<ContactMemory | null>(null);
  const [memories, setMemories] = useState<ContactMemory[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [contact, setContact] = useState<Contact | null>(null);
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [isEditingTalk, setIsEditingTalk] = useState(false);
  const [loadingContact, setLoadingContact] = useState(true);
const [loadingEvents, setLoadingEvents] = useState(true);
const [interactions, setInteractions] = useState<Interaction[]>([]);
const [loadingInteractions, setLoadingInteractions] = useState(false);

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

  const loadMemories = useCallback(async () => {
  setLoadingMemories(true);

  try {
    const data = await fetchMemoriesForContact(contactId);
    setMemories(data);
  } catch (error) {
    console.log("Failed to load memories:", error);
  } finally {
    setLoadingMemories(false);
  }
}, [contactId]);
  const loadRecentInteractions = useCallback(async () => {
  setLoadingInteractions(true);
  try {
    const res = await fetchInteractionForContact(contactId);

    setInteractions(res); 
  } finally {
    setLoadingInteractions(false);
  }
}, [contactId]);

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
  if (isFocused) {
    loadMemories();
  }
}, [isFocused, loadMemories]);
 useEffect(() => {
  if (!isFocused) return;

  loadEvents(eventsPage);
  scrollRef.current?.scrollTo({ y: 420, animated: true });
}, [isFocused, eventsPage, loadEvents]);
  
  const scrollRef = useRef<ScrollView>(null);

// when page changes



useEffect(() => {
  if (isFocused) {
    loadRecentInteractions();
  }
}, [isFocused, loadRecentInteractions]);

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
  const interactionSummary = useMemo(() => {
    if (!Array.isArray(interactions) || interactions.length === 0) {
      return null;
    }
  
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
  
    let countThisMonth = 0;
    let durationThisMonth = 0;
  
    interactions.forEach((i) => {
      const d = new Date(i.happened_at);
      if (d.getMonth() === month && d.getFullYear() === year) {
        countThisMonth += 1;
        if (i.duration_minutes) {
          durationThisMonth += i.duration_minutes;
        }
      }
    });
  
    const last = interactions[0]; // newest first
    const lastLabel = dayLabel(last.happened_at);
  
    return {
      lastLabel,
      countThisMonth,
      durationThisMonth,
    };
  }, [interactions]);
  
  function friendlyCountdown(days: number) {
    if (days === 0) return "🎉 Today!";
    if (days === 1) return "Tomorrow 🎈";
    if (days < 7) return `in ${days} days`;
    if (days < 30) return `in ${Math.ceil(days / 7)} weeks`;
    return "";
  }
  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  
  function dayLabel(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
  
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  
    return d.toLocaleDateString();
  }
  
  const toggleFavorite = async () => {
    if (!contact) return;
  
    const nextValue = !contact.is_favorite;
  
    // optimistic UI
    setContact({ ...contact, is_favorite: nextValue });
  
    try {
      const updated = await updateContact(contact.id, {
        is_favorite: nextValue,
      });
      setContact(updated);
    } catch {
      // rollback on error
      setContact(contact);
      Alert.alert("Error", "Could not update favorite.");
    }
  };
  
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
      setTalkEveryInput(n ? String(n) : "");
      setIsEditingTalk(false); // ✅ AUTO-CLOSE EDIT MODE

    } catch {
      Alert.alert("Error", "Could not save talk reminder.");
    } finally {
      setSavingTalk(false);
    }
  }
  function onMemoryDateChange(_: DateTimePickerEvent, selectedDate?: Date) {
  if (!selectedDate) {
    setShowMemoryDatePicker(false);
    return;
  }

  if (Platform.OS === "android") {
    setShowMemoryDatePicker(false);
  }

  setNewMemoryDateObj(selectedDate);

  const y = selectedDate.getFullYear();
  const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
  const d = String(selectedDate.getDate()).padStart(2, "0");

  setNewMemoryDate(`${y}-${m}-${d}`);
}
  function resetMemoryForm() {
    
  setEditingMemory(null);
  setNewMemoryText("");
  setNewMemoryType("note");
  setNewMemoryDate("");
  setNewMemoryDateObj(new Date());
  setShowMemoryDatePicker(false);
  setNewMemoryPinned(false);
}

function openCreateMemoryModal() {
  resetMemoryForm();
  setShowMemoryModal(true);
}
function openEditMemoryModal(memory: ContactMemory) {
  setEditingMemory(memory);
  setNewMemoryText(memory.text);
  setNewMemoryType(memory.memory_type);
  setNewMemoryDate(memory.date || "");

  if (memory.date) {
    setNewMemoryDateObj(new Date(`${memory.date}T00:00:00`));
  } else {
    setNewMemoryDateObj(new Date());
  }

  setShowMemoryDatePicker(false);
  setNewMemoryPinned(memory.is_pinned);
  setShowMemoryModal(true);
}
async function handleSaveMemory() {
  const cleanText = newMemoryText.trim();
  const cleanDate = newMemoryDate.trim();

  if (!cleanText) {
    Alert.alert("Memory required", "Please write something to remember.");
    return;
  }

  if (cleanDate && !cleanDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    Alert.alert("Invalid date", "Date must be in YYYY-MM-DD format.");
    return;
  }

  setSavingMemory(true);

  try {
    const payload = {
      text: cleanText,
      memory_type: newMemoryType,
      date: cleanDate || null,
      is_pinned: newMemoryPinned,
    };

    if (editingMemory) {
      await updateContactMemory(editingMemory.id, payload);
    } else {
      await createContactMemory(contactId, payload);
    }

    resetMemoryForm();
    setShowMemoryModal(false);

    await loadMemories();
  } catch (e: any) {
    Alert.alert(
      "Error",
      JSON.stringify(e?.response?.data || "Could not save memory.")
    );
  } finally {
    setSavingMemory(false);
  }
}
function confirmDeleteMemory(memory: ContactMemory) {
  Alert.alert(
    "Delete memory?",
    "This memory will be removed from this contact.",
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteContactMemory(memory.id);
            await loadMemories();
          } catch {
            Alert.alert("Error", "Could not delete memory.");
          }
        },
      },
    ]
  );
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
const askNextTimeMemories = memories.filter(
  (memory) => memory.memory_type === "ask_next_time"
);

const importantMemories = memories.filter(
  (memory) =>
    memory.memory_type === "important" ||
    memory.is_pinned
);

const otherMemories = memories.filter(
  (memory) =>
    memory.memory_type !== "ask_next_time" &&
    memory.memory_type !== "important" &&
    !memory.is_pinned
);

function renderMemoryRow(memory: ContactMemory, icon: string) {
  return (
    <View key={memory.id} style={styles.memoryRow}>
      <Text style={styles.memoryBullet}>{icon}</Text>

      <View style={styles.memoryBody}>
        <Text style={[styles.memoryText, { color: settings.textColor }]}>
          {memory.text}
        </Text>

        {memory.date ? (
          <Text
            style={[
              styles.memoryDate,
              { color: settings.textColor + "90" },
            ]}
          >
            {formatDateEU(memory.date)}
          </Text>
        ) : null}
      </View>

      <View style={styles.memoryIconActions}>
        <TouchableOpacity
          style={[
            styles.memoryIconButton,
            { backgroundColor: settings.primaryColor + "14" },
          ]}
          onPress={() => openEditMemoryModal(memory)}
        >
          <Ionicons
            name="create-outline"
            size={15}
            color={settings.primaryColor}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.memoryDeleteButton}
          onPress={() => confirmDeleteMemory(memory)}
        >
          <Ionicons name="trash-outline" size={15} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
  const initials = `${contact.first_name?.[0] || ""}${contact.last_name?.[0] || ""}`.toUpperCase();
const groupColor =
  contact.group_detail?.color || settings.primaryColor;

const groupIcon =
  contact.group_detail?.icon || "people";

const tags = contact.tags_detail || [];

const hasRelationshipInfo =
  !!contact.group_detail?.name || tags.length > 0;

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
        ><TouchableOpacity
        onPress={toggleFavorite}
        style={styles.favoriteBtn}
        activeOpacity={0.8}
      >
        <Text style={styles.favoriteIcon}>
          {contact.is_favorite ? "⭐" : "☆"}
        </Text>
      </TouchableOpacity>
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


          {hasRelationshipInfo && (
            <View style={styles.relationshipWrap}>
    {contact.group_detail?.name && (
      <View
        style={[
          styles.groupPill,
          {
            backgroundColor: groupColor + "18",
            borderColor: groupColor + "60",
          },
        ]}
      >
        <Ionicons
          name={groupIcon as any}
          size={13}
          color={groupColor}
        />

        <Text
          style={[styles.groupPillText, { color: groupColor }]}
          numberOfLines={1}
        >
          {contact.group_detail.name}
        </Text>
      </View>
    )}

    {tags.map((tag) => {
      const tagColor = tag.color || settings.primaryColor;

      return (
        <View
          key={tag.id || tag.name}
          style={[
            styles.tagPill,
            {
              backgroundColor: tagColor + "18",
              borderColor: tagColor + "45",
            },
          ]}
        >
          <Text
            style={[styles.tagPillText, { color: tagColor }]}
            numberOfLines={1}
          >
            #{tag.name}
          </Text>
        </View>
      );
    })}
  </View>
)}
        </View>
<Text style={[styles.confettiBottom, { color: settings.textColor }]}>✨🎊✨</Text>
{/* MEMORIES */}
<View style={styles.memoriesSection}>
  <View style={styles.sectionHeaderRow}>
    <Text style={[styles.sectionTitle, { color: settings.titleColor }]}>
      Memories
    </Text>

    <TouchableOpacity
      style={[styles.addButton, { backgroundColor: settings.buttonColor }]}
    onPress={openCreateMemoryModal}
    >
      <Text style={[styles.addButtonText, { color: settings.buttonTextColor }]}>
        ＋ Add
      </Text>
    </TouchableOpacity>
  </View>

  {loadingMemories && (
    <ActivityIndicator color={settings.primaryColor} />
  )}

  {!loadingMemories && memories.length === 0 && (
    <View style={[styles.emptyBox, { backgroundColor: settings.cardColor }]}>
      <Text style={{ color: settings.textColor }}>
        No memories yet. Add things you want to remember about this person.
      </Text>
    </View>
  )}

  {!loadingMemories && askNextTimeMemories.length > 0 && (
    <View
      style={[
        styles.memoryCard,
        {
          backgroundColor: settings.primaryColor + "12",
          borderColor: settings.primaryColor + "35",
        },
      ]}
    >
      <View style={styles.memorySectionHeader}>
        <Text style={[styles.memorySectionTitle, { color: settings.primaryColor }]}>
          Before you talk
        </Text>
      </View>

      {askNextTimeMemories.map((memory) =>
  renderMemoryRow(memory, "💬")
)}
    </View>
  )}

  {!loadingMemories && importantMemories.length > 0 && (
    <View
      style={[
        styles.memoryCard,
        {
          backgroundColor: settings.cardColor,
          borderColor: settings.cardColor + "50",
        },
      ]}
    >
      <View style={styles.memorySectionHeader}>
        <Text style={[styles.memorySectionTitle, { color: settings.titleColor }]}>
          Important memories
        </Text>
      </View>

      {importantMemories.map((memory) =>
  renderMemoryRow(
    memory,
    memory.memory_type === "date" ? "📅" : "⭐"
  )
)}
    </View>
  )}

  {!loadingMemories && otherMemories.length > 0 && (
    <View
      style={[
        styles.memoryCard,
        {
          backgroundColor: settings.cardColor,
          borderColor: settings.cardColor + "50",
        },
      ]}
    >
      <View style={styles.memorySectionHeader}>
        <Text style={[styles.memorySectionTitle, { color: settings.titleColor }]}>
          Notes
        </Text>
      </View>

   {otherMemories.map((memory) =>
  renderMemoryRow(
    memory,
    memory.memory_type === "date" ? "📅" : "📝"
  )
)}
    </View>
  )}
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
      <View
        style={[
          styles.statusPill,
          { backgroundColor: talkStatus.bg },
        ]}
      >
        <Text style={[styles.statusText, { color: talkStatus.fg }]}>
          {talkStatus.label}
        </Text>
</View>
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
{/* INTERACTIONS */}
<View style={styles.section}>
  <View style={styles.sectionHeaderRow}>
    <Text style={[styles.sectionTitle, { color: settings.titleColor }]}>
      Interactions
    </Text>

    <TouchableOpacity
      style={[styles.addButton, { backgroundColor: settings.buttonColor }]}
      onPress={() =>
        navigation.navigate("LogInteraction", { contactId })
      }
    >
      <Text style={[styles.addButtonText, { color: settings.buttonTextColor }]}>
        ＋ Log
      </Text>
    </TouchableOpacity>
  </View>
  {interactionSummary && (
  <View
    style={[
      styles.summaryBox,
      { backgroundColor: settings.cardColor },
    ]}
  >
    <Text
      style={[
        styles.summaryText,
        { color: settings.textColor },
      ]}
    >
      Last talked:{" "}
      <Text style={{ fontWeight: "800", color: settings.titleColor }}>
        {interactionSummary.lastLabel}
      </Text>
    </Text>

    <Text
      style={[
        styles.summaryText,
        { color: settings.textColor },
      ]}
    >
      This month:{" "}
      <Text style={{ fontWeight: "800", color: settings.titleColor }}>
        {interactionSummary.countThisMonth} interaction
        {interactionSummary.countThisMonth !== 1 ? "s" : ""}
      </Text>
      {interactionSummary.durationThisMonth > 0 && (
        <>
          {" · "}
          <Text style={{ fontWeight: "800", color: settings.titleColor }}>
            ~{Math.round(interactionSummary.durationThisMonth / 60)}h
          </Text>
        </>
      )}
    </Text>
  </View>
)}

  {loadingInteractions && (
    <ActivityIndicator color={settings.primaryColor} />
  )}

  {!loadingInteractions && interactions.length === 0 && (
    <View style={[styles.emptyBox, { backgroundColor: settings.cardColor }]}>
      <Text style={{ color: settings.textColor }}>
        No interactions yet.
      </Text>
    </View>
  )}

  {interactions.map((item, index) => {
    const prev = interactions[index - 1];
    const showDay =
      !prev ||
      dayLabel(prev.happened_at) !== dayLabel(item.happened_at);

    return (
      <View key={item.id}>
        {showDay && (
          <Text
            style={[
              styles.monthHeader,
              { backgroundColor: settings.cardColor, color: settings.titleColor },
            ]}
          >
            {dayLabel(item.happened_at)}
          </Text>
        )}

        <View style={styles.card}>
          <Text style={{ fontWeight: "700", color: settings.titleColor }}>
            {formatTime(item.happened_at)}
            {item.duration_minutes
              ? ` · ${item.duration_minutes} min`
              : ""}
              <Text style={{ fontWeight: "600", color: settings.textColor + "AA" }}>
                {item.type != null ? ` · ${interactionTypeLabel(item.type)}` : ""}
              </Text>
          </Text>

          {item.note && (
            <Text
              numberOfLines={1}
              style={{ marginTop: 4, color: settings.textColor }}
            >
              {item.note}
            </Text>
          )}
        </View>
      </View>
    );
  })}

  {interactions.length > 0 && (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate("InteractionsHistory", { contactId })
      }
      style={{ marginTop: 6 }}
    >
      <Text style={{ color: settings.primaryColor, fontWeight: "700" }}>
        View all interactions →
      </Text>
    </TouchableOpacity>
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

          {loadingEvents && (
          <View style={[styles.emptyBox, { backgroundColor: settings.cardColor }]}>
            <ActivityIndicator color={settings.primaryColor} />

            <Text
              style={{
                marginTop: 8,
                color: settings.textColor,
                textAlign: "center",
              }}
            >
              Loading events...
            </Text>
          </View>
        )}
      {!loadingEvents && events.length === 0 && (
        <View style={[styles.emptyBox, { backgroundColor: settings.cardColor }]}>
          <Text style={{ color: settings.textColor }}>
            No events yet for this contact.
          </Text>
        </View>
      )}

      {!loadingEvents && events.map((item, index) => {

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

        {!loadingEvents && totalPages > 1 && (
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
      <Modal
  visible={showMemoryModal}
  transparent
  animationType="fade"
  onRequestClose={() => setShowMemoryModal(false)}
>
  <View style={styles.modalOverlay}>
    <View
      style={[
        styles.modalCard,
        { backgroundColor: settings.cardColor },
      ]}
    >
      <Text style={[styles.modalTitle, { color: settings.titleColor }]}>
       {editingMemory ? "Edit memory" : "Add memory"}
      </Text>

      <Text style={[styles.modalLabel, { color: settings.titleColor }]}>
        What do you want to remember?
      </Text>

      <TextInput
        value={newMemoryText}
        onChangeText={setNewMemoryText}
        placeholder="Example: She is looking for a new apartment."
        placeholderTextColor={settings.textColor + "66"}
        multiline
        textAlignVertical="top"
        style={[
          styles.memoryInput,
          {
            color: settings.textColor,
            borderColor: settings.textColor + "18",
            backgroundColor: settings.cardColor,
          },
        ]}
      />

      <Text style={[styles.modalLabel, { color: settings.titleColor }]}>
        Type
      </Text>

      <View style={styles.memoryTypeWrap}>
        {MEMORY_TYPES.map((type) => {
          const active = newMemoryType === type.value;

          return (
            <TouchableOpacity
              key={type.value}
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
              onPress={() => setNewMemoryType(type.value)}
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
                {type.icon} {type.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {newMemoryType === "date" && (
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
            onPress={() => setShowMemoryDatePicker(true)}
          >
            <Text
              style={[
                styles.dateButtonText,
                { color: settings.primaryColor },
              ]}
            >
              {formatDateEU(newMemoryDate) || "Pick a date"}
            </Text>
          </TouchableOpacity>

          {newMemoryDate ? (
            <TouchableOpacity
              onPress={() => {
                setNewMemoryDate("");
                setNewMemoryDateObj(new Date());
              }}
            >
              <Text style={styles.clearDateText}>Clear date</Text>
            </TouchableOpacity>
          ) : null}

          {showMemoryDatePicker && (
            <DateTimePicker
              mode="date"
              value={newMemoryDateObj || new Date()}
              onChange={onMemoryDateChange}
              display={Platform.OS === "ios" ? "spinner" : "default"}
            />
          )}
        </>
      )}

      <TouchableOpacity
        style={styles.pinRow}
        onPress={() => setNewMemoryPinned((prev) => !prev)}
      >
        <View
          style={[
            styles.pinBox,
            {
              backgroundColor: newMemoryPinned
                ? settings.primaryColor
                : "transparent",
              borderColor: settings.primaryColor,
            },
          ]}
        >
          {newMemoryPinned && (
            <Text style={{ color: settings.buttonTextColor, fontWeight: "900" }}>
              ✓
            </Text>
          )}
        </View>

        <Text style={{ color: settings.textColor, fontWeight: "700" }}>
          Show also in important section 
        </Text>
      </TouchableOpacity>

      <View style={styles.modalActions}>
        <TouchableOpacity
          style={styles.modalCancelButton}
          onPress={() => {
            resetMemoryForm();
            setShowMemoryModal(false);
          }}
          disabled={savingMemory}
        >
          <Text style={{ color: settings.textColor }}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modalSaveButton,
            { backgroundColor: settings.buttonColor },
            savingMemory && { opacity: 0.6 },
          ]}
          onPress={handleSaveMemory}
          disabled={savingMemory}
        >
          <Text
            style={[
              styles.modalSaveText,
              { color: settings.buttonTextColor },
            ]}
          >
            {savingMemory ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
    </Screen>
    
  );
  
}

const styles = StyleSheet.create({
  memoryActions: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginLeft: 8,
},
dateButton: {
  marginTop: 2,
  borderRadius: 10,
  borderWidth: 1,
  paddingVertical: 10,
  paddingHorizontal: 12,
},

dateButtonText: {
  fontWeight: "800",
},

clearDateText: {
  fontSize: 12,
  color: "#B91C1C",
  marginTop: 6,
  fontWeight: "700",
},
memoryActionText: {
  fontSize: 12,
  fontWeight: "800",
},

memoryDeleteText: {
  fontSize: 12,
  fontWeight: "800",
  color: "#DC2626",
},
  page: {
    padding: 16,
    gap: 14,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
  },
  
  favoriteIcon: {
    fontSize: 22,
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
  summaryBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  relationshipWrap: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: 8,
  marginTop: 12,
  paddingHorizontal: 8,
},

groupPill: {
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
  borderWidth: 1,
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 6,
  maxWidth: 150,
},

groupPillText: {
  fontSize: 12,
  fontWeight: "800",
},

tagPill: {
  borderWidth: 1,
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 6,
  maxWidth: 130,
},

tagPillText: {
  fontSize: 12,
  fontWeight: "800",
},
memoriesSection: {
  marginTop: 4,
},

memoryCard: {
  borderRadius: 16,
  borderWidth: 1,
  padding: 12,
  marginBottom: 10,
},
modalOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.45)",
  justifyContent: "center",
  padding: 20,
},

modalCard: {
  borderRadius: 20,
  padding: 18,
  borderWidth: 1,
  borderColor: "#e5e7eb",
},

modalTitle: {
  fontSize: 20,
  fontWeight: "900",
  marginBottom: 14,
},

modalLabel: {
  fontSize: 14,
  fontWeight: "800",
  marginBottom: 8,
  marginTop: 12,
},

memoryInput: {
  minHeight: 90,
  borderWidth: 1,
  borderRadius: 14,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  lineHeight: 20,
},

modalInput: {
  borderWidth: 1,
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
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
  marginTop: 20,
},

modalCancelButton: {
  flex: 1,
  paddingVertical: 12,
  borderRadius: 14,
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#ddd",
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
memorySectionHeader: {
  marginBottom: 8,
},

memorySectionTitle: {
  fontSize: 15,
  fontWeight: "900",
},

memoryRow: {
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 8,
  marginBottom: 10,
},
memoryBullet: {
  fontSize: 15,
  marginTop: 1,
},

memoryText: {
  fontSize: 14,
  fontWeight: "600",
  lineHeight: 19,
},

memoryDate: {
  marginTop: 2,
  fontSize: 12,
  fontWeight: "700",
},
  memoryBody: {
  flex: 1,
},

memoryIconActions: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  marginLeft: 6,
},

memoryIconButton: {
  width: 30,
  height: 30,
  borderRadius: 15,
  alignItems: "center",
  justifyContent: "center",
},

memoryDeleteButton: {
  width: 30,
  height: 30,
  borderRadius: 15,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#FEE2E2",
},
});
