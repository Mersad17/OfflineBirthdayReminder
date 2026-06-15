// src/screens/Reminders/RemindersScreen.tsx
import React, { useCallback, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import {
  deleteReminder,
  fetchReminders,
  updateReminder,
  type ReminderWithContextDTO,
} from "../../reminders/repository";
import { formatReminder, formatSendAt } from "../../reminders/utils";
import { Screen } from "../../components/Screen";
import { REMINDER_STATUS } from "../../events/types";
import { useAppearance } from "../../appearance/AppearanceContext";

type ReminderTab = "upcoming" | "done";

type ReminderFilter =
  | "all"
  | "overdue"
  | "today"
  | "next7"
  | "later"
  | "in_app_only";

type ReminderColors = {
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

type ReminderListRow =
  | {
      kind: "section";
      id: string;
      title: string;
    }
  | {
      kind: "item";
      id: string;
      reminder: ReminderWithContextDTO;
    };

const LIST_BATCH_SIZE = 6;

const FILTERS: Array<{
  key: ReminderFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: "all", label: "All", icon: "albums-outline" },
  { key: "overdue", label: "Overdue", icon: "alert-circle-outline" },
  { key: "today", label: "Today", icon: "time-outline" },
  { key: "next7", label: "Next 7 days", icon: "calendar-outline" },
  { key: "later", label: "Later", icon: "play-forward-outline" },
  {
    key: "in_app_only",
    label: "In-app only",
    icon: "notifications-off-outline",
  },
];

export default function RemindersScreen({ navigation }: any) {
  const { settings } = useAppearance();
  const colors = useMemo(() => makeReminderColors(settings), [settings]);

  const isFocused = useIsFocused();
  const requestIdRef = useRef(0);
  const loadingRef = useRef(false);

  const [tab, setTab] = React.useState<ReminderTab>("upcoming");
  const [filter, setFilter] = React.useState<ReminderFilter>("all");
  const [filterVisible, setFilterVisible] = React.useState(false);
  const [reminders, setReminders] = React.useState<ReminderWithContextDTO[]>(
    []
  );
  const [refreshing, setRefreshing] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [bulkLoading, setBulkLoading] = React.useState(false);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(
    null
  );

  const load = useCallback(
    async ({ showFullLoading = false }: { showFullLoading?: boolean } = {}) => {
      if (loadingRef.current) return;

      const requestId = ++requestIdRef.current;
      loadingRef.current = true;

      if (showFullLoading) {
        setLoading(true);
      }

      try {
        const data = await fetchReminders();

        if (requestId !== requestIdRef.current) return;

        setReminders(sortReminders(data));
      } catch (error) {
        if (requestId !== requestIdRef.current) return;

        console.log("Failed to load reminders", error);
        Alert.alert("Error", "Failed to load reminders.");
      } finally {
        if (requestId !== requestIdRef.current) return;

        loadingRef.current = false;
        setLoading(false);
      }
    },
    []
  );

  React.useEffect(() => {
    if (!isFocused) return;

    load({ showFullLoading: reminders.length === 0 });
  }, [isFocused, load]);

  async function onRefresh() {
    setRefreshing(true);

    try {
      await load({ showFullLoading: false });
    } finally {
      setRefreshing(false);
    }
  }

  function openAddReminder() {
    navigation.navigate("AddReminder");
  }

  function openReminder(reminder: ReminderWithContextDTO) {
    if (!reminder.event) {
      Alert.alert("Reminder", "This reminder is not connected to an event.");
      return;
    }

    navigation.navigate("EventDetails", {
      eventId: reminder.event,
      eventTitle: reminder.event_title || formatReminder(reminder),
      from: "reminders",
      contactId: reminder.contact_id,
    });
  }

  async function markDone(reminder: ReminderWithContextDTO) {
    try {
      setActionLoadingId(String(reminder.id));

      await updateReminder(reminder.id, {
        event: reminder.event,
        status: REMINDER_STATUS.SENT,
        is_active: false,
      });

      setReminders((current) =>
        sortReminders(
          current.map((item) =>
            String(item.id) === String(reminder.id)
              ? {
                  ...item,
                  status: REMINDER_STATUS.SENT,
                  is_active: false,
                  notification_id: null,
                }
              : item
          )
        )
      );

      await load({ showFullLoading: false });
    } catch (error) {
      console.log("Mark reminder done failed:", error);
      Alert.alert("Reminder", "Could not mark this reminder as done.");
    } finally {
      setActionLoadingId(null);
    }
  }

  function askSnooze(reminder: ReminderWithContextDTO) {
    Alert.alert("Snooze reminder", "When should it remind you again?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Later today",
        onPress: () => snoozeReminder(reminder, "later_today"),
      },
      {
        text: "Tomorrow",
        onPress: () => snoozeReminder(reminder, "tomorrow"),
      },
      {
        text: "In 3 days",
        onPress: () => snoozeReminder(reminder, "three_days"),
      },
      {
        text: "Next week",
        onPress: () => snoozeReminder(reminder, "next_week"),
      },
    ]);
  }

  async function snoozeReminder(
    reminder: ReminderWithContextDTO,
    preset: "later_today" | "tomorrow" | "three_days" | "next_week"
  ) {
    try {
      setActionLoadingId(String(reminder.id));

      const nextDate = getSnoozeDate(reminder, preset);
      const iso = nextDate.toISOString();

      await updateReminder(reminder.id, {
        event: reminder.event,
        days_before: null,
        absolute_datetime: iso,
        send_at: iso,
        time_of_day: null,
        status: REMINDER_STATUS.PENDING,
        is_active: true,
      });

      setReminders((current) =>
        sortReminders(
          current.map((item) =>
            String(item.id) === String(reminder.id)
              ? {
                  ...item,
                  days_before: null,
                  absolute_datetime: iso,
                  send_at: iso,
                  time_of_day: null,
                  status: REMINDER_STATUS.PENDING,
                  is_active: true,
                }
              : item
          )
        )
      );

      setTab("upcoming");
      setFilter("all");

      await load({ showFullLoading: false });
    } catch (error) {
      console.log("Snooze reminder failed:", error);
      Alert.alert("Reminder", "Could not snooze this reminder.");
    } finally {
      setActionLoadingId(null);
    }
  }

  function confirmDelete(reminder: ReminderWithContextDTO) {
    Alert.alert(
      "Delete reminder?",
      `Remove this reminder for ${reminder.contact_name || "this person"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setActionLoadingId(String(reminder.id));

              await deleteReminder(reminder.id);

              setReminders((current) =>
                current.filter(
                  (item) => String(item.id) !== String(reminder.id)
                )
              );
            } catch (error) {
              console.log("Delete reminder failed:", error);
              Alert.alert("Reminder", "Could not delete this reminder.");
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  }

  function confirmDeleteAllOverdue() {
    const overdue = reminders.filter(
      (reminder) => !isReminderDone(reminder) && isReminderOverdue(reminder)
    );

    if (overdue.length === 0) {
      Alert.alert("Overdue reminders", "You have no overdue reminders.");
      return;
    }

    Alert.alert(
      "Delete all overdue?",
      `This will remove ${overdue.length} overdue reminder${
        overdue.length === 1 ? "" : "s"
      }. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete overdue",
          style: "destructive",
          onPress: async () => {
            try {
              setBulkLoading(true);

              await Promise.all(
                overdue.map((reminder) => deleteReminder(reminder.id))
              );

              const overdueIds = new Set(
                overdue.map((reminder) => String(reminder.id))
              );

              setReminders((current) =>
                current.filter((item) => !overdueIds.has(String(item.id)))
              );

              if (filter === "overdue") {
                setFilter("all");
              }
            } catch (error) {
              console.log("Delete overdue reminders failed:", error);
              Alert.alert(
                "Reminder",
                "Could not delete all overdue reminders."
              );
            } finally {
              setBulkLoading(false);
            }
          },
        },
      ]
    );
  }

  const counts = useMemo(() => {
    const upcoming = reminders.filter((item) => !isReminderDone(item)).length;
    const done = reminders.filter(isReminderDone).length;
    const overdue = reminders.filter(
      (item) => !isReminderDone(item) && isReminderOverdue(item)
    ).length;
    const today = reminders.filter(
      (item) => !isReminderDone(item) && getReminderBucket(item) === "today"
    ).length;
    const inAppOnly = reminders.filter(
      (item) => !isReminderDone(item) && !item.notification_id
    ).length;

    return {
      upcoming,
      done,
      overdue,
      today,
      inAppOnly,
    };
  }, [reminders]);

  const filteredReminders = useMemo(() => {
    return reminders.filter((reminder) => {
      const done = isReminderDone(reminder);

      if (tab === "done") return done;
      if (done) return false;

      return matchesReminderFilter(reminder, filter);
    });
  }, [filter, reminders, tab]);

  const rows = useMemo(() => {
    return buildReminderRows(filteredReminders, tab);
  }, [filteredReminders, tab]);

  const isEmpty = !loading && rows.length === 0;

  const renderRow = useCallback(
    ({ item }: { item: ReminderListRow }) => {
      if (item.kind === "section") {
        return (
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            {item.title}
          </Text>
        );
      }

      return (
        <MemoReminderCard
          reminder={item.reminder}
          colors={colors}
          loading={actionLoadingId === String(item.reminder.id)}
          onOpen={() => openReminder(item.reminder)}
          onDone={() => markDone(item.reminder)}
          onSnooze={() => askSnooze(item.reminder)}
          onDelete={() => confirmDelete(item.reminder)}
        />
      );
    },
    [actionLoadingId, colors]
  );

  if (loading && reminders.length === 0) {
    return (
      <Screen>
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} />

          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading reminders…
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
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
            <>
<ReminderHeader
  count={tab === "done" ? counts.done : counts.upcoming}
  totalCount={reminders.length}
  overdueCount={counts.overdue}
  todayCount={counts.today}
  colors={colors}
  canGoBack={Boolean(navigation.canGoBack?.())}
  onBack={() => navigation.goBack?.()}
/>

              <ReminderTabs
                activeTab={tab}
                counts={counts}
                colors={colors}
                onChange={(nextTab) => {
                  setTab(nextTab);

                  if (nextTab === "done") {
                    setFilter("all");
                  }
                }}
              />

             {tab === "upcoming" ? (
            <FilterAccessCard
              filter={filter}
              colors={colors}
              onPress={() => setFilterVisible(true)}
              onClear={() => setFilter("all")}
            />
          ) : null}

          {tab === "upcoming" && filter === "overdue" && counts.overdue > 0 ? (
            <OverdueActionCard
              count={counts.overdue}
              colors={colors}
              loading={bulkLoading}
              onDeleteAll={confirmDeleteAllOverdue}
            />
          ) : null}
            </>
          }
          ListEmptyComponent={
            isEmpty ? (
              <EmptyRemindersState
                tab={tab}
                filter={filter}
                colors={colors}
                onAdd={openAddReminder}
              />
            ) : null
          }
          ListFooterComponent={<View style={styles.footerSpace} />}
          initialNumToRender={LIST_BATCH_SIZE}
          maxToRenderPerBatch={LIST_BATCH_SIZE}
          updateCellsBatchingPeriod={80}
          windowSize={5}
          removeClippedSubviews={Platform.OS === "android"}
          extraData={actionLoadingId}
        />

        <FilterSheet
          visible={filterVisible}
          activeFilter={filter}
          reminders={reminders}
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

