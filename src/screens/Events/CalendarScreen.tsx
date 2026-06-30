// src/screens/Events/CalendarScreen.tsx
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import {
  CalendarItem,
  completeReminder,
  fetchCalendarItems,
} from "../../calendar/repository";

type Props = {
  navigation: any;
};

type CalendarMode = "month" | "agenda";
type AgendaScope = "day" | "upcoming";

type CalendarFilter =
  | "all"
  | "birthday"
  | "check_in"
  | "event"
  | "meeting"
  | "reminder"
  | "ask_next_time"
  | "memory_date"
  | "before_meet";

type CalendarColors = {
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
  purple: string;
  blue: string;
  shadow: string;
};

type CalendarListRow =
  | {
      kind: "section";
      id: string;
      title: string;
    }
  | {
      kind: "item";
      id: string;
      item: CalendarItem;
    };

const INITIAL_BACK_DAYS = 7;
const PAGE_DAYS = 30;
const MAX_LOOKAHEAD_DAYS = 365;
const LIST_RENDER_BATCH = 8;
const CALENDAR_STALE_AFTER_MS = 30_000;

const FILTERS: Array<{
  key: CalendarFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "all", label: "All", icon: "checkmark-circle" },
  { key: "birthday", label: "Birthdays", icon: "gift-outline" },
  { key: "reminder", label: "Reminders", icon: "notifications-outline" },
  { key: "meeting", label: "Meetings", icon: "people-outline" },
  { key: "check_in", label: "Follow-ups", icon: "call-outline" },
  { key: "event", label: "Events", icon: "calendar-outline" },
  { key: "before_meet", label: "Before Meet", icon: "people-outline" },
];

