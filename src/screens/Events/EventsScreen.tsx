// src/screens/Events/EventsScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { fetchEvents } from "../../events/repository";
import {
  EventDTO,
  EventTypeValue,
  EVENT_TYPE_META,
} from "../../events/types";
import { formatDateEU } from "../../lib/date";
import { getEventTimeInfo } from "../../events/utils";
import { AppId } from "../../contacts/types";

type Tab = "upcoming" | "past";

type EventsColors = {
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
  danger: string;
  warning: string;
  success: string;
  shadow: string;
};

const EVENT_TYPES = Object.entries(EVENT_TYPE_META).map(([key, meta]) => ({
  value: Number(key) as EventTypeValue,
  icon: meta.icon,
  label: meta.label,
}));

export default function EventsScreen({ navigation }: any) {
  const { settings } = useAppearance();
  const colors = useMemo(() => makeEventsColors(settings), [settings]);

  const [tab, setTab] = useState<Tab>("upcoming");

  const [search, setSearch] = useState("");
  const [noReminderOnly, setNoReminderOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<EventTypeValue[]>([]);

  const [draftNoReminderOnly, setDraftNoReminderOnly] = useState(false);
  const [draftTypeFilter, setDraftTypeFilter] = useState<EventTypeValue[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [events, setEvents] = useState<EventDTO[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const activeFilterCount =
    (noReminderOnly ? 1 : 0) + (typeFilter.length > 0 ? typeFilter.length : 0);

  async function load(pageToLoad = 1, merge = false) {
    setLoading(true);

    try {
      const data = await fetchEvents({
        filter: tab,
        page: pageToLoad,
        q: search.trim() ? search.trim() : undefined,
        no_reminder: noReminderOnly,
        type: typeFilter.length ? typeFilter : undefined,
      });

      const results = data.results || [];

      setEvents((prev) => {
        if (!merge) return results;

        const map = new Map<EventDTO["id"], EventDTO>();

        [...prev, ...results].forEach((event) => {
          map.set(event.id, event);
        });

        return Array.from(map.values());
      });

      setPage(pageToLoad);
      setHasNext(Boolean(data.next));
    } catch (error) {
      console.log("Failed to load events:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      load(1, false);
    }, 250);

    return () => clearTimeout(timeout);
  }, [tab, search, noReminderOnly, typeFilter]);

  async function onRefresh() {
    setRefreshing(true);
    await load(1, false);
    setRefreshing(false);
  }

  function loadMore() {
    if (hasNext && !loading) {
      load(page + 1, true);
    }
  }

  function openFilters() {
    setDraftNoReminderOnly(noReminderOnly);
    setDraftTypeFilter(typeFilter);
    setFilterOpen(true);
  }

  function clearDraftFilters() {
    setDraftNoReminderOnly(false);
    setDraftTypeFilter([]);
  }

  function applyFilters() {
    setNoReminderOnly(draftNoReminderOnly);
    setTypeFilter(draftTypeFilter);
    setFilterOpen(false);
  }

  function openEvent(item: EventDTO) {
    navigation.navigate("EventDetails", {
      eventId: item.id,
      eventTitle: item.title,
      from: "events",
      contactId: item.contact,
    });
  }

  function toggleDraftType(value: EventTypeValue) {
    setDraftTypeFilter((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  }

  const isEmpty = !loading && events.length === 0;

  return (
    <Screen>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <FlatList
          data={events}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            isEmpty ? styles.emptyContent : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View>
              <EventsHeader
                tab={tab}
                eventCount={events.length}
                activeFilterCount={activeFilterCount}
                colors={colors}
                onOpenFilters={openFilters}
              />

              <TabSelector tab={tab} colors={colors} onChange={setTab} />

              <SearchBox
                value={search}
                colors={colors}
                onChangeText={setSearch}
              />

              {activeFilterCount > 0 ? (
                <ActiveFiltersBar
                  noReminderOnly={noReminderOnly}
                  typeFilter={typeFilter}
                  colors={colors}
                  onClear={() => {
                    setNoReminderOnly(false);
                    setTypeFilter([]);
                  }}
                />
              ) : null}

              {loading && events.length === 0 ? (
                <View style={styles.initialLoader}>
                  <ActivityIndicator color={colors.primary} />
                  <Text
                    style={[
                      styles.initialLoaderText,
                      { color: colors.text },
                    ]}
                  >
                    Loading events…
                  </Text>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            isEmpty ? (
              <EmptyEventsState
                tab={tab}
                hasFilters={Boolean(
                  search.trim() || noReminderOnly || typeFilter.length
                )}
                colors={colors}
              />
            ) : null
          }
          ListFooterComponent={
            loading && events.length > 0 ? (
              <ActivityIndicator
                style={styles.footerLoader}
                color={colors.primary}
              />
            ) : (
              <View style={styles.footerSpace} />
            )
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.35}
          renderItem={({ item }) => (
            <EventCard
              item={item}
              tab={tab}
              colors={colors}
              onPress={() => openEvent(item)}
            />
          )}
        />

        <FilterModal
          visible={filterOpen}
          colors={colors}
          draftNoReminderOnly={draftNoReminderOnly}
          draftTypeFilter={draftTypeFilter}
          onClose={() => setFilterOpen(false)}
          onToggleNoReminder={() =>
            setDraftNoReminderOnly((value) => !value)
          }
          onToggleType={toggleDraftType}
          onClear={clearDraftFilters}
          onApply={applyFilters}
        />
      </View>
    </Screen>
  );
}

function EventsHeader({
  tab,
  eventCount,
  activeFilterCount,
  colors,
  onOpenFilters,
}: {
  tab: Tab;
  eventCount: number;
  activeFilterCount: number;
  colors: EventsColors;
  onOpenFilters: () => void;
}) {
  return (
    <LinearGradient
      colors={[colors.primary, colors.button] as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.compactHeader}
    >
      <View style={styles.headerGlowOne} />
      <View style={styles.headerGlowTwo} />

      <View style={styles.headerRow}>
        <View style={styles.headerIconBubble}>
          <Ionicons name="calendar-outline" size={22} color="#FFFFFF" />
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>MOMENTS</Text>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Events
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {eventCount} {eventCount === 1 ? "event" : "events"} · {tab}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerFilterButton}
          onPress={onOpenFilters}
          activeOpacity={0.85}
        >
          <Ionicons name="options-outline" size={16} color="#FFFFFF" />

          {activeFilterCount > 0 ? (
            <View style={styles.filterCountBadge}>
              <Text style={styles.filterCountText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

function TabSelector({
  tab,
  colors,
  onChange,
}: {
  tab: Tab;
  colors: EventsColors;
  onChange: (tab: Tab) => void;
}) {
  return (
    <View
      style={[
        styles.tabsContainer,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <TabButton
        label="Upcoming"
        icon="arrow-up-circle-outline"
        selected={tab === "upcoming"}
        colors={colors}
        onPress={() => onChange("upcoming")}
      />

      <TabButton
        label="Past"
        icon="time-outline"
        selected={tab === "past"}
        colors={colors}
        onPress={() => onChange("past")}
      />
    </View>
  );
}

function TabButton({
  label,
  icon,
  selected,
  colors,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  colors: EventsColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.tabButton,
        {
          backgroundColor: selected ? colors.primary : "transparent",
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons
        name={icon}
        size={16}
        color={selected ? colors.buttonText : colors.text}
      />

      <Text
        style={[
          styles.tabButtonText,
          { color: selected ? colors.buttonText : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SearchBox({
  value,
  colors,
  onChangeText,
}: {
  value: string;
  colors: EventsColors;
  onChangeText: (value: string) => void;
}) {
  return (
    <View
      style={[
        styles.searchBox,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <Ionicons name="search-outline" size={18} color={colors.text} />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search events or contacts..."
        placeholderTextColor={colors.muted}
        autoCorrect={false}
        style={[styles.searchInput, { color: colors.title }]}
      />

      {value.trim() ? (
        <TouchableOpacity onPress={() => onChangeText("")} activeOpacity={0.8}>
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ActiveFiltersBar({
  noReminderOnly,
  typeFilter,
  colors,
  onClear,
}: {
  noReminderOnly: boolean;
  typeFilter: EventTypeValue[];
  colors: EventsColors;
  onClear: () => void;
}) {
  return (
    <View style={styles.activeFiltersWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.activeFilterScroll}
      >
        {noReminderOnly ? (
          <View
            style={[
              styles.activeFilterChip,
              {
                backgroundColor: withOpacity(colors.warning, "18"),
                borderColor: withOpacity(colors.warning, "35"),
              },
            ]}
          >
            <Ionicons
              name="notifications-off-outline"
              size={13}
              color={colors.warning}
            />
            <Text style={[styles.activeFilterText, { color: colors.warning }]}>
              No reminder
            </Text>
          </View>
        ) : null}

        {typeFilter.map((type) => {
          const meta = EVENT_TYPE_META[type];

          return (
            <View
              key={String(type)}
              style={[
                styles.activeFilterChip,
                {
                  backgroundColor: colors.softPrimary,
                  borderColor: withOpacity(colors.primary, "24"),
                },
              ]}
            >
              <Text style={styles.activeFilterEmoji}>{meta?.icon ?? "✨"}</Text>
              <Text
                style={[styles.activeFilterText, { color: colors.primary }]}
              >
                {meta?.label ?? "Event"}
              </Text>
            </View>
          );
        })}

        <TouchableOpacity
          style={[
            styles.clearFiltersButton,
            {
              backgroundColor: colors.softCard,
              borderColor: colors.border,
            },
          ]}
          onPress={onClear}
          activeOpacity={0.85}
        >
          <Text style={[styles.clearFiltersText, { color: colors.text }]}>
            Clear
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function EventCard({
  item,
  tab,
  colors,
  onPress,
}: {
  item: EventDTO;
  tab: Tab;
  colors: EventsColors;
  onPress: () => void;
}) {
  const timeInfo = getEventTimeInfo(item);
  const meta = EVENT_TYPE_META[item.type as EventTypeValue];
  const countdown = friendlyCountdown(item.days_until);
  const hasReminder = Boolean(item.has_reminder);
  const nextDate = item.next_occurrence
    ? formatDateEU(item.next_occurrence)
    : "No upcoming date";

  return (
    <TouchableOpacity
      style={[
        styles.eventCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={styles.cardTopRow}>
        <EventAvatar item={item} colors={colors} />

        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text
              style={[styles.cardTopLine, { color: colors.title }]}
              numberOfLines={1}
            >
              {meta?.icon ?? "🎉"} {meta?.label ?? "Event"} ·{" "}
              {item.contact_name || "Contact"}
            </Text>

            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.muted}
            />
          </View>

          <Text
            style={[styles.cardTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.title || "Untitled event"}
          </Text>

          <Text style={[styles.cardDate, { color: colors.text }]} numberOfLines={1}>
            {tab === "upcoming" ? "Next" : "Date"} · {nextDate}
            {tab === "upcoming" && countdown ? (
              <Text style={{ color: colors.primary }}> · {countdown}</Text>
            ) : null}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.cardBottomRow,
          { borderTopColor: colors.border },
        ]}
      >
        <View style={styles.timeInfoWrap}>
          <Ionicons name="time-outline" size={14} color={colors.primary} />

          <View style={styles.timeTextWrap}>
            <Text style={[styles.cardMetaMain, { color: colors.title }]}>
              {timeInfo?.main || "No time"}
            </Text>

            {timeInfo?.sub ? (
              <Text style={[styles.cardMetaSub, { color: colors.text }]}>
                {timeInfo.sub}
              </Text>
            ) : null}
          </View>
        </View>

        <View
          style={[
            styles.reminderPill,
            {
              backgroundColor: hasReminder
                ? colors.softPrimary
                : withOpacity(colors.warning, "18"),
              borderColor: hasReminder
                ? withOpacity(colors.primary, "24")
                : withOpacity(colors.warning, "35"),
            },
          ]}
        >
          <Ionicons
            name={hasReminder ? "notifications-outline" : "warning-outline"}
            size={13}
            color={hasReminder ? colors.primary : colors.warning}
          />

          <Text
            style={[
              styles.reminderPillText,
              { color: hasReminder ? colors.primary : colors.warning },
            ]}
          >
            {hasReminder ? `${item.reminder_count || 1}` : "No reminder"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EventAvatar({
  item,
  colors,
}: {
  item: EventDTO;
  colors: EventsColors;
}) {
  const first = item.contact_first_name?.[0] ?? "";
  const last = item.contact_last_name?.[0] ?? "";
  const initials = `${first}${last}`.toUpperCase() || "?";

  if (item.contact_photo) {
    return <Image source={{ uri: item.contact_photo }} style={styles.avatarImage} />;
  }

  return (
    <View
      style={[
        styles.avatar,
        { backgroundColor: avatarColor(String(item.contact), colors.primary) },
      ]}
    >
      <Text style={[styles.avatarText, { color: "#FFFFFF" }]}>
        {initials}
      </Text>
    </View>
  );
}

function EmptyEventsState({
  tab,
  hasFilters,
  colors,
}: {
  tab: Tab;
  hasFilters: boolean;
  colors: EventsColors;
}) {
  return (
    <View
      style={[
        styles.emptyState,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: colors.softPrimary },
        ]}
      >
        <Ionicons
          name={hasFilters ? "search-outline" : "calendar-outline"}
          size={28}
          color={colors.primary}
        />
      </View>

      <Text style={[styles.emptyTitle, { color: colors.title }]}>
        {hasFilters
          ? "No events found"
          : tab === "upcoming"
          ? "No upcoming events"
          : "No past events"}
      </Text>

      <Text style={[styles.emptyText, { color: colors.text }]}>
        {hasFilters
          ? "Try clearing filters or changing your search."
          : "Events connected to your people will appear here."}
      </Text>
    </View>
  );
}

function FilterModal({
  visible,
  colors,
  draftNoReminderOnly,
  draftTypeFilter,
  onClose,
  onToggleNoReminder,
  onToggleType,
  onClear,
  onApply,
}: {
  visible: boolean;
  colors: EventsColors;
  draftNoReminderOnly: boolean;
  draftTypeFilter: EventTypeValue[];
  onClose: () => void;
  onToggleNoReminder: () => void;
  onToggleType: (value: EventTypeValue) => void;
  onClear: () => void;
  onApply: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View
          style={[
            modalStyles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={modalStyles.header}>
            <View
              style={[
                modalStyles.headerIcon,
                { backgroundColor: colors.softPrimary },
              ]}
            >
              <Ionicons name="options-outline" size={20} color={colors.primary} />
            </View>

            <View style={modalStyles.headerTextWrap}>
              <Text style={[modalStyles.eyebrow, { color: colors.primary }]}>
                FILTERS
              </Text>

              <Text style={[modalStyles.title, { color: colors.title }]}>
                Refine events
              </Text>
            </View>

            <TouchableOpacity
              style={[
                modalStyles.closeButton,
                { backgroundColor: colors.softCard },
              ]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              modalStyles.filterRow,
              {
                backgroundColor: colors.softCard,
                borderColor: colors.border,
              },
            ]}
            onPress={onToggleNoReminder}
            activeOpacity={0.85}
          >
            <View
              style={[
                modalStyles.checkbox,
                {
                  backgroundColor: draftNoReminderOnly
                    ? colors.primary
                    : "transparent",
                  borderColor: draftNoReminderOnly
                    ? colors.primary
                    : colors.border,
                },
              ]}
            >
              {draftNoReminderOnly ? (
                <Ionicons name="checkmark" size={15} color={colors.buttonText} />
              ) : null}
            </View>

            <View style={modalStyles.filterRowTextWrap}>
              <Text style={[modalStyles.filterRowTitle, { color: colors.title }]}>
                Only without reminders
              </Text>

              <Text style={[modalStyles.filterRowSub, { color: colors.text }]}>
                Show events that still need a reminder.
              </Text>
            </View>
          </TouchableOpacity>

          <Text style={[modalStyles.sectionLabel, { color: colors.title }]}>
            Event types
          </Text>

          <View style={modalStyles.typeGrid}>
            {EVENT_TYPES.map((item) => {
              const selected = draftTypeFilter.includes(item.value);

              return (
                <TouchableOpacity
                  key={String(item.value)}
                  style={[
                    modalStyles.typeOption,
                    {
                      backgroundColor: selected
                        ? colors.primary
                        : colors.softCard,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => onToggleType(item.value)}
                  activeOpacity={0.85}
                >
                  <Text style={modalStyles.typeEmoji}>{item.icon}</Text>

                  <Text
                    style={[
                      modalStyles.typeText,
                      {
                        color: selected ? colors.buttonText : colors.text,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={modalStyles.actions}>
            <TouchableOpacity
              style={[
                modalStyles.secondaryButton,
                {
                  backgroundColor: colors.softCard,
                  borderColor: colors.border,
                },
              ]}
              onPress={onClear}
              activeOpacity={0.85}
            >
              <Text style={[modalStyles.secondaryText, { color: colors.text }]}>
                Clear
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                modalStyles.primaryButton,
                { backgroundColor: colors.button },
              ]}
              onPress={onApply}
              activeOpacity={0.88}
            >
              <Text
                style={[
                  modalStyles.primaryText,
                  { color: colors.buttonText },
                ]}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* helpers */

function makeEventsColors(settings: any): EventsColors {
  return {
    background: settings.backgroundColor,
    card: settings.cardColor,
    title: settings.titleColor,
    text: settings.textColor,
    primary: settings.primaryColor,
    button: settings.buttonColor || settings.primaryColor,
    buttonText: settings.buttonTextColor,
    border: withOpacity(settings.textColor, "16"),
    muted: withOpacity(settings.textColor, "88"),
    softCard: withOpacity(settings.textColor, "08"),
    softPrimary: withOpacity(settings.primaryColor, "16"),
    danger: "#EE6A5E",
    warning: "#EBA55B",
    success: "#7DA56D",
    shadow: settings.themeMode === "dark" ? "#000000" : "#6F3D2E",
  };
}

function friendlyCountdown(days?: number | null) {
  if (days === null || days === undefined) return "";
  if (days < 0) return "";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `in ${days} days`;
  if (days < 30) return `in ${Math.ceil(days / 7)} weeks`;

  return "";
}

function avatarColor(id: string, fallback: string) {
  const colors = [
    "#6366F1",
    "#EC4899",
    "#F97316",
    "#10B981",
    "#06B6D4",
    "#8B5CF6",
    "#EF4444",
  ];

  if (!id) return fallback;

  let hash = 0;

  for (let index = 0; index < id.length; index += 1) {
    hash = id.charCodeAt(index) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
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

/* styles */

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 34,
  },

  emptyContent: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 34,
  },

  compactHeader: {
    minHeight: 122,
    borderRadius: 28,
    padding: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  headerGlowOne: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 145,
    height: 145,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.16)",
  },

  headerGlowTwo: {
    position: "absolute",
    bottom: -75,
    left: -55,
    width: 160,
    height: 160,
    borderRadius: 86,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  headerIconBubble: {
    width: 54,
    height: 54,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  headerEyebrow: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 33,
    fontWeight: "900",
    marginTop: 3,
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 2,
    textTransform: "capitalize",
  },

  headerFilterButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  filterCountBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  filterCountText: {
    color: "#2B211B",
    fontSize: 10,
    fontWeight: "900",
  },

  tabsContainer: {
    minHeight: 50,
    borderRadius: 21,
    borderWidth: 1,
    padding: 5,
    marginBottom: 10,
    flexDirection: "row",
    gap: 6,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  tabButton: {
    flex: 1,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  tabButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },

  searchBox: {
    minHeight: 50,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 13,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 0,
  },

  activeFiltersWrap: {
    marginBottom: 10,
  },

  activeFilterScroll: {
    gap: 8,
    paddingRight: 16,
  },

  activeFilterChip: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  activeFilterEmoji: {
    fontSize: 13,
  },

  activeFilterText: {
    fontSize: 11,
    fontWeight: "900",
  },

  clearFiltersButton: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  clearFiltersText: {
    fontSize: 11,
    fontWeight: "900",
  },

  initialLoader: {
    minHeight: 80,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  initialLoaderText: {
    fontSize: 12,
    fontWeight: "800",
  },

  eventCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 12,
    marginBottom: 9,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 19,
    marginRight: 11,
  },

  avatarText: {
    fontWeight: "900",
    fontSize: 15,
  },

  cardContent: {
    flex: 1,
    minWidth: 0,
  },

  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  cardTopLine: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
  },

  cardTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    opacity: 0.78,
    marginTop: 2,
  },

  cardDate: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.76,
    marginTop: 2,
  },

  cardBottomRow: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  timeInfoWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  timeTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  cardMetaMain: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },

  cardMetaSub: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 1,
  },

  reminderPill: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  reminderPillText: {
    fontSize: 11,
    fontWeight: "900",
  },

  footerLoader: {
    marginVertical: 16,
  },

  footerSpace: {
    height: 18,
  },

  emptyState: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    marginTop: 14,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    opacity: 0.76,
    textAlign: "center",
    marginTop: 6,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(20, 14, 10, 0.52)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },

  card: {
    width: "100%",
    maxWidth: 390,
    borderRadius: 30,
    borderWidth: 1,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 16,
  },

  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  title: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "900",
    marginTop: 2,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  filterRow: {
    minHeight: 72,
    borderRadius: 22,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  filterRowTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  filterRowTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  filterRowSub: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 16,
    marginBottom: 9,
  },

  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  typeOption: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  typeEmoji: {
    fontSize: 14,
  },

  typeText: {
    fontSize: 12,
    fontWeight: "900",
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },

  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryText: {
    fontSize: 14,
    fontWeight: "900",
  },

  primaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryText: {
    fontSize: 14,
    fontWeight: "900",
  },
});