function ReminderHeader({
  count,
  totalCount,
  overdueCount,
  todayCount,
  colors,
  canGoBack,
  onBack,
}: {
  count: number;
  totalCount: number;
  overdueCount: number;
  todayCount: number;
  colors: ReminderColors;
  canGoBack: boolean;
  onBack: () => void;
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

      <View style={styles.headerMainRow}>
        {canGoBack ? (
          <TouchableOpacity
            style={styles.headerRoundButton}
            onPress={onBack}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}

        <View style={styles.headerIconBubble}>
          <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>REMINDERS</Text>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Reminders
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {count} active here · {totalCount} total
          </Text>
        </View>
      </View>

      <View style={styles.headerStatsRow}>
        <View style={styles.headerStatPill}>
          <Text style={styles.headerStatValue}>{todayCount}</Text>
          <Text style={styles.headerStatLabel}>Today</Text>
        </View>

        <View style={styles.headerStatPill}>
          <Text style={styles.headerStatValue}>{overdueCount}</Text>
          <Text style={styles.headerStatLabel}>Overdue</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function ReminderTabs({
  activeTab,
  counts,
  colors,
  onChange,
}: {
  activeTab: ReminderTab;
  counts: { upcoming: number; done: number };
  colors: ReminderColors;
  onChange: (tab: ReminderTab) => void;
}) {
  const tabs: Array<{
    key: ReminderTab;
    label: string;
    count: number;
  }> = [
    { key: "upcoming", label: "Upcoming", count: counts.upcoming },
    { key: "done", label: "Done", count: counts.done },
  ];

  return (
    <View style={[styles.tabs, { backgroundColor: colors.softCard }]}>
      {tabs.map((tab) => {
        const active = activeTab === tab.key;

        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              active && { backgroundColor: colors.primary },
            ]}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.86}
          >
            <Text
              style={[
                styles.tabText,
                { color: active ? colors.buttonText : colors.text },
              ]}
            >
              {tab.label}
            </Text>

            <View
              style={[
                styles.tabCountPill,
                {
                  backgroundColor: active
                    ? "rgba(255,255,255,0.18)"
                    : colors.softPrimary,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabCountText,
                  { color: active ? colors.buttonText : colors.primary },
                ]}
              >
                {tab.count}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function FilterAccessCard({
  filter,
  colors,
  onPress,
  onClear,
}: {
  filter: ReminderFilter;
  colors: ReminderColors;
  onPress: () => void;
  onClear: () => void;
}) {
  const isActive = filter !== "all";
  const label = getFilterLabel(filter);

  return (
    <View
      style={[
        styles.filterAccessCard,
        {
          backgroundColor: isActive ? colors.softPrimary : colors.card,
          borderColor: isActive
            ? withOpacity(colors.primary, "28")
            : colors.border,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.filterAccessMain}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Ionicons
          name="filter-outline"
          size={16}
          color={isActive ? colors.primary : colors.text}
        />

        <Text
          style={[
            styles.filterAccessText,
            { color: isActive ? colors.primary : colors.text },
          ]}
        >
          Filter: {label}
        </Text>
      </TouchableOpacity>

      {isActive ? (
        <TouchableOpacity onPress={onClear} activeOpacity={0.85}>
          <Text style={[styles.filterAccessClear, { color: colors.primary }]}>
            Clear
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
          <Text style={[styles.filterAccessClear, { color: colors.primary }]}>
            Change
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function FilterSheet({
  visible,
  activeFilter,
  reminders,
  colors,
  onClose,
  onChange,
}: {
  visible: boolean;
  activeFilter: ReminderFilter;
  reminders: ReminderWithContextDTO[];
  colors: ReminderColors;
  onClose: () => void;
  onChange: (filter: ReminderFilter) => void;
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
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[styles.sheetTitle, { color: colors.title }]}>
                Filters
              </Text>

              <Text style={[styles.sheetSubtitle, { color: colors.text }]}>
                Show the reminders you need right now.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.sheetCloseButton, { backgroundColor: colors.softCard }]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={19} color={colors.title} />
            </TouchableOpacity>
          </View>

          <View style={styles.sheetFilterList}>
            {FILTERS.map((item) => {
              const active = activeFilter === item.key;
              const count = getFilterCount(reminders, item.key);

              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.sheetFilterRow,
                    {
                      backgroundColor: active
                        ? colors.softPrimary
                        : colors.softCard,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => onChange(item.key)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.sheetFilterIcon,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : colors.softPrimary,
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={17}
                      color={active ? colors.buttonText : colors.primary}
                    />
                  </View>

                  <View style={styles.sheetFilterTextWrap}>
                    <Text
                      style={[
                        styles.sheetFilterTitle,
                        { color: active ? colors.primary : colors.title },
                      ]}
                    >
                      {item.label}
                    </Text>

                    <Text
                      style={[styles.sheetFilterSubtitle, { color: colors.text }]}
                    >
                      {count} reminder{count === 1 ? "" : "s"}
                    </Text>
                  </View>

                  {active ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={21}
                      color={colors.primary}
                    />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={colors.muted}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function OverdueActionCard({
  count,
  colors,
  loading,
  onDeleteAll,
}: {
  count: number;
  colors: ReminderColors;
  loading: boolean;
  onDeleteAll: () => void;
}) {
  return (
    <View
      style={[
        styles.overdueCard,
        {
          backgroundColor: withOpacity(colors.danger, "12"),
          borderColor: withOpacity(colors.danger, "32"),
        },
      ]}
    >
      <View style={styles.overdueLeft}>
        <View
          style={[
            styles.overdueIcon,
            { backgroundColor: withOpacity(colors.danger, "18") },
          ]}
        >
          <Ionicons
            name="alert-circle-outline"
            size={20}
            color={colors.danger}
          />
        </View>

        <View style={styles.overdueTextWrap}>
          <Text style={[styles.overdueTitle, { color: colors.danger }]}>
            {count} overdue reminder{count === 1 ? "" : "s"}
          </Text>

          <Text style={[styles.overdueText, { color: colors.text }]}>
            Clean up reminders you no longer need.
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.deleteOverdueButton,
          { backgroundColor: withOpacity(colors.danger, "16") },
        ]}
        onPress={onDeleteAll}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.danger} />
        ) : (
          <Text style={[styles.deleteOverdueText, { color: colors.danger }]}>
            Delete all
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function ReminderCard({
  reminder,
  colors,
  loading,
  onOpen,
  onDone,
  onSnooze,
  onDelete,
}: {
  reminder: ReminderWithContextDTO;
  colors: ReminderColors;
  loading: boolean;
  onOpen: () => void;
  onDone: () => void;
  onSnooze: () => void;
  onDelete: () => void;
}) {
  const done = isReminderDone(reminder);
  const status = getStatusStyle(reminder.status, colors);
  const hasNotification = Boolean(reminder.notification_id);
  const timeState = getTimeState(reminder);
  const initials = getInitials(reminder.contact_name);
  const eventLabel = getEventTypeLabel(reminder.event_type);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
          opacity: loading ? 0.62 : 1,
        },
      ]}
      onPress={onOpen}
      activeOpacity={0.86}
      disabled={loading}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.avatarWrap}>
          {reminder.contact_photo ? (
            <Image
              source={{ uri: reminder.contact_photo }}
              style={styles.avatarImage}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                { backgroundColor: withOpacity(colors.primary, "18") },
              ]}
            >
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {initials}
              </Text>
            </View>
          )}

          <View
            style={[
              styles.avatarStatusDot,
              {
                backgroundColor: status.color,
                borderColor: colors.card,
              },
            ]}
          />
        </View>

        <View style={styles.cardTextWrap}>
          <Text
            style={[styles.cardTitle, { color: colors.title }]}
            numberOfLines={2}
          >
            {reminder.event_title || formatReminder(reminder)}
          </Text>

          <Text
            style={[styles.cardPerson, { color: colors.primary }]}
            numberOfLines={1}
          >
            For {reminder.contact_name || "Unknown person"}
          </Text>

          <Text
            style={[styles.cardSub, { color: colors.text }]}
            numberOfLines={2}
          >
            {formatReminder(reminder)} · {formatSendAt(reminder)}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        )}
      </View>

      <View style={[styles.eventInfoBox, { backgroundColor: colors.softCard }]}>
        <View style={styles.eventInfoLeft}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={colors.primary}
          />

          <Text
            style={[styles.eventInfoText, { color: colors.text }]}
            numberOfLines={1}
          >
            {eventLabel} · {formatEventDate(reminder)}
          </Text>
        </View>
      </View>

      <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

      <View style={styles.metaRow}>
        <StatusPill
          color={status.color}
          label={status.label}
          icon={status.icon}
        />

        <StatusPill
          color={timeState.color}
          label={timeState.label}
          icon={timeState.icon}
        />

        <StatusPill
          color={hasNotification ? colors.success : colors.warning}
          label={hasNotification ? "Scheduled" : "In-app only"}
          icon={
            hasNotification
              ? "checkmark-circle-outline"
              : "notifications-off-outline"
          }
        />
      </View>

      <View style={styles.actionRow}>
        {!done ? (
          <>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.softPrimary },
              ]}
              onPress={(event) => {
                event.stopPropagation();
                onDone();
              }}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={15}
                color={colors.primary}
              />

              <Text style={[styles.actionText, { color: colors.primary }]}>
                Done
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.softCard },
              ]}
              onPress={(event) => {
                event.stopPropagation();
                onSnooze();
              }}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Ionicons name="time-outline" size={15} color={colors.text} />

              <Text style={[styles.actionText, { color: colors.text }]}>
                Snooze
              </Text>
            </TouchableOpacity>
          </>
        ) : null}

        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: withOpacity(colors.danger, "12") },
          ]}
          onPress={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          activeOpacity={0.85}
          disabled={loading}
        >
          <Ionicons name="trash-outline" size={15} color={colors.danger} />

          <Text style={[styles.actionText, { color: colors.danger }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const MemoReminderCard = React.memo(
  ReminderCard,
  (prev, next) =>
    prev.reminder === next.reminder &&
    prev.loading === next.loading &&
    prev.colors === next.colors
);

function StatusPill({
  color,
  label,
  icon,
}: {
  color: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View
      style={[
        styles.statusPill,
        {
          backgroundColor: withOpacity(color, "14"),
          borderColor: withOpacity(color, "34"),
        },
      ]}
    >
      <Ionicons name={icon} size={13} color={color} />

      <Text style={[styles.statusText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function EmptyRemindersState({
  tab,
  filter,
  colors,
  onAdd,
}: {
  tab: ReminderTab;
  filter: ReminderFilter;
  colors: ReminderColors;
  onAdd: () => void;
}) {
  const isDone = tab === "done";
  const isFiltered = tab === "upcoming" && filter !== "all";

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
      <View style={[styles.emptyIcon, { backgroundColor: colors.softPrimary }]}>
        <Ionicons
          name={isDone ? "checkmark-circle-outline" : "notifications-outline"}
          size={28}
          color={colors.primary}
        />
      </View>

      <Text style={[styles.emptyTitle, { color: colors.title }]}>
        {isDone
          ? "Nothing done yet"
          : isFiltered
          ? "Nothing matches this filter"
          : "No upcoming reminders"}
      </Text>

      <Text style={[styles.emptyText, { color: colors.text }]}>
        {isDone
          ? "Completed reminders will appear here after you mark them as done."
          : isFiltered
          ? "Try another filter or create a new reminder."
          : "Create reminders for birthdays, promises, check-ins, interviews, or any important moment connected to someone."}
      </Text>

      {!isDone ? (
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: colors.button }]}
          onPress={onAdd}
          activeOpacity={0.88}
        >
          <Ionicons
            name="add-circle-outline"
            size={17}
            color={colors.buttonText}
          />

          <Text style={[styles.emptyButtonText, { color: colors.buttonText }]}>
            Create reminder
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* helpers */

function sortReminders(reminders: ReminderWithContextDTO[]) {
  return [...reminders].sort((a, b) => {
    if (!a.send_at && !b.send_at) return 0;
    if (!a.send_at) return 1;
    if (!b.send_at) return -1;

    return new Date(a.send_at).getTime() - new Date(b.send_at).getTime();
  });
}

function isReminderDone(reminder: ReminderWithContextDTO) {
  return (
    reminder.status === REMINDER_STATUS.SENT ||
    reminder.status === REMINDER_STATUS.CANCELLED ||
    reminder.is_active === false
  );
}

function isReminderOverdue(reminder: ReminderWithContextDTO) {
  if (!reminder.send_at) return false;

  const sendAt = new Date(reminder.send_at);

  if (Number.isNaN(sendAt.getTime())) return false;

  return sendAt.getTime() < new Date().getTime();
}

function getReminderBucket(reminder: ReminderWithContextDTO) {
  if (!reminder.send_at) return "no_date";

  const target = new Date(reminder.send_at);

  if (Number.isNaN(target.getTime())) return "no_date";

  const now = new Date();

  if (!isReminderDone(reminder) && target.getTime() < now.getTime()) {
    return "overdue";
  }

  const today = startOfDay(now);
  const targetDay = startOfDay(target);
  const diff = Math.round((targetDay.getTime() - today.getTime()) / 86_400_000);

  if (diff === 0) return "today";
  if (diff <= 7) return "next7";
  return "later";
}
function matchesReminderFilter(
  reminder: ReminderWithContextDTO,
  filter: ReminderFilter
) {
  if (filter === "all") return true;
  if (filter === "in_app_only") return !reminder.notification_id;

  return getReminderBucket(reminder) === filter;
}

function getFilterCount(
  reminders: ReminderWithContextDTO[],
  filter: ReminderFilter
) {
  return reminders.filter((reminder) => {
    if (isReminderDone(reminder)) return false;

    return matchesReminderFilter(reminder, filter);
  }).length;
}

function getFilterLabel(filter: ReminderFilter) {
  return FILTERS.find((item) => item.key === filter)?.label ?? "All";
}

function buildReminderRows(
  reminders: ReminderWithContextDTO[],
  tab: ReminderTab
): ReminderListRow[] {
  const rows: ReminderListRow[] = [];
  const seenSections = new Set<string>();

  for (const reminder of reminders) {
    const sectionTitle =
      tab === "done" ? "Completed" : getReminderSectionLabel(reminder);

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
      id: `reminder-${reminder.id}`,
      reminder,
    });
  }

  return rows;
}

function getReminderSectionLabel(reminder: ReminderWithContextDTO) {
  const bucket = getReminderBucket(reminder);

  if (bucket === "overdue") return "Overdue";
  if (bucket === "today") return "Today";
  if (bucket === "next7") return "Next 7 days";
  if (bucket === "later") return "Later";

  return "No date";
}

function getTimeState(reminder: ReminderWithContextDTO) {
  const fallback = {
    label: "No date",
    color: "#8A8A8A",
    icon: "help-circle-outline" as keyof typeof Ionicons.glyphMap,
  };

  if (!reminder.send_at) return fallback;

  const sendAt = new Date(reminder.send_at);

  if (Number.isNaN(sendAt.getTime())) return fallback;

  if (isReminderDone(reminder)) {
    return {
      label: "Done",
      color: "#7DA56D",
      icon: "checkmark-circle-outline" as keyof typeof Ionicons.glyphMap,
    };
  }

  const diffMs = sendAt.getTime() - new Date().getTime();

  if (diffMs < 0) {
    return {
      label: "Overdue",
      color: "#EE6A5E",
      icon: "alert-circle-outline" as keyof typeof Ionicons.glyphMap,
    };
  }

  if (diffMs < 86_400_000) {
    return {
      label: "Today",
      color: "#EBA55B",
      icon: "time-outline" as keyof typeof Ionicons.glyphMap,
    };
  }

  return {
    label: "Upcoming",
    color: "#7DA56D",
    icon: "calendar-outline" as keyof typeof Ionicons.glyphMap,
  };
}

function getSnoozeDate(
  reminder: ReminderWithContextDTO,
  preset: "later_today" | "tomorrow" | "three_days" | "next_week"
) {
  const baseTime = reminder.send_at ? new Date(reminder.send_at) : new Date();
  const now = new Date();

  const hour = Number.isNaN(baseTime.getTime()) ? 9 : baseTime.getHours();
  const minute = Number.isNaN(baseTime.getTime()) ? 0 : baseTime.getMinutes();

  const next = new Date();

  if (preset === "later_today") {
    next.setHours(now.getHours() + 3, minute, 0, 0);

    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
      next.setHours(9, 0, 0, 0);
    }

    return next;
  }

  if (preset === "tomorrow") {
    next.setDate(next.getDate() + 1);
    next.setHours(hour, minute, 0, 0);
    return next;
  }

  if (preset === "three_days") {
    next.setDate(next.getDate() + 3);
    next.setHours(hour, minute, 0, 0);
    return next;
  }

  next.setDate(next.getDate() + 7);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function getInitials(name?: string | null) {
  const parts = (name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function getEventTypeLabel(type?: number | null) {
  switch (type) {
    case 1:
      return "Birthday";
    case 2:
      return "Anniversary";
    case 3:
      return "Important date";
    case 4:
      return "Meeting";
    case 5:
      return "Holiday";
    case 6:
      return "Event";
    default:
      return "Event";
  }
}

function formatEventDate(reminder: ReminderWithContextDTO) {
  const date = parseDateOnly(reminder.event_start_date);

  if (!date) return reminder.event_start_date || "No event date";

  const dateLabel = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (!reminder.event_start_time) {
    return dateLabel;
  }

  return `${dateLabel} · ${formatTime(reminder.event_start_time)}`;
}

function parseDateOnly(value?: string | null) {
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

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function makeReminderColors(settings: any): ReminderColors {
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

function getStatusStyle(status: number, colors: ReminderColors) {
  switch (status) {
    case REMINDER_STATUS.PENDING:
      return {
        label: "Pending",
        color: colors.warning,
        icon: "time-outline" as keyof typeof Ionicons.glyphMap,
      };

    case REMINDER_STATUS.SENT:
      return {
        label: "Done",
        color: colors.success,
        icon: "checkmark-circle-outline" as keyof typeof Ionicons.glyphMap,
      };

    case REMINDER_STATUS.FAILED:
      return {
        label: "Failed",
        color: colors.danger,
        icon: "alert-circle-outline" as keyof typeof Ionicons.glyphMap,
      };

    case REMINDER_STATUS.CANCELLED:
      return {
        label: "Cancelled",
        color: colors.muted,
        icon: "close-circle-outline" as keyof typeof Ionicons.glyphMap,
      };

    default:
      return {
        label: "Unknown",
        color: colors.muted,
        icon: "help-circle-outline" as keyof typeof Ionicons.glyphMap,
      };
  }
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

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "800",
  },

  listContent: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 34,
    gap: 9,
  },

  emptyContent: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 34,
    gap: 9,
  },

compactHeader: {
  minHeight: 146,
  borderRadius: 28,
  padding: 16,
  marginBottom: 3,
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

  headerTopActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },



  headerRoundButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },




  headerRoundPlaceholder: {
    width: 38,
    height: 38,
  },

headerMainRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
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
  },

  headerStatsRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 14,
  },

  headerStatPill: {
    flex: 1,
    minHeight: 42,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerStatValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },

  headerStatLabel: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 12,
    fontWeight: "800",
  },

  tabs: {
    height: 48,
    borderRadius: 20,
    padding: 4,
    flexDirection: "row",
    marginBottom: 2,
  },

  tabButton: {
    flex: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  tabText: {
    fontSize: 13,
    fontWeight: "900",
  },

  tabCountPill: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },

  tabCountText: {
    fontSize: 11,
    fontWeight: "900",
  },

 




  overdueCard: {
    minHeight: 76,
    borderRadius: 22,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  overdueLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  overdueIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  overdueTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  overdueTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  overdueText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.76,
    marginTop: 2,
  },

  deleteOverdueButton: {
    minHeight: 38,
    borderRadius: 15,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  deleteOverdueText: {
    fontSize: 12,
    fontWeight: "900",
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 6,
    marginBottom: 1,
  },

  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 12,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  avatarWrap: {
    width: 46,
    height: 46,
    position: "relative",
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 19,
  },

  avatarText: {
    fontSize: 13,
    fontWeight: "900",
  },

  avatarStatusDot: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
  },

  cardTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
  },

  cardPerson: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    marginTop: 2,
  },

  cardSub: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 3,
  },

  eventInfoBox: {
    minHeight: 34,
    borderRadius: 14,
    marginTop: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  eventInfoLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  eventInfoText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: "800",
  },

  cardDivider: {
    height: 1,
    marginTop: 12,
    marginBottom: 11,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },

  statusPill: {
    minHeight: 30,
    maxWidth: 150,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },

  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },

  actionButton: {
    minHeight: 38,
    borderRadius: 15,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  actionText: {
    fontSize: 12,
    fontWeight: "900",
  },

  emptyCard: {
    borderRadius: 30,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    marginTop: 14,
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
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
    textAlign: "center",
  },

  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 7,
    fontWeight: "700",
    opacity: 0.76,
  },

  emptyButton: {
    minHeight: 44,
    borderRadius: 18,
    paddingHorizontal: 15,
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  emptyButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },

  footerSpace: {
    height: 18,
  },

  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 14, 10, 0.42)",
    justifyContent: "flex-end",
  },

  sheet: {
    marginHorizontal: 10,
    marginBottom: Platform.OS === "ios" ? 22 : 12,
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 22,
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },

  sheetHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },

  sheetTitle: {
    fontSize: 23,
    fontWeight: "900",
  },

  sheetSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 2,
  },

  sheetCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  sheetFilterList: {
    gap: 8,
  },

  sheetFilterRow: {
    minHeight: 62,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  sheetFilterIcon: {
    width: 38,
    height: 38,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  sheetFilterTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  sheetFilterTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  sheetFilterSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
  },
  filterAccessCard: {
  minHeight: 44,
  borderRadius: 17,
  borderWidth: 1,
  paddingHorizontal: 12,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
},

filterAccessMain: {
  flex: 1,
  minWidth: 0,
  minHeight: 42,
  flexDirection: "row",
  alignItems: "center",
  gap: 7,
},

filterAccessText: {
  fontSize: 12,
  fontWeight: "900",
},

filterAccessClear: {
  fontSize: 12,
  fontWeight: "900",
},
});