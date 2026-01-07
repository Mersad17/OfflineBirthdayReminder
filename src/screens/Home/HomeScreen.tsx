// src/screens/Home/HomeScreen.tsx
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { useAuth } from "../../auth/AuthContext";

import {
  EventTypeValue,
  EVENT_TYPE_META,
  HomeEventDTO,
  HomeSummaryDTO,
} from "../../events/types";
import { fetchHomeSummary } from "../../events/api";

type HomeItem = {
  id: number;
  contactId: number;
  name: string;
  dateLabel: string;
  relativeLabel: string;
  type: EventTypeValue;
  isToday: boolean;
  daysUntil: number;
};

type TypeInsight = {
  type: EventTypeValue;
  count: number;
};

type UpcomingSection = {
  key: string;
  title: string;
  data: HomeItem[];
};
const HOME_UPCOMING_LIMIT = 5;
type Props = {
  navigation: any;
};
const HOME_TODAY_LIMIT = 5;

export default function HomeScreen({ navigation }: Props) {
  const { settings } = useAppearance();
  const { user } = useAuth();

  const [todayItems, setTodayItems] = useState<HomeItem[]>([]);
  const [upcoming, setUpcoming] = useState<HomeItem[]>([]);
  const [typeInsights, setTypeInsights] = useState<TypeInsight[]>([]);
  const [upcomingWeekCount, setUpcomingWeekCount] = useState(0);
  const [totalContacts, setTotalContacts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAllToday, setShowAllToday] = useState(false);

  const [selectedTypeFilter, setSelectedTypeFilter] = useState<
    EventTypeValue | "all"
  >("all");
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  // ---- mapping backend -> UI item ----
  const mapDtoToHomeItem = (dto: HomeEventDTO): HomeItem => {
    const d = new Date(dto.next_occurrence);
    const dateLabel = formatDateLabel(d);
    const daysUntil = dto.days_until;
    const relativeLabel = buildRelativeLabelFr(daysUntil);

    return {
      id: dto.id,
      contactId: dto.contact_id,
      name: dto.contact_name || "Inconnu",
      dateLabel,
      relativeLabel,
      type: dto.type as EventTypeValue,
      isToday: daysUntil === 0,
      daysUntil,
    };
  };
  useEffect(() => {
    setShowAllUpcoming(false);
  }, [selectedTypeFilter]);

  // ---- load from backend ----
  const loadHome = useCallback(async () => {
    try {
      setLoading(true);
      const summary: HomeSummaryDTO = await fetchHomeSummary();

      const mappedToday = summary.today.map(mapDtoToHomeItem);

      const mappedUpcomingRaw = summary.upcoming.map(mapDtoToHomeItem);

      const mappedUpcoming = mappedUpcomingRaw
        .filter((item) => !item.isToday && item.daysUntil > 0)
        .sort((a, b) => a.daysUntil - b.daysUntil);

      setTodayItems(mappedToday);
      setUpcoming(mappedUpcoming);

      const typeCountMap: Record<EventTypeValue, number> = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
      };

      mappedUpcoming.forEach((item) => {
        typeCountMap[item.type] = (typeCountMap[item.type] ?? 0) + 1;
      });

      const insights: TypeInsight[] = (Object.entries(typeCountMap) as [
        string,
        number
      ][])
        .filter(([_, count]) => count > 0)
        .map(([type, count]) => ({
          type: Number(type) as EventTypeValue,
          count,
        }));

      setTypeInsights(insights);

      setUpcomingWeekCount(summary.meta.upcoming_week_count ?? 0);
      setTotalContacts(summary.meta.total_contacts ?? 0);
    } catch (e) {
      console.log("Home load error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // initial
  useEffect(() => {
    loadHome();
  }, [loadHome]);

  // reload à chaque focus
  useFocusEffect(
    useCallback(() => {
      loadHome();
    }, [loadHome])
  );
  useEffect(() => {
    setShowAllToday(false);
  }, []);
  
  const hasEvents = todayItems.length > 0 || upcoming.length > 0;
  const visibleToday = showAllToday
  ? todayItems
  : todayItems.slice(0, HOME_TODAY_LIMIT);

  const filteredUpcoming = useMemo(() => {
    const list =
      selectedTypeFilter === "all"
        ? upcoming
        : upcoming.filter((item) => item.type === selectedTypeFilter);

    return showAllUpcoming ? list : list.slice(0, HOME_UPCOMING_LIMIT);
  }, [upcoming, selectedTypeFilter, showAllUpcoming]);


  const upcomingSections: UpcomingSection[] = useMemo(
    () => buildUpcomingSections(filteredUpcoming),
    [filteredUpcoming]
  );

  const mainToday = todayItems[0] ?? null;

  // ---- RENDER ROW ----
  function renderItemRow(item: HomeItem) {
    const meta = EVENT_TYPE_META[item.type];
    const accentColor = item.isToday ? "#F97316" : settings.primaryColor;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.eventCard, { backgroundColor: settings.cardColor }]}
        onPress={() =>
          navigation.navigate("ContactDetail", {
            contactId: item.contactId,
            contactName: item.name,
          })
        }
      >
        {/* Timeline dot + vertical line */}
        <View style={styles.timelineColumn}>
          <View
            style={[
              styles.timelineDot,
              { borderColor: accentColor, backgroundColor: settings.cardColor },
            ]}
          >
            <View
              style={[
                styles.timelineDotInner,
                { backgroundColor: accentColor },
              ]}
            />
          </View>
          <View style={styles.timelineLine} />
        </View>

        <View style={styles.eventContent}>
          {/* Top row */}
          <View style={styles.eventTopRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.eventTitleRow}>
                <Text
                  style={[styles.eventName, { color: settings.titleColor }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <View
                  style={[
                    styles.typeChip,
                    { backgroundColor: settings.primaryColor + "1A" },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      { color: settings.primaryColor },
                    ]}
                  >
                    {meta.icon} {meta.label}
                  </Text>
                </View>
              </View>
              <Text
                style={[styles.eventRelative, { color: settings.textColor }]}
                numberOfLines={1}
              >
                {item.relativeLabel}
              </Text>
            </View>

            <View style={styles.eventRight}>
              <View style={styles.datePill}>
                <Text style={styles.datePillText}>{item.dateLabel}</Text>
              </View>
              {!item.isToday && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: settings.primaryColor + "1A" },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: settings.primaryColor },
                    ]}
                  >
                    {formatShortCountdown(item.daysUntil)}
                  </Text>
                </View>
              )}
              {item.isToday && (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>TToday</Text>
                </View>
              )}
            </View>
          </View>

          {/* Bottom row */}
          <View style={styles.eventBottomRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </Text>
            </View>
            <Text
              style={[styles.eventMeta, { color: settings.textColor }]}
              numberOfLines={1}
            >
              Tap to view {item.name.split(" ")[0] || "this contact"}.
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ---- UI ----

  return (
    <Screen scroll>
      <View style={styles.page}>
        <View style={styles.container}>
          {/* TOP BAR */}
          <View style={styles.appBar}>
            <View style={styles.appTitleRow}>
              <View
                style={[
                  styles.appIconCircle,
                  { backgroundColor: settings.primaryColor + "20" },
                ]}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={18}
                  color={settings.primaryColor}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.appTitle, { color: settings.titleColor }]}
                  numberOfLines={1}
                >
                  Friendly reminder
                </Text>
                <Text
                  style={[styles.appSubtitle, { color: settings.textColor }]}
                  numberOfLines={1}
                >
                  A gentle reminder so you don’t forget ✨
                </Text>
              </View>
            </View>

            <View style={styles.appActions}>
              <View
                style={[
                  styles.userChip,
                  { backgroundColor: settings.primaryColor + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.userChipText,
                    { color: settings.primaryColor },
                  ]}
                >
                  {user?.first_name
                    ? user.first_name[0]?.toUpperCase()
                    : "?"}
                </Text>
              </View>
            </View>
          </View>

          {/* HERO */}
          <View
            style={[
              styles.heroCard,
              { backgroundColor: settings.primaryColor },
            ]}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={[styles.heroGreeting, { color: settings.buttonTextColor }]}
              >
                {user?.first_name
                  ? `Hello, ${user.first_name} 👋`
                  : "Hello 👋"}
              </Text>
              <Text
                style={[
                  styles.heroSubtitle,
                  { color: settings.buttonTextColor },
                ]}
                numberOfLines={2}
              >
                {hasEvents
                  ? upcomingWeekCount > 0
                    ? `You have ${
                        upcomingWeekCount === 1
                          ? "1 moment to celebrate this week."
                          : `${upcomingWeekCount} moments to celebrate this week.`
                      }`
                    : "Nothing planned this week"
                  : "Add events so you never forget."}
              </Text>
            </View>

            <View style={styles.heroCTAColumn}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: settings.buttonColor ?? settings.primaryColor },
                ]}
                onPress={() => navigation.navigate("AddContact")}
              >
                <Ionicons name="add" size={18} color={settings.buttonTextColor} />
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: settings.buttonTextColor },
                  ]}
                >
                  New contact
                </Text>
              </TouchableOpacity>

              <View style={styles.secondaryHeroRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color={settings.buttonTextColor}
                />
                <Text
                  style={[
                    styles.secondaryHeroText,
                    { color: settings.buttonTextColor },
                  ]}
                >
                We remind you ahead of time, never too late.
                </Text>
              </View>
            </View>
          </View>

          {/* STATS */}
          <View style={styles.statsRow}>
            <View
              style={[styles.statCard, { backgroundColor: settings.cardColor }]}
            >
              <View
                style={[
                  styles.statIconBubble,
                  { backgroundColor: settings.primaryColor + "20" },
                ]}
              >
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={settings.primaryColor}
                />
              </View>
              <Text style={[styles.statLabel, { color: settings.textColor }]}>
                Contacts
              </Text>
              <Text style={[styles.statValue, { color: settings.titleColor }]}>
                {totalContacts}
              </Text>
              <Text style={[styles.statHint, { color: settings.textColor }]}>
                people tracked
              </Text>
            </View>

            <View
              style={[styles.statCard, { backgroundColor: settings.cardColor }]}
            >
              <View
                style={[
                  styles.statIconBubble,
                  { backgroundColor: "#FEF3C7" },
                ]}
              >
                <Ionicons name="calendar-outline" size={16} color="#D97706" />
              </View>
              <Text style={[styles.statLabel, { color: settings.textColor }]}>
              This week
              </Text>
              <Text style={[styles.statValue, { color: settings.titleColor }]}>
                {upcomingWeekCount}
              </Text>
              <Text style={[styles.statHint, { color: settings.textColor }]}>
                upcoming moments
              </Text>
            </View>
          </View>

          {/* INSIGHTS types */}
          {typeInsights.length > 0 && (
            <View style={styles.insightsRow}>
              {typeInsights.map(({ type, count }) => {
                const meta = EVENT_TYPE_META[type];
                return (
                  <View
                    key={type}
                    style={[
                      styles.insightChip,
                      { backgroundColor: settings.cardColor },
                    ]}
                  >
                    <Text style={styles.insightIcon}>{meta.icon}</Text>
                    <View>
                      <Text
                        style={[
                          styles.insightCount,
                          { color: settings.titleColor },
                        ]}
                      >
                        {count}
                      </Text>
                      <Text
                        style={[
                          styles.insightLabel,
                          { color: settings.textColor },
                        ]}
                      >
                        {meta.label.toLowerCase()}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* TODAY */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text
                style={[styles.sectionTitle, { color: settings.titleColor }]}
              >
                Today
              </Text>
            </View>

            {mainToday ? (
              <>
                <View style={styles.todayHighlightCard}>
                  <View style={{ flex: 1 }}>
                  <Text style={[styles.todayTitle, { color: settings.titleColor }]}>
                    {todayItems.length === 1
                      ? "One moment to celebrate today 🎉"
                      : `${todayItems.length} moments to celebrate today 🎉`}
                  </Text>
                  <Text style={[styles.todayMeta, { color: settings.textColor }]}>
                    Take a moment to send a message or make a call.
                  </Text>
                  </View>
                  <View style={styles.todayIconCircle}>
                    <Ionicons
                      name="gift-outline"
                      size={22}
                      color="#F97316"
                    />
                  </View>
                </View>

                {todayItems.length > 0 && (
                  <View style={{ marginTop: 10 }}>
                    {visibleToday.map((item) => renderItemRow(item))}
                  </View>
                )}
              </>
            ) : (
              <View
                style={[
                  styles.todayEmptyCard,
                  { backgroundColor: settings.cardColor },
                ]}
              >
                <View style={styles.todayEmptyIconBubble}>
                  <Ionicons
                    name="sparkles-outline"
                    size={18}
                    color="#4B5563"
                  />
                </View>
                <View style={{ flex: 1 }}>
                <Text style={[styles.todayTitle, { color: settings.titleColor }]}>
                  Nothing to celebrate today
                </Text>
                <Text style={[styles.todayMeta, { color: settings.textColor }]}>
                  Add someone important and we’ll remind you of their key moments.
                </Text>
                </View>
              </View>
            )}
          </View>
          {todayItems.length > HOME_TODAY_LIMIT && (
  <TouchableOpacity
    onPress={() => setShowAllToday((v) => !v)}
    style={{ marginTop: 8, alignSelf: "center" }}
  >
    <Text
      style={{
        color: settings.primaryColor,
        fontWeight: "600",
      }}
    >
      {showAllToday ? "Show less ▲" : "View all ▼"}
      </Text>
  </TouchableOpacity>
)}

          {/* UPCOMING */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: settings.titleColor }]}>
              Upcoming (30 days)
              </Text>
            </View>

            {loading ? (
              <Text style={{ color: settings.textColor }}>Loading…</Text>
            ) : upcomingSections.length === 0 ? (
              <View style={styles.emptyStateInline}>
                <Text style={[styles.emptyText, { color: settings.textColor }]}>
                No events match this filter.
                </Text>
              </View>
            ) : (
              <>
                {/* FILTERS */}
                <View style={styles.filterRow}>
                  <FilterChip
                    label="All"
                    selected={selectedTypeFilter === "all"}
                    onPress={() => setSelectedTypeFilter("all")}
                  />
                  {typeInsights.map(({ type, count }) => {
                    const meta = EVENT_TYPE_META[type];
                    return (
                      <FilterChip
                        key={type}
                        label={`${count} ${meta.icon}`}
                        selected={selectedTypeFilter === type}
                        onPress={() => setSelectedTypeFilter(type)}
                      />
                    );
                  })}
                </View>

                {upcomingSections.map((section) => (
                  <View key={section.key} style={styles.upcomingSectionBlock}>
                    <Text style={[styles.upcomingSectionTitle, { color: settings.textColor }]}>
                      {section.title}
                    </Text>
                    {section.data.map((item) => renderItemRow(item))}
                  </View>
                ))}

                {/* 🔹 NEW: Show more */}
                {upcoming.length > HOME_UPCOMING_LIMIT && (
                  <TouchableOpacity
                    onPress={() => setShowAllUpcoming((v) => !v)}
                    style={{ marginTop: 10, alignSelf: "center" }}
                  >
                   <Text style={{ color: settings.primaryColor, fontWeight: "600" }}>
                  {showAllUpcoming ? "See less ▲" : "See more ▼"}
                </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* Récemment célébré (placeholder) */}
          <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { color: settings.titleColor }]}
            >
              Recently celebrated
            </Text>
            <View
              style={[
                styles.recentCard,
                { backgroundColor: settings.cardColor },
              ]}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="#6B7280"
              />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text
                  style={[styles.recentTitle, { color: settings.titleColor }]}
                >
                    Coming soon
                </Text>
                <Text
                  style={[styles.recentText, { color: settings.textColor }]}
                >
                    After each event, you’ll see here who you’ve already celebrated, so you can follow up thoughtfully. 💬
                </Text>
              </View>
            </View>
          </View>

          {/* Plan + notifications */}
          <View style={styles.bottomRow}>
            <View
              style={[
                styles.planCard,
                { backgroundColor: settings.cardColor },
              ]}
            >
              <Text
                style={[styles.planTitle, { color: settings.titleColor }]}
              >
                 Free plan
              </Text>
              <Text
                style={[styles.planText, { color: settings.textColor }]}
              >
                  Track the people who matter most. You can manage up to 10 contacts for now.
              </Text>
            </View>

            <View
              style={[
                styles.noticeCard,
                { backgroundColor: settings.cardColor },
              ]}
            >
              <Ionicons
                name="notifications-outline"
                size={18}
                color={settings.primaryColor}
              />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text
                  style={[
                    styles.noticeTitle,
                    { color: settings.titleColor },
                  ]}
                >
                  Notifications
                </Text>
                <Text
                  style={[styles.noticeText, { color: settings.textColor }]}
                >
                    Make sure system notifications are enabled to receive your reminders on time.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* FAB */}
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: settings.buttonColor ?? settings.primaryColor },
          ]}
          onPress={() => navigation.navigate("AddContact")}
        >
          <Ionicons name="add" size={26} color={settings.buttonTextColor} />
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

// ---------------- helpers ----------------

function formatDateLabel(d: Date) {
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function buildRelativeLabelFr(daysUntil: number) {
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "In 1 day";
  if (daysUntil < 7) return `In ${daysUntil} days`;
  if (daysUntil < 30) {
    const weeks = Math.ceil(daysUntil / 7);
    return weeks === 1 ? "In 1 week" : `In ${weeks} weeks`;
  }
  return `In ${daysUntil} days`;
}

function formatShortCountdown(daysUntil: number) {
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "1 d";
  if (daysUntil < 7) return `${daysUntil} d`;
  const weeks = Math.ceil(daysUntil / 7);
  return `${weeks} weeks.`;
}

function buildUpcomingSections(items: HomeItem[]): UpcomingSection[] {
  const week: HomeItem[] = [];
  const month: HomeItem[] = [];

  for (const item of items) {
    if (item.daysUntil === 0) continue;
    if (item.daysUntil <= 7) {
      week.push(item);
    } else {
      month.push(item);
    }
  }

  const sections: UpcomingSection[] = [];

  if (week.length > 0) {
    sections.push({
      key: "week",
      title: "This week",
      data: week,
    });
  }
  if (month.length > 0) {
    sections.push({
      key: "month",
      title: "Later this month",
      data: month,
    });
  }

  return sections;
}

// small component
type FilterChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
};

function FilterChip({ label, selected, onPress }: FilterChipProps) {
  const { settings } = useAppearance();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.filterChip,
        selected && [
          styles.filterChipSelected,
          {
            borderColor: settings.primaryColor,
            shadowColor: settings.primaryColor,
            backgroundColor: settings.primaryColor + "15",
          },
        ],
      ]}
    >
      <Text
        style={[
          styles.filterChipText,
          selected && [
            styles.filterChipTextSelected,
            { color: settings.primaryColor },
          ],
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ---------------- styles ----------------

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 40,
    paddingBottom: 32,
  },

  // App bar
  appBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  appTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  appIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  appTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  appSubtitle: {
    fontSize: 12,
    opacity: 0.8,
  },
  appActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  userChipText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Hero
  heroCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
  },
  heroGreeting: {
    fontSize: 20,
    fontWeight: "700",
  },
  heroSubtitle: {
    fontSize: 13,
  },
  heroCTAColumn: {
    marginLeft: 12,
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryHeroRow: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 160,
  },
  secondaryHeroText: {
    fontSize: 11,
    marginLeft: 4,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statIconBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 2,
  },
  statHint: {
    fontSize: 11,
    marginTop: 2,
  },

  // Insights
  insightsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  insightChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    gap: 6,
  },
  insightIcon: {
    fontSize: 16,
  },
  insightCount: {
    fontSize: 13,
    fontWeight: "600",
  },
  insightLabel: {
    fontSize: 11,
    textTransform: "lowercase",
  },

  // Sections
  section: {
    marginTop: 12,
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },

  // Today
  todayHighlightCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#FEF3C7",
  },
  todayTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  todayMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  todayIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  todayEmptyCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 12,
  },
  todayEmptyIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  // Event cards (timeline style)
  eventCard: {
    flexDirection: "row",
    borderRadius: 16,
    marginBottom: 8,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  timelineColumn: {
    width: 26,
    alignItems: "center",
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  timelineDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: "#E5E7EB",
    marginTop: 2,
    marginBottom: 4,
  },
  eventContent: {
    flex: 1,
    paddingRight: 10,
  },
  eventTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  eventTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  eventName: {
    fontSize: 15,
    fontWeight: "600",
  },
  eventRelative: {
    fontSize: 13,
    opacity: 0.9,
  },
  eventRight: {
    alignItems: "flex-end",
    gap: 4,
    marginLeft: 8,
  },
  datePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  datePillText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#374151",
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#FEF3C7",
  },
  todayBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#B45309",
  },
  eventBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DBEAFE",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1D4ED8",
  },
  eventMeta: {
    fontSize: 12,
    color: "#6B7280",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  typeChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: "500",
  },

  // Filter chips
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  filterChipSelected: {
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  filterChipText: {
    fontSize: 12,
    color: "#4B5563",
  },
  filterChipTextSelected: {
    fontWeight: "600",
  },

  upcomingSectionBlock: {
    marginTop: 4,
    marginBottom: 4,
  },
  upcomingSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.75,
    marginBottom: 4,
  },

  // Empty states
  emptyState: {
    marginTop: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  emptyStateInline: {
    marginTop: 4,
    padding: 8,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.85,
  },

  // Recently
  recentCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  recentText: {
    fontSize: 13,
    marginTop: 2,
  },

  // Bottom cards
  bottomRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  planCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
  },
  planTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  planText: {
    fontSize: 13,
    opacity: 0.9,
  },
  noticeCard: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    padding: 10,
    alignItems: "center",
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  noticeText: {
    fontSize: 13,
    opacity: 0.9,
  },

  // FAB
  fab: {
    position: "absolute",
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
});
