import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useAppearance } from "../../appearance/AppearanceContext";
import { Contact } from "../../contacts/types";
import { fetchContactById, fetchContacts } from "../../contacts/repository";
import { fetchMemoriesForContact } from "../../memories/repository";
import { ContactMemory } from "../../memories/types";
import { fetchEventsForContact } from "../../events/repository";
import { EventDTO, EventTypeValue, EVENT_TYPE_META } from "../../events/types";
import { fetchInteractionForContact } from "../../interactions/repository";
import { Interaction } from "../../interactions/types";

type BeforeMeetTheme = {
  background: string;
  card: string;
  title: string;
  text: string;
  primary: string;
  button: string;
  buttonText: string;
  border: string;
  muted: string;
  softCard: string;
  softPrimary: string;
  shadow: string;
};

type Props = {
  /**
   * Kept optional so your existing parent can still pass colors.
   * The component now prefers AppearanceContext for homogeneous styling.
   */
  colors?: Partial<BeforeMeetTheme>;
  navigation: any;
};

type MeetPrepData = {
  contact: Contact;
  memories: ContactMemory[];
  events: EventDTO[];
  interactions: Interaction[];
};

export default function BeforeMeetSearchCard({ colors: colorOverrides, navigation }: Props) {
  const { settings } = useAppearance();
  const colors = useMemo(
    () => makeBeforeMeetColors(settings, colorOverrides),
    [settings, colorOverrides]
  );

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Contact[]>([]);
  const [searching, setSearching] = useState(false);

  const [prepLoadingId, setPrepLoadingId] = useState<string | null>(null);
  const [prepData, setPrepData] = useState<MeetPrepData | null>(null);

  useEffect(() => {
    const query = search.trim();

    if (!query) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;

    const timeout = setTimeout(async () => {
      try {
        setSearching(true);

        const response = await fetchContacts({
          page: 1,
          search: query,
        });

        if (!cancelled) {
          setResults((response.results ?? []).slice(0, 6));
        }
      } catch (error) {
        console.log("Before meet search error:", error);

        if (!cancelled) {
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [search]);

  async function prepareContact(contact: Contact) {
    Keyboard.dismiss();

    try {
      setPrepLoadingId(String(contact.id));

      const [freshContact, memories, eventsData, interactions] =
        await Promise.all([
          fetchContactById(contact.id),
          fetchMemoriesForContact(contact.id as any),
          fetchEventsForContact(contact.id as any, 1),
          fetchInteractionForContact(contact.id as any),
        ]);

      const eventResults = Array.isArray(eventsData)
        ? eventsData
        : eventsData?.results ?? [];

      setPrepData({
        contact: freshContact,
        memories: memories ?? [],
        events: eventResults,
        interactions: interactions ?? [],
      });

      setSearch("");
      setResults([]);
    } catch (error) {
      console.log("Prepare contact failed:", error);
    } finally {
      setPrepLoadingId(null);
    }
  }

  function openContact(contact: Contact) {
    Keyboard.dismiss();

    navigation.navigate("ContactDetail", {
      contactId: contact.id,
      contactName: getContactName(contact),
    });
  }

  const hasQuery = search.trim().length > 0;
  const showEmpty = hasQuery && !searching && results.length === 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconBubble, { backgroundColor: colors.softPrimary }]}>
          <Ionicons name="flash-outline" size={17} color={colors.primary} />
        </View>

        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.title }]}>
            Before meet
          </Text>

          <Text style={[styles.subtitle, { color: colors.text }]} numberOfLines={1}>
            Search someone and prepare in seconds.
          </Text>
        </View>

        {hasQuery ? (
          <TouchableOpacity
            style={[styles.resetButton, { backgroundColor: colors.softCard }]}
            onPress={() => {
              Keyboard.dismiss();
              setSearch("");
              setResults([]);
            }}
            activeOpacity={0.86}
          >
            <Ionicons name="close" size={16} color={colors.text} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: colors.softCard,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name="search-outline" size={18} color={colors.muted} />

        <TextInput
          value={search}
          onChangeText={(value) => {
            setSearch(value);
            if (prepData) setPrepData(null);
          }}
          placeholder="Who are you about to meet?"
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          returnKeyType="search"
          style={[styles.input, { color: colors.title }]}
        />

        {searching ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : search ? (
          <TouchableOpacity
            onPress={() => {
              setSearch("");
              setResults([]);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle" size={19} color={colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {hasQuery ? (
        <ScrollView
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
          style={styles.resultsScroll}
          contentContainerStyle={styles.results}
        >
          {results.map((contact) => {
            const name = getContactName(contact);
            const isLoading = prepLoadingId === String(contact.id);

            const subtitle =
              getRelationshipLabel(contact) ||
              contact.short_description ||
              contact.group_detail?.name ||
              "Generate meet prep card";

            return (
              <TouchableOpacity
                key={String(contact.id)}
                style={[
                  styles.resultRow,
                  {
                    backgroundColor: colors.softCard,
                    borderColor: colors.border,
                  },
                ]}
                onPressIn={Keyboard.dismiss}
                onPress={() => prepareContact(contact)}
                activeOpacity={0.86}
              >
                <Avatar contact={contact} name={name} size={39} colors={colors} />

                <View style={styles.resultText}>
                  <Text style={[styles.resultName, { color: colors.title }]} numberOfLines={1}>
                    {name || "Unnamed contact"}
                  </Text>

                  <Text style={[styles.resultMeta, { color: colors.text }]} numberOfLines={1}>
                    {subtitle}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.profileButton,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPressIn={Keyboard.dismiss}
                  onPress={() => openContact(contact)}
                  activeOpacity={0.84}
                >
                  <Ionicons name="person-outline" size={15} color={colors.primary} />
                </TouchableOpacity>

                <View style={[styles.preparePill, { backgroundColor: colors.button }]}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.buttonText} />
                  ) : (
                    <Text style={[styles.prepareText, { color: colors.buttonText }]}>
                      Prepare
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {showEmpty ? (
            <View
              style={[
                styles.emptyBox,
                {
                  backgroundColor: colors.softCard,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="person-add-outline" size={19} color={colors.primary} />

              <View style={styles.emptyBoxText}>
                <Text style={[styles.emptyTitle, { color: colors.title }]}>
                  No contact found
                </Text>

                <Text style={[styles.emptyText, { color: colors.text }]}>
                  Try a name, phone number, tag, or short description.
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      ) : null}

      <MeetPrepModal
        visible={!!prepData}
        data={prepData}
        colors={colors}
        navigation={navigation}
        onClose={() => setPrepData(null)}
      />
    </View>
  );
}

function MeetPrepModal({
  visible,
  data,
  colors,
  navigation,
  onClose,
}: {
  visible: boolean;
  data: MeetPrepData | null;
  colors: BeforeMeetTheme;
  navigation: any;
  onClose: () => void;
}) {
  const firstName = data?.contact.first_name || "Contact";

  function openContact() {
    if (!data) return;

    const name = getContactName(data.contact);

    onClose();

    requestAnimationFrame(() => {
      navigation.navigate("ContactDetail", {
        contactId: data.contact.id,
        contactName: name,
      });
    });
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.prepModalRoot, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[colors.primary, colors.button] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.prepModalHeaderGradient}
        >
          <View style={styles.prepModalGlowOne} />
          <View style={styles.prepModalGlowTwo} />

          <View style={styles.prepModalTopRow}>
            <TouchableOpacity
              style={styles.prepModalCircleButton}
              onPress={onClose}
              activeOpacity={0.86}
            >
              <Ionicons name="chevron-down" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.prepModalPill}>
              <Ionicons name="flash-outline" size={14} color="#FFFFFF" />
              <Text style={styles.prepModalPillText}>Before meet</Text>
            </View>

            <TouchableOpacity
              style={styles.prepModalCircleButton}
              onPress={openContact}
              activeOpacity={0.86}
            >
              <Ionicons name="person-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.prepModalHeroRow}>
            <View style={styles.prepModalHeroIcon}>
              <Ionicons name="sparkles-outline" size={24} color="#FFFFFF" />
            </View>

            <View style={styles.prepModalHeroText}>
              <Text style={styles.prepModalEyebrow}>MEETING PREP</Text>
              <Text style={styles.prepModalTitle} numberOfLines={1}>
                {firstName} prep card
              </Text>
              <Text style={styles.prepModalSubtitle} numberOfLines={2}>
                Ask better questions, remember what matters, and follow up after.
              </Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.prepModalContent}
        >
          {data ? (
            <MeetPrepCard
              data={data}
              colors={colors}
              navigation={navigation}
              onClose={onClose}
              onOpenContact={openContact}
            />
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function MeetPrepCard({
  data,
  colors,
  navigation,
  onClose,
  onOpenContact,
}: {
  data: MeetPrepData;
  colors: BeforeMeetTheme;
  navigation: any;
  onClose: () => void;
  onOpenContact: () => void;
}) {
  const { contact, memories, events, interactions } = data;
  const name = getContactName(contact);

  const askNext = useMemo(() => {
    const items = memories.filter(
      (memory) => memory.memory_type === "ask_next_time"
    );

    return items.find((memory) => memory.is_pinned) ?? items[0] ?? null;
  }, [memories]);

  const importantMemories = useMemo(
    () =>
      memories
        .filter(
          (memory) => memory.memory_type === "important" || memory.is_pinned
        )
        .slice(0, 4),
    [memories]
  );

  const normalNotes = useMemo(
    () => memories.filter((memory) => memory.memory_type === "note").slice(0, 2),
    [memories]
  );

  const recentInteraction = useMemo(() => {
    if (!interactions.length) return null;

    return [...interactions].sort(
      (a, b) =>
        new Date(b.happened_at).getTime() -
        new Date(a.happened_at).getTime()
    )[0];
  }, [interactions]);

  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter((event) => {
        const days =
          event.days_until ??
          daysUntil(event.next_occurrence || event.start_date);

        return days === null ? true : days >= 0;
      })
      .sort((a, b) => {
        const aDays =
          a.days_until ??
          daysUntil(a.next_occurrence || a.start_date) ??
          99999;

        const bDays =
          b.days_until ??
          daysUntil(b.next_occurrence || b.start_date) ??
          99999;

        return aDays - bDays;
      })
      .slice(0, 3);
  }, [events]);

  const lastNote =
    recentInteraction?.note ||
    normalNotes[0]?.text ||
    contact.short_description ||
    "";

  const relationshipLabel = getRelationshipLabel(contact) || "Personal contact";
  const lastContactLabel = getLastContactLabel(contact, recentInteraction);

  function navigateAfterClose(routeName: string, params: Record<string, unknown>) {
    onClose();

    requestAnimationFrame(() => {
      navigation.navigate(routeName, params);
    });
  }

  function openLogInteraction() {
    navigateAfterClose("LogInteraction", {
      contactId: contact.id,
    });
  }

  function openQuickNote() {
    navigateAfterClose("QuickNote", {
      contactId: contact.id,
      contactName: name,
    });
  }

  function openReminder() {
    navigateAfterClose("AddReminder", {
      contactId: contact.id,
      contactName: name,
      note: askNext?.text || "",
    });
  }

  return (
    <View
      style={[
        styles.prepCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.prepHeader}>
        <View style={styles.prepIdentity}>
          <Avatar contact={contact} name={name} size={58} colors={colors} />

          <View style={styles.prepIdentityText}>
            <Text style={[styles.prepName, { color: colors.title }]} numberOfLines={1}>
              {name || "Unnamed contact"}
            </Text>

            <Text style={[styles.prepMeta, { color: colors.text }]} numberOfLines={1}>
              {relationshipLabel} · {lastContactLabel}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.prepOpenProfile, { backgroundColor: colors.softPrimary }]}
          onPress={onOpenContact}
          activeOpacity={0.86}
        >
          <Ionicons name="person-outline" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.readinessRow}>
        <View style={[styles.readinessPill, { backgroundColor: colors.softPrimary }]}>
          <Ionicons name="heart-circle-outline" size={15} color={colors.primary} />
          <Text style={[styles.readinessText, { color: colors.primary }]}>
            {buildReadinessLabel(contact, recentInteraction)}
          </Text>
        </View>

        {contact.birthday ? (
          <View style={[styles.readinessPill, { backgroundColor: colors.softCard }]}>
            <Ionicons name="gift-outline" size={14} color={colors.primary} />
            <Text style={[styles.readinessText, { color: colors.text }]}>
              Birthday {formatShortDate(contact.birthday)}
            </Text>
          </View>
        ) : null}

        {getAny<string>(contact, "met_at") ? (
          <View style={[styles.readinessPill, { backgroundColor: colors.softCard }]}>
            <Ionicons name="location-outline" size={14} color={colors.primary} />
            <Text style={[styles.readinessText, { color: colors.text }]} numberOfLines={1}>
              Met at {getAny<string>(contact, "met_at")}
            </Text>
          </View>
        ) : null}
      </View>

      <LinearGradient
        colors={[
          withOpacity(colors.primary, "22"),
          withOpacity(colors.button, "12"),
        ] as [string, string]}
        style={[styles.heroPromptBox, { borderColor: withOpacity(colors.primary, "28") }]}
      >
        <View style={styles.heroPromptTop}>
          <Text style={[styles.heroPromptEyebrow, { color: colors.primary }]}>
            ASK NEXT
          </Text>

          {askNext?.is_pinned ? (
            <View style={[styles.pinnedPill, { backgroundColor: colors.softPrimary }]}>
              <Ionicons name="star" size={11} color={colors.primary} />
              <Text style={[styles.pinnedPillText, { color: colors.primary }]}>
                Pinned
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.heroPromptText, { color: colors.title }]}>
          {askNext?.text || "No question saved yet. Ask how they’ve been lately."}
        </Text>
      </LinearGradient>

      {lastNote ? (
        <PrepSection
          icon="time-outline"
          title="Last thing to remember"
          colors={colors}
        >
          <Text style={[styles.prepBodyText, { color: colors.text }]}>
            {lastNote}
          </Text>
        </PrepSection>
      ) : null}

      {importantMemories.length > 0 ? (
        <PrepSection icon="sparkles-outline" title="Remember" colors={colors}>
          <View style={styles.memoryList}>
            {importantMemories.map((memory) => (
              <View key={String(memory.id)} style={styles.memoryRow}>
                <View style={[styles.memoryDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.memoryText, { color: colors.title }]} numberOfLines={2}>
                  {memory.text}
                </Text>
              </View>
            ))}
          </View>
        </PrepSection>
      ) : null}

      {upcomingEvents.length > 0 ? (
        <PrepSection icon="calendar-outline" title="Coming up" colors={colors}>
          <View style={styles.eventMiniList}>
            {upcomingEvents.map((event) => (
              <View key={String(event.id)} style={styles.eventMiniRow}>
                <Text style={styles.eventMiniIcon}>
                  {getEventIcon(event.type as EventTypeValue)}
                </Text>

                <View style={styles.eventMiniText}>
                  <Text style={[styles.eventMiniTitle, { color: colors.title }]} numberOfLines={1}>
                    {event.title || getEventLabel(event.type as EventTypeValue)}
                  </Text>

                  <Text style={[styles.eventMiniMeta, { color: colors.text }]} numberOfLines={1}>
                    {formatEventWhen(event)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </PrepSection>
      ) : null}

      <View style={[styles.afterMeetBox, { borderTopColor: colors.border }]}>
        <Text style={[styles.afterMeetTitle, { color: colors.title }]}>
          After meeting
        </Text>

        <View style={styles.afterMeetActions}>
          <TouchableOpacity
            style={[styles.afterMeetButton, { backgroundColor: colors.button }]}
            onPress={openLogInteraction}
            activeOpacity={0.87}
          >
            <Ionicons name="heart-outline" size={15} color={colors.buttonText} />
            <Text style={[styles.afterMeetButtonText, { color: colors.buttonText }]}>
              Log
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.afterMeetButton, { backgroundColor: colors.softPrimary }]}
            onPress={openQuickNote}
            activeOpacity={0.87}
          >
            <Ionicons name="create-outline" size={15} color={colors.primary} />
            <Text style={[styles.afterMeetButtonText, { color: colors.primary }]}>
              Note
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.afterMeetButton, { backgroundColor: colors.softPrimary }]}
            onPress={openReminder}
            activeOpacity={0.87}
          >
            <Ionicons name="notifications-outline" size={15} color={colors.primary} />
            <Text style={[styles.afterMeetButtonText, { color: colors.primary }]}>
              Reminder
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function PrepSection({
  icon,
  title,
  colors,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  colors: BeforeMeetTheme;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.prepSection,
        {
          backgroundColor: colors.softCard,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.prepSectionHeader}>
        <View style={[styles.prepSectionIcon, { backgroundColor: colors.softPrimary }]}>
          <Ionicons name={icon} size={14} color={colors.primary} />
        </View>

        <Text style={[styles.prepSectionTitle, { color: colors.title }]}>
          {title}
        </Text>
      </View>

      {children}
    </View>
  );
}

function Avatar({
  contact,
  name,
  size,
  colors,
}: {
  contact: Contact;
  name: string;
  size: number;
  colors: BeforeMeetTheme;
}) {
  const radius = size / 2;

  if (contact.photo || contact.photo_uri) {
    return (
      <Image
        source={{ uri: contact.photo || contact.photo_uri || "" }}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: colors.softCard,
        }}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: colors.softPrimary,
        },
      ]}
    >
      <Text style={[styles.avatarText, { color: colors.primary }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

function getContactName(contact: Contact) {
  return `${contact.first_name || ""} ${contact.last_name || ""}`.trim();
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

function getRelationshipLabel(contact: Contact) {
  return (
    getAny<string>(contact, "relationship_label") ||
    getAny<string>(contact, "relationshipLabel") ||
    contact.group_detail?.name ||
    contact.tags_detail?.[0]?.name ||
    ""
  );
}

function getLastContactLabel(contact: Contact, interaction: Interaction | null) {
  const value = contact.talk_last_at || interaction?.happened_at;

  if (!value) return "No recent contact";

  const diff = daysSince(value);

  if (diff === null) return "Recently";
  if (diff === 0) return "Talked today";
  if (diff === 1) return "Talked yesterday";

  return `Talked ${diff} days ago`;
}

function buildReadinessLabel(contact: Contact, interaction: Interaction | null) {
  const diff = daysSince(contact.talk_last_at || interaction?.happened_at);

  if (diff === null) return "Ready to reconnect";
  if (diff <= 7) return "Warm connection";
  if (diff <= 30) return "Good moment to check in";

  return "Needs attention";
}

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

function formatShortDate(value?: string | null) {
  const date = parseDate(value);
  if (!date) return "Not set";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatEventWhen(event: EventDTO) {
  const days =
    event.days_until ??
    daysUntil(event.next_occurrence || event.start_date);

  const dateLabel = formatShortDate(event.next_occurrence || event.start_date);

  if (days === 0) return `Today · ${dateLabel}`;
  if (days === 1) return `Tomorrow · ${dateLabel}`;
  if (typeof days === "number" && days > 1) return `In ${days} days · ${dateLabel}`;

  return dateLabel;
}

function getEventIcon(type: EventTypeValue) {
  return EVENT_TYPE_META[type]?.icon ?? "✨";
}

function getEventLabel(type: EventTypeValue) {
  return EVENT_TYPE_META[type]?.label ?? "Moment";
}

function getAny<T = any>(item: unknown, key: string): T | undefined {
  if (!item || typeof item !== "object") return undefined;
  return (item as Record<string, T>)[key];
}

function makeBeforeMeetColors(
  settings: any,
  overrides?: Partial<BeforeMeetTheme>
): BeforeMeetTheme {
  const base: BeforeMeetTheme = {
    background: settings.backgroundColor,
    card: settings.cardColor,
    title: settings.titleColor,
    text: settings.textColor,
    primary: settings.primaryColor,
    button: settings.buttonColor || settings.primaryColor,
    buttonText: settings.buttonTextColor || "#FFFFFF",
    border: withOpacity(settings.textColor, "16"),
    muted: withOpacity(settings.textColor, "88"),
    softCard: withOpacity(settings.textColor, "08"),
    softPrimary: withOpacity(settings.primaryColor, "16"),
    shadow: settings.themeMode === "dark" ? "#000000" : "#6F3D2E",
  };

  return {
    ...base,
    ...overrides,
  };
}

function withOpacity(hexColor?: string | null, opacityHex = "22") {
  if (!hexColor || typeof hexColor !== "string") {
    return `#000000${opacityHex}`;
  }

  const normalized = hexColor.trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
    return `${normalized}${opacityHex}`;
  }

  return normalized;
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    borderRadius: 28,
    padding: 14,
    borderWidth: 1,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },

  iconBubble: {
    width: 38,
    height: 38,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  textWrap: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    fontSize: 16,
    fontWeight: "900",
  },

  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 1,
  },

  resetButton: {
    width: 32,
    height: 32,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  searchBox: {
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  input: {
    flex: 1,
    minHeight: 44,
    fontSize: 14,
    fontWeight: "800",
    paddingVertical: 0,
  },

  resultsScroll: {
    maxHeight: 390,
    marginTop: 10,
  },

  results: {
    gap: 8,
    paddingBottom: 2,
  },

  resultRow: {
    minHeight: 66,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 12,
    fontWeight: "900",
  },

  resultText: {
    flex: 1,
    minWidth: 0,
  },

  resultName: {
    fontSize: 14,
    fontWeight: "900",
  },

  resultMeta: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
  },

  profileButton: {
    width: 34,
    height: 34,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  preparePill: {
    minWidth: 74,
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  prepareText: {
    fontSize: 11,
    fontWeight: "900",
  },

  emptyBox: {
    minHeight: 62,
    borderRadius: 22,
    borderWidth: 1,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  emptyBoxText: {
    flex: 1,
    minWidth: 0,
  },

  emptyTitle: {
    fontSize: 13,
    fontWeight: "900",
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 1,
  },

  prepModalRoot: {
    flex: 1,
  },

  prepModalHeaderGradient: {
    minHeight: 176,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    overflow: "hidden",
  },

  prepModalGlowOne: {
    position: "absolute",
    top: -70,
    right: -50,
    width: 165,
    height: 165,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.16)",
  },

  prepModalGlowTwo: {
    position: "absolute",
    bottom: -80,
    left: -55,
    width: 175,
    height: 175,
    borderRadius: 95,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  prepModalTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  prepModalCircleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  prepModalPill: {
    minHeight: 36,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  prepModalPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  prepModalHeroRow: {
    marginTop: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  prepModalHeroIcon: {
    width: 54,
    height: 54,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  prepModalHeroText: {
    flex: 1,
    minWidth: 0,
  },

  prepModalEyebrow: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },

  prepModalTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    lineHeight: 30,
    fontWeight: "900",
    marginTop: 2,
  },

  prepModalSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 2,
  },

  prepModalContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 36,
  },

  prepCard: {
    borderRadius: 30,
    borderWidth: 1,
    padding: 15,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  prepHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  prepIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  prepIdentityText: {
    flex: 1,
    minWidth: 0,
  },

  prepName: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  prepMeta: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.76,
    marginTop: 2,
  },

  prepOpenProfile: {
    width: 38,
    height: 38,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  readinessRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },

  readinessPill: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "100%",
  },

  readinessText: {
    fontSize: 11,
    fontWeight: "900",
  },

  heroPromptBox: {
    marginTop: 14,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
  },

  heroPromptTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },

  heroPromptEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  heroPromptText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "900",
  },

  pinnedPill: {
    minHeight: 24,
    borderRadius: 999,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  pinnedPillText: {
    fontSize: 10,
    fontWeight: "900",
  },

  prepSection: {
    marginTop: 12,
    borderRadius: 22,
    borderWidth: 1,
    padding: 12,
  },

  prepSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
  },

  prepSectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  prepSectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  prepBodyText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    opacity: 0.9,
  },

  memoryList: {
    gap: 8,
  },

  memoryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  memoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },

  memoryText: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },

  eventMiniList: {
    gap: 8,
  },

  eventMiniRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  eventMiniIcon: {
    fontSize: 17,
  },

  eventMiniText: {
    flex: 1,
    minWidth: 0,
  },

  eventMiniTitle: {
    fontSize: 13,
    fontWeight: "900",
  },

  eventMiniMeta: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 1,
  },

  afterMeetBox: {
    marginTop: 14,
    borderTopWidth: 1,
    paddingTop: 13,
  },

  afterMeetTitle: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 10,
  },

  afterMeetActions: {
    flexDirection: "row",
    gap: 8,
  },

  afterMeetButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  afterMeetButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
});