export default function CalendarScreen({ navigation }: Props) {
  const { settings } = useAppearance();
  const colors = useMemo(() => makeCalendarColors(settings), [settings]);

  const today = useMemo(() => startOfToday(), []);
  const absoluteEndDate = useMemo(
    () => toYMD(addDays(today, MAX_LOOKAHEAD_DAYS)),
    [today]
  );

  const hasLoadedOnceRef = useRef(false);
  const lastLoadedAtRef = useRef<number | null>(null);
  const loadingRequestRef = useRef(false);

  const [mode, setMode] = useState<CalendarMode>("month");
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [visibleMonth, setVisibleMonth] = useState<Date>(today);
  const [agendaSelectedDate, setAgendaSelectedDate] = useState<Date>(today);
  const [agendaScope, setAgendaScope] = useState<AgendaScope>("day");
  const [filterVisible, setFilterVisible] = useState(false);

  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);


  const [loadedEndDate, setLoadedEndDate] = useState(() =>
    toYMD(addDays(today, PAGE_DAYS))
  );

  const loadCalendar = useCallback(
    async ({
      reset = false,
      forceRefresh = false,
    }: {
      reset?: boolean;
      forceRefresh?: boolean;
    } = {}) => {
      if (loadingRequestRef.current) return;

      try {
        loadingRequestRef.current = true;

        if (reset) {
          setLoading(true);
        }

        const startDate = toYMD(addDays(today, -INITIAL_BACK_DAYS));
        const endDate = toYMD(addDays(today, PAGE_DAYS));

        const calendarItems = await fetchCalendarItems({
          startDate,
          endDate,
          forceRefresh,
        });

        setItems(calendarItems);
        setLoadedEndDate(endDate);
        setHasMore(endDate < absoluteEndDate);
        lastLoadedAtRef.current = Date.now();
      } catch (error) {
        console.log("Calendar load failed:", error);
        Alert.alert("Calendar", "Could not load your calendar items.");
      } finally {
        loadingRequestRef.current = false;
        setLoading(false);
      }
    },
    [absoluteEndDate, today]
  );

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;

    const currentEnd = parseYMD(loadedEndDate);
    if (!currentEnd) return;

    const nextStartDate = toYMD(addDays(currentEnd, 1));
    const nextEndCandidate = addDays(currentEnd, PAGE_DAYS);
    const nextEndDate =
      toYMD(nextEndCandidate) > absoluteEndDate
        ? absoluteEndDate
        : toYMD(nextEndCandidate);

    if (nextStartDate > absoluteEndDate) {
      setHasMore(false);
      return;
    }

    try {
      setLoadingMore(true);

      const nextItems = await fetchCalendarItems({
        startDate: nextStartDate,
        endDate: nextEndDate,
        forceRefresh: false,
      });

      setItems((currentItems) => mergeCalendarItems(currentItems, nextItems));
      setLoadedEndDate(nextEndDate);
      setHasMore(nextEndDate < absoluteEndDate);
    } catch (error) {
      console.log("Calendar load more failed:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [absoluteEndDate, hasMore, loadedEndDate, loading, loadingMore]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();

      if (!hasLoadedOnceRef.current) {
        hasLoadedOnceRef.current = true;
        loadCalendar({ reset: true, forceRefresh: false });
        return;
      }

      const isStale =
        !lastLoadedAtRef.current ||
        now - lastLoadedAtRef.current > CALENDAR_STALE_AFTER_MS;

      if (isStale) {
        loadCalendar({ reset: false, forceRefresh: false });
      }
    }, [loadCalendar])
  );

  async function onRefresh() {
    setRefreshing(true);
    setHasMore(true);

    await loadCalendar({ reset: false, forceRefresh: true });

    setRefreshing(false);
  }

  const visibleItems = useMemo(() => {
    const upcomingOrRecent = items.filter((item) => {
      const itemDate = parseYMD(item.date);
      if (!itemDate) return false;

      return daysBetween(today, itemDate) >= -INITIAL_BACK_DAYS;
    });

    if (filter === "all") return upcomingOrRecent;

    return upcomingOrRecent.filter((item) => item.type === filter);
  }, [filter, items, today]);

  const itemDates = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();

    for (const item of visibleItems) {
      const existing = map.get(item.date) ?? [];
      map.set(item.date, [...existing, item]);
    }

    return map;
  }, [visibleItems]);

  const todayItems = useMemo(() => {
    return [...(itemDates.get(toYMD(today)) ?? [])]
      .sort(sortCalendarItems)
      .slice(0, 3);
  }, [itemDates, today]);

  const selectedDayItems = useMemo(() => {
    return [...(itemDates.get(toYMD(selectedDate)) ?? [])].sort(
      sortCalendarItems
    );
  }, [itemDates, selectedDate]);

  const upcomingItems = useMemo(() => {
    return [...visibleItems]
      .filter((item) => {
        const date = parseYMD(item.date);
        if (!date) return false;

        return date > today;
      })
      .sort(sortCalendarItems)
      .slice(0, 8);
  }, [today, visibleItems]);

  const agendaRows = useMemo(() => {
    const sourceItems =
      agendaScope === "upcoming"
        ? visibleItems.filter((item) => {
            const date = parseYMD(item.date);
            if (!date) return false;

            return date > today;
          })
        : visibleItems.filter((item) => item.date === toYMD(agendaSelectedDate));

    return buildAgendaRows(sourceItems, today);
  }, [agendaScope, agendaSelectedDate, today, visibleItems]);

  function changeMode(nextMode: CalendarMode) {
    if (nextMode === "agenda" && mode !== "agenda") {
      setAgendaScope("day");
    }

    setMode(nextMode);
  }

  function selectDate(date: Date) {
    setSelectedDate(date);
    setAgendaSelectedDate(date);
    setVisibleMonth(date);
    setAgendaScope("day");
  }

  function moveMonth(direction: "previous" | "next") {
    setVisibleMonth((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + (direction === "next" ? 1 : -1));
      return next;
    });
  }

  function openAddMenu() {
    Alert.alert("Add to Calendar", "Choose what you want to add.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Smart reminder",
        onPress: () => {
          navigation.navigate("AddReminder");
        },
      },
      {
        text: "Event",
        onPress: () => {
          navigation.navigate("AddEvent");
        },
      },
    ]);
  }

  function openAllReminders() {
    navigation.navigate("AllReminders");
  }

  function openAllUpcoming() {
    setAgendaScope("upcoming");
    setMode("agenda");
  }

  function openItem(item: CalendarItem) {
    if (item.type === "before_meet") {
      Alert.alert(
        item.title,
        item.subtitle || "Review this person before meeting."
      );
      return;
    }

    if (item.eventId) {
      safeNavigate(navigation, "EventDetails", {
        eventId: item.eventId,
        eventTitle: item.title,
        from: "calendar",
      });
      return;
    }

    if (item.memoryId) {
      Alert.alert(
        item.title,
        item.subtitle || "Open this memory from the contact profile."
      );
      return;
    }

    Alert.alert(item.title, item.subtitle || "Calendar item");
  }

  async function markDone(item: CalendarItem) {
    if (!item.reminderId) {
      openItem(item);
      return;
    }

    try {
      await completeReminder(item.reminderId);
      await loadCalendar({ reset: false, forceRefresh: true });
    } catch (error) {
      console.log("Complete reminder failed:", error);
      Alert.alert("Reminder", "Could not mark this reminder as done.");
    }
  }

  const renderCalendarRow = useCallback(
    ({ item }: { item: CalendarListRow }) => {
      if (item.kind === "section") {
        return (
          <Text style={[styles.timelineDateTitle, { color: colors.primary }]}>
            {item.title}
          </Text>
        );
      }

      return (
        <CalendarCard
          item={item.item}
          colors={colors}
          onOpen={openItem}
          onDone={markDone}
        />
      );
    },
    [colors]
  );

  if (loading && items.length === 0) {
    return (
      <Screen>
        <CalendarSkeleton colors={colors} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {mode === "month" ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          >
            <Header
              colors={colors}
              onReminders={openAllReminders}
              onFilter={() => setFilterVisible(true)}
            />

            <SegmentedControl
              mode={mode}
              onChange={changeMode}
              colors={colors}
            />

            <MonthHeader
              visibleMonth={visibleMonth}
              colors={colors}
              onPrevious={() => moveMonth("previous")}
              onNext={() => moveMonth("next")}
            />

            <MonthGrid
              visibleMonth={visibleMonth}
              selectedDate={selectedDate}
              itemDates={itemDates}
              colors={colors}
              onSelect={selectDate}
            />

            <TodayCard
              title={
                isSameDay(selectedDate, today)
                  ? "Today"
                  : formatLongDate(selectedDate)
              }
              subtitle={
                isSameDay(selectedDate, today)
                  ? formatLongDate(today)
                  : `${selectedDayItems.length} moment${
                      selectedDayItems.length === 1 ? "" : "s"
                    }`
              }
              items={
                isSameDay(selectedDate, today) ? todayItems : selectedDayItems
              }
              colors={colors}
              onOpen={openItem}
            />

            <UpcomingCard
              items={upcomingItems}
              colors={colors}
              onOpen={openItem}
              onSeeAll={openAllUpcoming}
            />
          </ScrollView>
        ) : (
          <FlatList
            data={agendaRows}
            keyExtractor={(row) => row.id}
            renderItem={renderCalendarRow}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.flatListContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListHeaderComponent={
              <>
                <Header
                  colors={colors}
                  onReminders={openAllReminders}
                  onFilter={() => setFilterVisible(true)}
                />

                <SegmentedControl
                  mode={mode}
                  onChange={changeMode}
                  colors={colors}
                />

                {agendaScope === "upcoming" ? (
                  <UpcomingAgendaBanner
                    colors={colors}
                    onBackToDay={() => {
                      setAgendaScope("day");
                      setAgendaSelectedDate(today);
                      setSelectedDate(today);
                      setVisibleMonth(today);
                    }}
                  />
                ) : (
                  <WeekStrip
                    selectedDate={agendaSelectedDate}
                    itemDates={itemDates}
                    colors={colors}
                    onSelect={(date) => {
                      setAgendaScope("day");
                      setAgendaSelectedDate(date);
                      setSelectedDate(date);
                      setVisibleMonth(date);
                    }}
                  />
                )}
              </>
            }
            ListEmptyComponent={
              <AgendaEmptyState
                scope={agendaScope}
                date={agendaSelectedDate}
                colors={colors}
                onAdd={openAddMenu}
              />
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : null
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.55}
            initialNumToRender={LIST_RENDER_BATCH}
            maxToRenderPerBatch={LIST_RENDER_BATCH}
            windowSize={7}
            removeClippedSubviews={Platform.OS === "android"}
          />
        )}

        <FilterSheet
          visible={filterVisible}
          filter={filter}
          colors={colors}
          onClose={() => setFilterVisible(false)}
          onChange={(nextFilter) => {
            setFilter(nextFilter);
            setFilterVisible(false);
          }}
        />
      </View>
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */
/* Skeleton                                                                      */
/* -------------------------------------------------------------------------- */

function CalendarSkeleton({ colors }: { colors: CalendarColors }) {
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.skeletonHeader}>
          <SkeletonBlock colors={colors} style={styles.skeletonTitle} />

          <View style={styles.skeletonHeaderButtons}>
            <SkeletonBlock colors={colors} style={styles.skeletonIconButton} />
            <SkeletonBlock colors={colors} style={styles.skeletonIconButton} />
          </View>
        </View>

        <SkeletonBlock colors={colors} style={styles.skeletonSegment} />

        <View style={styles.skeletonMonthHeader}>
          <SkeletonBlock colors={colors} style={styles.skeletonArrow} />
          <SkeletonBlock colors={colors} style={styles.skeletonMonthTitle} />
          <SkeletonBlock colors={colors} style={styles.skeletonArrow} />
        </View>

        <View style={styles.skeletonGridCard}>
          <View style={styles.skeletonWeekRow}>
            {Array.from({ length: 7 }).map((_, index) => (
              <SkeletonBlock
                key={`week-${index}`}
                colors={colors}
                style={styles.skeletonWeekName}
              />
            ))}
          </View>

          <View style={styles.skeletonMonthGrid}>
            {Array.from({ length: 35 }).map((_, index) => (
              <SkeletonBlock
                key={`day-${index}`}
                colors={colors}
                style={styles.skeletonDay}
              />
            ))}
          </View>
        </View>

        <View
          style={[
            styles.skeletonCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <SkeletonBlock colors={colors} style={styles.skeletonCardTitle} />
          <SkeletonRow colors={colors} />
          <SkeletonRow colors={colors} />
        </View>

        <View
          style={[
            styles.skeletonCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <SkeletonBlock colors={colors} style={styles.skeletonSmallTitle} />
          <SkeletonRow colors={colors} />
          <SkeletonRow colors={colors} />
          <SkeletonRow colors={colors} />
        </View>
      </ScrollView>
    </View>
  );
}

function SkeletonRow({ colors }: { colors: CalendarColors }) {
  return (
    <View style={styles.skeletonRow}>
      <SkeletonBlock colors={colors} style={styles.skeletonAvatar} />

      <View style={styles.skeletonRowText}>
        <SkeletonBlock colors={colors} style={styles.skeletonLineLarge} />
        <SkeletonBlock colors={colors} style={styles.skeletonLineSmall} />
      </View>

      <SkeletonBlock colors={colors} style={styles.skeletonSmallIcon} />
    </View>
  );
}

function SkeletonBlock({
  colors,
  style,
}: {
  colors: CalendarColors;
  style?: any;
}) {
  return (
    <View
      style={[
        styles.skeletonBlock,
        {
          backgroundColor: colors.softCard,
          borderColor: colors.border,
        },
        style,
      ]}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Main UI                                                                      */
/* -------------------------------------------------------------------------- */

function Header({
  colors,
  onReminders,
  onFilter,
}: {
  colors: CalendarColors;
  onReminders: () => void;
  onFilter: () => void;
}) {
  return (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: colors.title }]}>
        Calendar
      </Text>

      <View style={styles.headerActions}>
        <TouchableOpacity
          style={[
            styles.headerButton,
            {
              backgroundColor: colors.softCard,
              borderColor: colors.border,
            },
          ]}
          onPress={onReminders}
          activeOpacity={0.84}
        >
          <Ionicons name="notifications-outline" size={20} color={colors.title} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.headerButton,
            {
              backgroundColor: colors.softCard,
              borderColor: colors.border,
            },
          ]}
          onPress={onFilter}
          activeOpacity={0.84}
        >
          <Ionicons name="filter-outline" size={20} color={colors.title} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SegmentedControl({
  mode,
  onChange,
  colors,
}: {
  mode: CalendarMode;
  onChange: (mode: CalendarMode) => void;
  colors: CalendarColors;
}) {
  const modes: Array<{ key: CalendarMode; label: string }> = [
    { key: "month", label: "Month" },
    { key: "agenda", label: "Agenda" },
  ];

  return (
    <View style={[styles.segment, { backgroundColor: colors.softCard }]}>
      {modes.map((item) => {
        const active = mode === item.key;

        return (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.segmentButton,
              active && {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
              },
            ]}
            onPress={() => onChange(item.key)}
            activeOpacity={0.86}
          >
            <Text
              style={[
                styles.segmentText,
                { color: active ? colors.buttonText : colors.text },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MonthHeader({
  visibleMonth,
  colors,
  onPrevious,
  onNext,
}: {
  visibleMonth: Date;
  colors: CalendarColors;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.monthHeader}>
      <TouchableOpacity
        onPress={onPrevious}
        style={styles.monthArrow}
        activeOpacity={0.8}
      >
        <Ionicons name="chevron-back" size={21} color={colors.title} />
      </TouchableOpacity>

      <Text style={[styles.monthTitle, { color: colors.title }]}>
        {formatMonthTitle(visibleMonth)}
      </Text>

      <TouchableOpacity
        onPress={onNext}
        style={styles.monthArrow}
        activeOpacity={0.8}
      >
        <Ionicons name="chevron-forward" size={21} color={colors.title} />
      </TouchableOpacity>
    </View>
  );
}

function MonthGrid({
  visibleMonth,
  selectedDate,
  itemDates,
  colors,
  onSelect,
}: {
  visibleMonth: Date;
  selectedDate: Date;
  itemDates: Map<string, CalendarItem[]>;
  colors: CalendarColors;
  onSelect: (date: Date) => void;
}) {
  const days = useMemo(() => getMonthGrid(visibleMonth), [visibleMonth]);
  const weekNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  return (
    <View style={styles.monthGridCard}>
      <View style={styles.weekNameRow}>
        {weekNames.map((day) => (
          <Text key={day} style={[styles.weekNameText, { color: colors.muted }]}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.monthGrid}>
        {days.map((date) => {
          const key = toYMD(date);
          const active = isSameDay(date, selectedDate);
          const inMonth = isSameMonth(date, visibleMonth);
          const dayItems = itemDates.get(key) ?? [];

          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.monthDay,
                active && { backgroundColor: colors.primary },
              ]}
              onPress={() => onSelect(date)}
              activeOpacity={0.84}
            >
              <Text
                style={[
                  styles.monthDayText,
                  {
                    color: active
                      ? colors.buttonText
                      : inMonth
                      ? colors.title
                      : withOpacity(colors.text, "42"),
                  },
                ]}
              >
                {date.getDate()}
              </Text>

              <View style={styles.monthDotsRow}>
                {dayItems.slice(0, 3).map((item) => {
                  const meta = getItemMeta(item, colors);

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.monthDot,
                        {
                          backgroundColor: active
                            ? colors.buttonText
                            : meta.color,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const TodayCard = memo(function TodayCard({
  title,
  subtitle,
  items,
  colors,
  onOpen,
}: {
  title: string;
  subtitle: string;
  items: CalendarItem[];
  colors: CalendarColors;
  onOpen: (item: CalendarItem) => void;
}) {
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
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.primary }]}>
          {title}
        </Text>

        <Text style={[styles.cardSubtitle, { color: colors.text }]}>
          • {subtitle}
        </Text>
      </View>

      {items.length === 0 ? (
        <Text style={[styles.emptyInlineText, { color: colors.text }]}>
          Nothing planned for this day.
        </Text>
      ) : (
        items.map((item) => (
          <CompactCalendarRow
            key={item.id}
            item={item}
            colors={colors}
            onOpen={onOpen}
          />
        ))
      )}
    </View>
  );
});

const UpcomingCard = memo(function UpcomingCard({
  items,
  colors,
  onOpen,
  onSeeAll,
}: {
  items: CalendarItem[];
  colors: CalendarColors;
  onOpen: (item: CalendarItem) => void;
  onSeeAll: () => void;
}) {
  if (items.length === 0) return null;

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
      <View style={styles.upcomingHeader}>
        <Text style={[styles.upcomingTitle, { color: colors.text }]}>
          Upcoming
        </Text>

        <TouchableOpacity
          style={styles.seeAllButton}
          onPress={onSeeAll}
          activeOpacity={0.75}
        >
          <Text style={[styles.seeAllText, { color: colors.primary }]}>
            See all
          </Text>
        </TouchableOpacity>
      </View>

      {items.slice(0, 4).map((item) => (
        <CompactCalendarRow
          key={item.id}
          item={item}
          colors={colors}
          onOpen={onOpen}
        />
      ))}
    </View>
  );
});

function CompactCalendarRow({
  item,
  colors,
  onOpen,
}: {
  item: CalendarItem;
  colors: CalendarColors;
  onOpen: (item: CalendarItem) => void;
}) {
  const meta = getItemMeta(item, colors);
  const timeLabel = formatTime(item.time);

  return (
    <TouchableOpacity
      style={styles.compactRow}
      onPress={() => onOpen(item)}
      activeOpacity={0.84}
    >
      <ContactAvatar item={item} colors={colors} size={42} />

      <View style={styles.compactTextWrap}>
        <Text
          style={[styles.compactTitle, { color: colors.title }]}
          numberOfLines={1}
        >
          {item.title}
        </Text>

        <Text
          style={[styles.compactSubtitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {buildShortDateLabel(item.date)}
          {timeLabel ? ` • ${timeLabel}` : ""}
        </Text>
      </View>

      {!!timeLabel ? (
        <Text style={[styles.compactTime, { color: colors.muted }]}>
          {timeLabel}
        </Text>
      ) : null}

      <View
        style={[
          styles.compactIcon,
          { backgroundColor: withOpacity(meta.color, "14") },
        ]}
      >
        <Ionicons name={meta.icon} size={17} color={meta.color} />
      </View>
    </TouchableOpacity>
  );
}

/* -------------------------------------------------------------------------- */
/* Agenda / List                                                                */
/* -------------------------------------------------------------------------- */

function UpcomingAgendaBanner({
  colors,
  onBackToDay,
}: {
  colors: CalendarColors;
  onBackToDay: () => void;
}) {
  return (
    <View
      style={[
        styles.upcomingAgendaBanner,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.upcomingAgendaTextWrap}>
        <Text style={[styles.upcomingAgendaTitle, { color: colors.title }]}>
          All upcoming
        </Text>

        <Text style={[styles.upcomingAgendaSubtitle, { color: colors.text }]}>
          Showing all future reminders, events, birthdays, meetings, and memories.
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.upcomingAgendaButton,
          { backgroundColor: colors.softPrimary },
        ]}
        onPress={onBackToDay}
        activeOpacity={0.85}
      >
        <Text style={[styles.upcomingAgendaButtonText, { color: colors.primary }]}>
          Today
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function WeekStrip({
  selectedDate,
  itemDates,
  colors,
  onSelect,
}: {
  selectedDate: Date;
  itemDates: Map<string, CalendarItem[]>;
  colors: CalendarColors;
  onSelect: (date: Date) => void;
}) {
  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  return (
    <View style={styles.agendaWeekRow}>
      {weekDays.map((date) => {
        const key = toYMD(date);
        const active = isSameDay(date, selectedDate);
        const hasItems = (itemDates.get(key)?.length ?? 0) > 0;

        return (
          <TouchableOpacity
            key={key}
            style={[
              styles.agendaDay,
              active && { backgroundColor: colors.primary },
            ]}
            onPress={() => onSelect(date)}
            activeOpacity={0.84}
          >
            <Text
              style={[
                styles.agendaDayName,
                { color: active ? colors.buttonText : colors.text },
              ]}
            >
              {date
                .toLocaleDateString(undefined, { weekday: "short" })
                .toUpperCase()}
            </Text>

            <Text
              style={[
                styles.agendaDayNumber,
                { color: active ? colors.buttonText : colors.title },
              ]}
            >
              {date.getDate()}
            </Text>

            <View
              style={[
                styles.agendaDot,
                {
                  backgroundColor: hasItems
                    ? active
                      ? colors.buttonText
                      : colors.primary
                    : "transparent",
                },
              ]}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function CalendarCard({
  item,
  colors,
  onOpen,
  onDone,
}: {
  item: CalendarItem;
  colors: CalendarColors;
  onOpen: (item: CalendarItem) => void;
  onDone: (item: CalendarItem) => void;
}) {
  const meta = getItemMeta(item, colors);

  return (
    <TouchableOpacity
      style={[
        styles.largeCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
      onPress={() => onOpen(item)}
      activeOpacity={0.86}
    >
      <View style={styles.largeCardTop}>
        <ContactAvatar item={item} colors={colors} size={48} />

        <View style={styles.largeCardTextWrap}>
          <Text
            style={[styles.largeCardTitle, { color: colors.title }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          <Text
            style={[styles.largeCardSubtitle, { color: colors.text }]}
            numberOfLines={2}
          >
            {item.subtitle || meta.label}
          </Text>

          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                { backgroundColor: withOpacity(meta.color, "14") },
              ]}
            >
              <Text style={[styles.badgeText, { color: meta.color }]}>
                {meta.label}
              </Text>
            </View>

            <Text style={[styles.badgeDate, { color: colors.muted }]}>
              {buildShortDateLabel(item.date)}
            </Text>

            {!!item.time ? (
              <Text style={[styles.badgeDate, { color: colors.muted }]}>
                {formatTime(item.time)}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.largeActions}>
        <TouchableOpacity
          style={[styles.primaryAction, { backgroundColor: colors.button }]}
          onPress={() => onOpen(item)}
          activeOpacity={0.85}
        >
          <Text style={[styles.primaryActionText, { color: colors.buttonText }]}>
            {item.type === "before_meet" ? "Open prep" : "Open"}
          </Text>
        </TouchableOpacity>

        {!!item.reminderId ? (
          <TouchableOpacity
            style={[
              styles.secondaryAction,
              {
                backgroundColor: colors.softCard,
                borderColor: colors.border,
              },
            ]}
            onPress={() => onDone(item)}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryActionText, { color: colors.text }]}>
              Done
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

/* -------------------------------------------------------------------------- */
/* Filter sheet                                                                 */
/* -------------------------------------------------------------------------- */

function FilterSheet({
  visible,
  filter,
  colors,
  onClose,
  onChange,
}: {
  visible: boolean;
  filter: CalendarFilter;
  colors: CalendarColors;
  onClose: () => void;
  onChange: (filter: CalendarFilter) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.card }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.title }]}>
              Filters
            </Text>

            <TouchableOpacity
              style={[styles.sheetClose, { backgroundColor: colors.softCard }]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={20} color={colors.title} />
            </TouchableOpacity>
          </View>

          <View style={styles.sheetPills}>
            {FILTERS.map((item) => {
              const active = filter === item.key;
              const iconColor = active ? colors.primary : colors.text;

              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.sheetPill,
                    {
                      backgroundColor: active
                        ? colors.softPrimary
                        : colors.softCard,
                      borderColor: active ? colors.primary : "transparent",
                    },
                  ]}
                  onPress={() => onChange(item.key)}
                  activeOpacity={0.86}
                >
                  <Ionicons name={item.icon} size={17} color={iconColor} />

                  <Text
                    style={[
                      styles.sheetPillText,
                      { color: active ? colors.primary : colors.text },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared                                                                       */
/* -------------------------------------------------------------------------- */

function ContactAvatar({
  item,
  colors,
  size,
}: {
  item: CalendarItem;
  colors: CalendarColors;
  size: number;
}) {
  const initials = getInitials(item.contactName || item.title);

  if (item.contactPhotoUri) {
    return (
      <Image
        source={{ uri: item.contactPhotoUri }}
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.softPrimary,
          },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.avatarFallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.softPrimary,
        },
      ]}
    >
      <Text style={[styles.avatarInitials, { color: colors.primary }]}>
        {initials}
      </Text>
    </View>
  );
}

function AgendaEmptyState({
  scope,
  date,
  colors,
  onAdd,
}: {
  scope: AgendaScope;
  date: Date;
  colors: CalendarColors;
  onAdd: () => void;
}) {
  const isUpcoming = scope === "upcoming";

  return (
    <View
      style={[
        styles.emptyCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View
        style={[
          styles.emptyIcon,
          { backgroundColor: withOpacity(colors.primary, "16") },
        ]}
      >
        <Ionicons
          name={isUpcoming ? "calendar-clear-outline" : "calendar-outline"}
          size={28}
          color={colors.primary}
        />
      </View>

      <Text style={[styles.emptyTitle, { color: colors.title }]}>
        {isUpcoming ? "No upcoming moments" : `Nothing on ${formatShortDate(date)}`}
      </Text>

      <Text style={[styles.emptyText, { color: colors.text }]}>
        {isUpcoming
          ? "No future reminders, meetings, birthdays, follow-ups, or memories found."
          : "No reminders, meetings, birthdays, follow-ups, or memories for this day."}
      </Text>

      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: colors.button }]}
        onPress={onAdd}
        activeOpacity={0.85}
      >
        <Text style={[styles.emptyButtonText, { color: colors.buttonText }]}>
          Add something
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Logic                                                                        */
/* -------------------------------------------------------------------------- */

function buildAgendaRows(items: CalendarItem[], today: Date): CalendarListRow[] {
  const sorted = [...items].sort(sortCalendarItems);
  const rows: CalendarListRow[] = [];
  const seenSections = new Set<string>();

  for (const item of sorted) {
    const sectionTitle = getSectionLabel(item.date, today);

    if (!seenSections.has(sectionTitle)) {
      seenSections.add(sectionTitle);

      rows.push({
        kind: "section",
        id: `section-${sectionTitle}`,
        title: sectionTitle,
      });
    }

    rows.push({
      kind: "item",
      id: item.id,
      item,
    });
  }

  return rows;
}

function mergeCalendarItems(
  currentItems: CalendarItem[],
  nextItems: CalendarItem[]
) {
  const map = new Map<string, CalendarItem>();

  for (const item of currentItems) {
    map.set(item.id, item);
  }

  for (const item of nextItems) {
    map.set(item.id, item);
  }

  return Array.from(map.values()).sort(sortCalendarItems);
}

function getItemMeta(
  item: CalendarItem,
  colors: CalendarColors
): {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
} {
  switch (item.type) {
    case "birthday":
      return { label: "Birthday", icon: "gift-outline", color: "#FF4F8B" };
    case "check_in":
      return { label: "Follow-up", icon: "call-outline", color: colors.success };
    case "reminder":
      return {
        label: "Reminder",
        icon: "notifications-outline",
        color: colors.primary,
      };
    case "ask_next_time":
      return {
        label: "Ask next",
        icon: "chatbubble-ellipses-outline",
        color: colors.success,
      };
    case "before_meet":
      return {
        label: "Before Meet",
        icon: "document-text-outline",
        color: colors.purple,
      };
    case "meeting":
      return { label: "Meeting", icon: "people-outline", color: colors.blue };
    case "memory_date":
      return { label: "Memory", icon: "journal-outline", color: colors.purple };
    case "event":
    default:
      return { label: "Event", icon: "calendar-outline", color: colors.warning };
  }
}

function safeNavigate(navigation: any, routeName: string, params?: any) {
  try {
    navigation.navigate?.(routeName, params);
  } catch (error) {
    console.log(`Navigation failed to ${routeName}`, error);
    Alert.alert("Coming soon", "This screen is not connected yet.");
  }
}

function sortCalendarItems(a: CalendarItem, b: CalendarItem) {
  if (a.date !== b.date) return a.date.localeCompare(b.date);

  const aTime = a.time ?? "99:99";
  const bTime = b.time ?? "99:99";

  return aTime.localeCompare(bTime);
}

function getInitials(name?: string | null) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/* -------------------------------------------------------------------------- */
/* Dates                                                                        */
/* -------------------------------------------------------------------------- */

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseYMD(value?: string | null): Date | null {
  if (!value) return null;

  const [yearRaw, monthRaw, dayRaw] = value.slice(0, 10).split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function toYMD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(from: Date, to: Date) {
  const start = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate()
  ).getTime();

  const end = new Date(
    to.getFullYear(),
    to.getMonth(),
    to.getDate()
  ).getTime();

  return Math.round((end - start) / 86_400_000);
}

function isSameDay(a?: Date | null, b?: Date | null) {
  if (!a || !b) return false;

  return toYMD(a) === toYMD(b);
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function getMonday(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  return addDays(date, diff);
}

function getWeekDays(date: Date) {
  const monday = getMonday(date);

  return Array.from({ length: 7 }).map((_, index) =>
    addDays(monday, index)
  );
}

function getMonthGrid(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const mondayIndex = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const gridStart = addDays(firstDay, -mondayIndex);

  return Array.from({ length: 42 }).map((_, index) =>
    addDays(gridStart, index)
  );
}

function formatTime(time?: string | null) {
  if (!time) return "";

  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;

  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatLongDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatMonthTitle(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function getSectionLabel(dateValue: string, today: Date) {
  const date = parseYMD(dateValue);
  if (!date) return dateValue;

  const diff = daysBetween(today, date);

  if (diff === -1) return "Yesterday";
  if (diff === 0) return `Today • ${formatLongDate(today)}`;
  if (diff === 1) return `Tomorrow • ${formatLongDate(date)}`;

  return formatLongDate(date);
}

function buildShortDateLabel(dateValue: string) {
  const date = parseYMD(dateValue);
  if (!date) return dateValue;

  const diff = daysBetween(startOfToday(), date);

  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  if (diff < -1) return "Overdue";

  return formatShortDate(date);
}

/* -------------------------------------------------------------------------- */
/* Colors                                                                       */
/* -------------------------------------------------------------------------- */

function makeCalendarColors(settings: any): CalendarColors {
  return {
    background: settings.backgroundColor ?? "#F8F4FF",
    card: settings.cardColor ?? "#FFFFFF",
    title: settings.titleColor ?? "#10162F",
    text: settings.textColor ?? "#5F6680",
    primary: settings.primaryColor ?? "#6651E5",
    button: settings.buttonColor || settings.primaryColor || "#6651E5",
    buttonText: settings.buttonTextColor ?? "#FFFFFF",
    border: withOpacity(settings.textColor ?? "#10162F", "14"),
    muted: withOpacity(settings.textColor ?? "#10162F", "76"),
    softCard: withOpacity(settings.primaryColor ?? "#6651E5", "0D"),
    softPrimary: withOpacity(settings.primaryColor ?? "#6651E5", "18"),
    danger: "#EE6A5E",
    warning: "#FF9F45",
    success: "#20A464",
    purple: "#7C5CFF",
    blue: "#4D82D8",
    shadow: settings.themeMode === "dark" ? "#000000" : "#7B6AE6",
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

/* -------------------------------------------------------------------------- */
/* Styles                                                                       */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 16,
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 34,
    gap: 12,
  },

  flatListContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 34,
    gap: 12,
  },

  loadingMore: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    fontSize: 31,
    lineHeight: 37,
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  headerActions: {
    flexDirection: "row",
    gap: 9,
  },

  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  segment: {
    height: 47,
    borderRadius: 20,
    padding: 4,
    flexDirection: "row",
  },

  segmentButton: {
    flex: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  segmentText: {
    fontSize: 13,
    fontWeight: "900",
  },

  monthHeader: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  monthArrow: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  monthTitle: {
    fontSize: 17,
    fontWeight: "900",
  },

  monthGridCard: {
    paddingTop: 2,
  },

  weekNameRow: {
    flexDirection: "row",
    marginBottom: 8,
  },

  weekNameText: {
    flex: 1,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "900",
  },

  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  monthDay: {
    width: `${100 / 7}%`,
    height: 42,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },

  monthDayText: {
    fontSize: 16,
    fontWeight: "900",
  },

  monthDotsRow: {
    minHeight: 6,
    flexDirection: "row",
    gap: 3,
    marginTop: 4,
  },

  monthDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 13,
    shadowOpacity: 0.045,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  cardHeader: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  cardSubtitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 4,
  },

  emptyInlineText: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.7,
    paddingVertical: 8,
  },

  upcomingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  upcomingTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  seeAllButton: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  seeAllText: {
    fontSize: 12,
    fontWeight: "900",
  },

  compactRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },

  avatar: {
    overflow: "hidden",
  },

  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },

  avatarInitials: {
    fontSize: 13,
    fontWeight: "900",
  },

  compactTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  compactTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  compactSubtitle: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.76,
    marginTop: 2,
  },

  compactTime: {
    fontSize: 11,
    fontWeight: "800",
  },

  compactIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  upcomingAgendaBanner: {
    minHeight: 78,
    borderRadius: 22,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowOpacity: 0.045,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  upcomingAgendaTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  upcomingAgendaTitle: {
    fontSize: 16,
    fontWeight: "900",
  },

  upcomingAgendaSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 3,
  },

  upcomingAgendaButton: {
    minHeight: 38,
    borderRadius: 15,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  upcomingAgendaButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },

  agendaWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 7,
  },

  agendaDay: {
    flex: 1,
    minHeight: 66,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  agendaDayName: {
    fontSize: 10,
    fontWeight: "900",
  },

  agendaDayNumber: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },

  agendaDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 6,
  },

  timelineDateTitle: {
    fontSize: 17,
    fontWeight: "900",
  },

  largeCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    shadowOpacity: 0.045,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  largeCardTop: {
    flexDirection: "row",
    gap: 12,
  },

  largeCardTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  largeCardTitle: {
    fontSize: 16,
    fontWeight: "900",
  },

  largeCardSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.76,
    marginTop: 3,
  },

  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 9,
  },

  badge: {
    minHeight: 25,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: {
    fontSize: 11,
    fontWeight: "900",
  },

  badgeDate: {
    fontSize: 12,
    fontWeight: "800",
  },

  largeActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },

  primaryAction: {
    flex: 1,
    height: 40,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryActionText: {
    fontSize: 13,
    fontWeight: "900",
  },

  secondaryAction: {
    height: 40,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryActionText: {
    fontSize: 13,
    fontWeight: "900",
  },

  emptyCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    shadowOpacity: 0.045,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    opacity: 0.72,
    textAlign: "center",
    marginTop: 7,
  },

  emptyButton: {
    height: 44,
    borderRadius: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },

  emptyButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },

  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(14, 12, 26, 0.28)",
    justifyContent: "flex-start",
  },

  sheet: {
    marginHorizontal: 10,
    marginTop: Platform.OS === "ios" ? 62 : 38,
    borderRadius: 30,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 22,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },

  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    marginBottom: 14,
  },

  sheetHeader: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sheetTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.3,
  },

  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  sheetPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },

  sheetPill: {
    minHeight: 46,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  sheetPillText: {
    fontSize: 13,
    fontWeight: "900",
  },

  skeletonBlock: {
    borderWidth: 1,
    opacity: 0.85,
  },

  skeletonHeader: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  skeletonTitle: {
    width: 160,
    height: 34,
    borderRadius: 14,
  },

  skeletonHeaderButtons: {
    flexDirection: "row",
    gap: 9,
  },

  skeletonIconButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
  },

  skeletonSegment: {
    height: 47,
    borderRadius: 20,
  },

  skeletonMonthHeader: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  skeletonArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },

  skeletonMonthTitle: {
    width: 128,
    height: 24,
    borderRadius: 12,
  },

  skeletonGridCard: {
    paddingTop: 2,
  },

  skeletonWeekRow: {
    flexDirection: "row",
    gap: 7,
    marginBottom: 8,
  },

  skeletonWeekName: {
    flex: 1,
    height: 12,
    borderRadius: 6,
  },

  skeletonMonthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  skeletonDay: {
    width: `${100 / 7}%`,
    height: 38,
    borderRadius: 18,
    marginVertical: 3,
    transform: [{ scale: 0.86 }],
  },

  skeletonCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 13,
    shadowOpacity: 0.045,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  skeletonCardTitle: {
    width: 150,
    height: 22,
    borderRadius: 11,
    marginBottom: 12,
  },

  skeletonSmallTitle: {
    width: 100,
    height: 20,
    borderRadius: 10,
    marginBottom: 12,
  },

  skeletonRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },

  skeletonAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },

  skeletonRowText: {
    flex: 1,
    gap: 7,
  },

  skeletonLineLarge: {
    width: "78%",
    height: 14,
    borderRadius: 7,
  },

  skeletonLineSmall: {
    width: "48%",
    height: 12,
    borderRadius: 6,
  },

  skeletonSmallIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
  },
});