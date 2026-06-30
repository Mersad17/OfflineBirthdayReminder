// src/screens/Home/HomeScreen.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { AppId } from "../../contacts/types";
import {
  EventTypeValue,
  EVENT_TYPE_META,
  HomeEventDTO,
  HomeSummaryDTO,
} from "../../events/types";
import { fetchHomeSummary } from "../../events/repository";
import BeforeMeetSearchCard from "../BeforeMeet/BeforeMeetSearchCard";
import { useAccess } from "../../access/AccessContext";
import { getRemainingContacts } from "../../access/plans";

type Props = {
  navigation: any;
};

type HomeItem = {
  id: AppId;
  contactId: AppId;
  name: string;
  dateLabel: string;
  relativeLabel: string;
  type: EventTypeValue;
  isToday: boolean;
  daysUntil: number;
};

type AttentionItem = HomeItem & {
  attentionTitle: string;
  attentionText: string;
  accentKind: "today" | "soon";
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

type HomeColors = {
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

const HOME_TODAY_LIMIT = 4;
const HOME_UPCOMING_LIMIT = 5;
const HOME_ATTENTION_LIMIT = 4;
const HOME_STALE_AFTER_MS = 30_000;

export default function HomeScreen({ navigation }: Props) {
  const { settings } = useAppearance();
  const { access } = useAccess();
  const { t } = useTranslation("home");

  const colors = useMemo(() => makeHomeColors(settings), [settings]);

  const [todayItems, setTodayItems] = useState<HomeItem[]>([]);
  const [upcoming, setUpcoming] = useState<HomeItem[]>([]);
  const [typeInsights, setTypeInsights] = useState<TypeInsight[]>([]);
  const [upcomingWeekCount, setUpcomingWeekCount] = useState(0);
  const [totalContacts, setTotalContacts] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [showAllToday, setShowAllToday] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  const [selectedTypeFilter, setSelectedTypeFilter] = useState<
    EventTypeValue | "all"
  >("all");

  const loadingRef = useRef(false);
  const requestIdRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);
  const lastLoadedAtRef = useRef<number | null>(null);

  const mapDtoToHomeItem = useCallback(
    (dto: HomeEventDTO): HomeItem => {
      const date = parseDateOnly(dto.next_occurrence);
      const daysUntil = Number(dto.days_until ?? 999);

      return {
        id: dto.id,
        contactId: dto.contact_id,
        name: dto.contact_name || t("event.unknownContact"),
        dateLabel: formatDateLabel(date),
        relativeLabel: buildRelativeLabel(daysUntil, t),
        type: dto.type as EventTypeValue,
        isToday: daysUntil === 0,
        daysUntil,
      };
    },
    [t]
  );

  const loadHome = useCallback(
    async ({
      showFullLoading = false,
    }: {
      showFullLoading?: boolean;
    } = {}) => {
      if (loadingRef.current) return;

      const requestId = ++requestIdRef.current;

      loadingRef.current = true;

      if (showFullLoading) {
        setLoading(true);
      }

      try {
        const summary: HomeSummaryDTO = await fetchHomeSummary();

        if (requestId !== requestIdRef.current) return;

        const mappedToday = (summary.today ?? []).map(mapDtoToHomeItem);

        const mappedUpcoming = (summary.upcoming ?? [])
          .map(mapDtoToHomeItem)
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
          .filter(([, count]) => count > 0)
          .map(([type, count]) => ({
            type: Number(type) as EventTypeValue,
            count,
          }));

        setTypeInsights(insights);
        setUpcomingWeekCount(summary.meta?.upcoming_week_count ?? 0);
        setTotalContacts(summary.meta?.total_contacts ?? 0);

        lastLoadedAtRef.current = Date.now();
      } catch (error) {
        if (requestId === requestIdRef.current) {
          console.log("Home load error", error);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          loadingRef.current = false;
          hasLoadedOnceRef.current = true;
          setHasLoadedOnce(true);
          setLoading(false);
        }
      }
    },
    [mapDtoToHomeItem]
  );

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();

      if (!hasLoadedOnceRef.current) {
        void loadHome({ showFullLoading: true });
        return;
      }

      const isStale =
        !lastLoadedAtRef.current ||
        now - lastLoadedAtRef.current > HOME_STALE_AFTER_MS;

      if (isStale) {
        void loadHome({ showFullLoading: false });
      }
    }, [loadHome])
  );

  useEffect(() => {
    setShowAllUpcoming(false);
  }, [selectedTypeFilter]);

  async function onRefresh() {
    if (refreshing) return;

    setRefreshing(true);

    try {
      await loadHome({ showFullLoading: false });
    } finally {
      setRefreshing(false);
    }
  }

  function openContact(item: HomeItem) {
    navigation.navigate("ContactDetail", {
      contactId: item.contactId,
      contactName: item.name,
    });
  }

  function renderItemRow(item: HomeItem) {
    return (
      <HomeEventRow
        key={String(item.id)}
        item={item}
        colors={colors}
        t={t}
        onPress={() => openContact(item)}
      />
    );
  }

  const focusItem = todayItems[0] ?? upcoming[0] ?? null;

  const attentionItems = useMemo(
    () =>
      buildAttentionItems(todayItems, upcoming, t).slice(
        0,
        HOME_ATTENTION_LIMIT
      ),
    [todayItems, upcoming, t]
  );

  const visibleToday = showAllToday
    ? todayItems
    : todayItems.slice(0, HOME_TODAY_LIMIT);

  const filteredUpcoming = useMemo(() => {
    const list =
      selectedTypeFilter === "all"
        ? upcoming
        : upcoming.filter((item) => item.type === selectedTypeFilter);

    return showAllUpcoming ? list : list.slice(0, HOME_UPCOMING_LIMIT);
  }, [selectedTypeFilter, showAllUpcoming, upcoming]);

  const upcomingSections = useMemo(
    () => buildUpcomingSections(filteredUpcoming, t),
    [filteredUpcoming, t]
  );

  const shouldShowAccessCard = shouldShowPlanCard(access, totalContacts);

  const showSkeleton = loading && !hasLoadedOnce && !refreshing;

  if (showSkeleton) {
    return (
      <Screen>
        <HomeSkeleton colors={colors} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <AppBar colors={colors} t={t} />

          <FocusHero
            focusItem={focusItem}
            todayCount={todayItems.length}
            upcomingWeekCount={upcomingWeekCount}
            colors={colors}
            navigation={navigation}
            t={t}
            onOpenFocus={() => {
              if (focusItem) {
                openContact(focusItem);
              }
            }}
          />

          <View style={styles.statsRow}>
            <StatCard
              icon="people-outline"
              label={t("stats.contacts")}
              value={String(totalContacts)}
              hint={t("stats.peopleTracked")}
              colors={colors}
            />

            <StatCard
              icon="calendar-outline"
              label={t("stats.thisWeek")}
              value={String(upcomingWeekCount)}
              hint={t("stats.upcomingMoments")}
              colors={colors}
            />
          </View>

          {typeInsights.length > 0 ? (
            <View style={styles.insightsRow}>
              {typeInsights.slice(0, 4).map(({ type, count }) => (
                <InsightChip
                  key={String(type)}
                  type={type}
                  count={count}
                  colors={colors}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader
              title="Needs attention"
              icon="heart-outline"
              colors={colors}
            />

            {attentionItems.length > 0 ? (
              <View style={styles.attentionList}>
                {attentionItems.map((item) => (
                  <AttentionCard
                    key={`attention-${String(item.id)}`}
                    item={item}
                    colors={colors}
                    onPress={() => openContact(item)}
                  />
                ))}
              </View>
            ) : (
              <EmptyInlineCard
                icon="checkmark-circle-outline"
                title="Nothing urgent right now"
                text="You are clear today. Use Before Meet when you want to prepare for someone."
                colors={colors}
              />
            )}
          </View>

          <View style={styles.section}>
            <SectionHeader
              title={t("sections.today")}
              icon="sunny-outline"
              colors={colors}
            />

            {todayItems.length > 0 ? (
              <>
                <TodaySummaryCard
                  count={todayItems.length}
                  colors={colors}
                  t={t}
                />

                <View style={styles.eventList}>
                  {visibleToday.map((item) => renderItemRow(item))}
                </View>

                {todayItems.length > HOME_TODAY_LIMIT ? (
                  <ShowMoreButton
                    label={
                      showAllToday
                        ? t("upcoming.showLess")
                        : t("upcoming.viewAll")
                    }
                    colors={colors}
                    onPress={() => setShowAllToday((value) => !value)}
                  />
                ) : null}
              </>
            ) : (
              <EmptyInlineCard
                icon="sparkles-outline"
                title={t("today.emptyTitle")}
                text={t("today.emptyText")}
                colors={colors}
              />
            )}
          </View>

          {shouldShowAccessCard ? (
            <AccessStatusCard
              access={access}
              totalContacts={totalContacts}
              colors={colors}
              onPress={() => navigation.navigate("PlanAccess")}
            />
          ) : null}

          <View style={styles.section}>
            <SectionHeader
              title={t("sections.upcoming")}
              icon="calendar-outline"
              colors={colors}
            />

            {upcoming.length === 0 ? (
              <EmptyInlineCard
                icon="calendar-clear-outline"
                title={t("upcoming.emptyFilter")}
                text={t("hero.addEvents")}
                colors={colors}
              />
            ) : (
              <>
                <View style={styles.filterRow}>
                  <FilterChip
                    label={t("upcoming.all")}
                    selected={selectedTypeFilter === "all"}
                    colors={colors}
                    onPress={() => setSelectedTypeFilter("all")}
                  />

                  {typeInsights.map(({ type, count }) => {
                    const meta = getEventMeta(type);

                    return (
                      <FilterChip
                        key={String(type)}
                        label={`${count} ${meta.icon}`}
                        selected={selectedTypeFilter === type}
                        colors={colors}
                        onPress={() => setSelectedTypeFilter(type)}
                      />
                    );
                  })}
                </View>

                {upcomingSections.length === 0 ? (
                  <EmptyInlineCard
                    icon="options-outline"
                    title="No match for this filter"
                    text="Try another event type or choose All."
                    colors={colors}
                  />
                ) : (
                  upcomingSections.map((section) => (
                    <View
                      key={section.key}
                      style={styles.upcomingSectionBlock}
                    >
                      <Text
                        style={[
                          styles.upcomingSectionTitle,
                          { color: colors.text },
                        ]}
                      >
                        {section.title}
                      </Text>

                      {section.data.map((item) => renderItemRow(item))}
                    </View>
                  ))
                )}

                {upcoming.length > HOME_UPCOMING_LIMIT ? (
                  <ShowMoreButton
                    label={
                      showAllUpcoming
                        ? t("upcoming.seeLess")
                        : t("upcoming.seeMore")
                    }
                    colors={colors}
                    onPress={() => setShowAllUpcoming((value) => !value)}
                  />
                ) : null}
              </>
            )}
          </View>

          <PrivacyFooter colors={colors} />
        </ScrollView>
      </View>
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */
/* Main components                                                              */
/* -------------------------------------------------------------------------- */

function AppBar({ colors, t }: { colors: HomeColors; t: any }) {
  return (
    <View style={styles.appBar}>
      <View style={styles.appTitleRow}>
        <View
          style={[styles.appIconCircle, { backgroundColor: colors.softPrimary }]}
        >
          <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
        </View>

        <View style={styles.appTitleWrap}>
          <Text
            style={[styles.appTitle, { color: colors.title }]}
            numberOfLines={1}
          >
            {t("app.title")}
          </Text>

          <Text
            style={[styles.appSubtitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {t("app.subtitle")}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.userChip,
          {
            backgroundColor: colors.softPrimary,
            borderColor: withOpacity(colors.primary, "24"),
          },
        ]}
      >
        <Text style={[styles.userChipText, { color: colors.primary }]}>U</Text>
      </View>
    </View>
  );
}

function FocusHero({
  focusItem,
  todayCount,
  upcomingWeekCount,
  colors,
  navigation,
  t,
  onOpenFocus,
}: {
  focusItem: HomeItem | null;
  todayCount: number;
  upcomingWeekCount: number;
  colors: HomeColors;
  navigation: any;
  t: any;
  onOpenFocus: () => void;
}) {
  const hasFocus = Boolean(focusItem);
  const isToday = focusItem?.isToday ?? false;
  const meta = focusItem ? getEventMeta(focusItem.type) : null;

  const title = isToday
    ? "Today’s focus"
    : hasFocus
    ? "Next important moment"
    : "All clear today";

  const text = isToday
    ? `${focusItem?.name ?? ""} has something important today. Open the profile and act with attention.`
    : hasFocus
    ? `${focusItem?.name ?? ""} has ${meta?.label.toLowerCase() ?? "a moment"} ${focusItem?.relativeLabel.toLowerCase()}. Prepare before it happens.`
    : upcomingWeekCount > 0
    ? `${upcomingWeekCount} moments are coming this week.`
    : t("hero.addEvents");

  return (
    <LinearGradient
      colors={[colors.primary, colors.button] as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}
    >
      <View style={styles.heroGlowOne} />
      <View style={styles.heroGlowTwo} />

      <View style={styles.heroTopRow}>
        <View style={styles.heroTextWrap}>
          <Text style={[styles.heroEyebrow, { color: colors.buttonText }]}>
            {todayCount > 0 ? `${todayCount} TODAY` : "PRIVATE MEMORY"}
          </Text>

          <Text
            style={[styles.heroGreeting, { color: colors.buttonText }]}
            numberOfLines={1}
          >
            {title}
          </Text>

          <Text
            style={[styles.heroSubtitle, { color: colors.buttonText }]}
            numberOfLines={3}
          >
            {text}
          </Text>
        </View>

        <View style={styles.heroIconBubble}>
          <Text style={styles.heroIconText}>
            {focusItem ? meta?.icon ?? "✨" : "✓"}
          </Text>
        </View>
      </View>

      {focusItem ? (
        <TouchableOpacity
          style={styles.heroActionButton}
          onPress={onOpenFocus}
          activeOpacity={0.88}
        >
          <Ionicons name="person-circle-outline" size={18} color="#FFFFFF" />

          <Text style={styles.heroActionText}>
            Open {firstName(focusItem.name)}
          </Text>

          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}

      <BeforeMeetSearchCard colors={colors} navigation={navigation} />
    </LinearGradient>
  );
}

function TodaySummaryCard({
  count,
  colors,
  t,
}: {
  count: number;
  colors: HomeColors;
  t: any;
}) {
  return (
    <View
      style={[
        styles.todayHighlightCard,
        {
          backgroundColor: withOpacity(colors.warning, "18"),
          borderColor: withOpacity(colors.warning, "32"),
        },
      ]}
    >
      <View style={styles.todayHighlightText}>
        <Text style={[styles.todayTitle, { color: colors.title }]}>
          {count === 1
            ? t("today.oneMoment")
            : t("today.manyMoments", { count })}
        </Text>

        <Text style={[styles.todayMeta, { color: colors.text }]}>
          {t("today.meta")}
        </Text>
      </View>

      <View
        style={[
          styles.todayIconCircle,
          { backgroundColor: withOpacity(colors.warning, "22") },
        ]}
      >
        <Ionicons name="gift-outline" size={22} color={colors.warning} />
      </View>
    </View>
  );
}

function AttentionCard({
  item,
  colors,
  onPress,
}: {
  item: AttentionItem;
  colors: HomeColors;
  onPress: () => void;
}) {
  const accentColor =
    item.accentKind === "today" ? colors.warning : colors.primary;
  const meta = getEventMeta(item.type);

  return (
    <TouchableOpacity
      style={[
        styles.attentionCard,
        {
          backgroundColor: colors.card,
          borderColor: item.accentKind === "today" ? accentColor : colors.border,
          shadowColor: colors.shadow,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View
        style={[
          styles.attentionIcon,
          { backgroundColor: withOpacity(accentColor, "16") },
        ]}
      >
        <Text style={styles.attentionIconText}>{meta.icon}</Text>
      </View>

      <View style={styles.attentionTextWrap}>
        <Text
          style={[styles.attentionTitle, { color: colors.title }]}
          numberOfLines={1}
        >
          {item.attentionTitle}
        </Text>

        <Text
          style={[styles.attentionText, { color: colors.text }]}
          numberOfLines={2}
        >
          {item.attentionText}
        </Text>
      </View>

      <View
        style={[
          styles.attentionBadge,
          { backgroundColor: withOpacity(accentColor, "14") },
        ]}
      >
        <Text style={[styles.attentionBadgeText, { color: accentColor }]}>
          {item.isToday ? "Today" : formatShortCountdown(item.daysUntil, null)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function AccessStatusCard({
  access,
  totalContacts,
  colors,
  onPress,
}: {
  access: any;
  totalContacts: number;
  colors: HomeColors;
  onPress: () => void;
}) {
  const remaining = getRemainingContacts(access, totalContacts);

  const limitText =
    access.maxContacts === "unlimited"
      ? "Unlimited people unlocked"
      : `${totalContacts}/${access.maxContacts} people`;

  const subtitle = access.isBeta
    ? "Full access during private beta."
    : remaining === "unlimited"
    ? "You can add unlimited people."
    : `${remaining} people remaining.`;

  return (
    <TouchableOpacity
      style={[
        styles.accessCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={[styles.accessIcon, { backgroundColor: colors.softPrimary }]}>
        <Ionicons
          name={access.isBeta ? "flask-outline" : "shield-checkmark-outline"}
          size={18}
          color={colors.primary}
        />
      </View>

      <View style={styles.accessTextWrap}>
        <Text style={[styles.accessTitle, { color: colors.title }]}>
          {access.label}
        </Text>

        <Text style={[styles.accessSubtitle, { color: colors.text }]}>
          {limitText} · {subtitle}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={17} color={colors.text} />
    </TouchableOpacity>
  );
}

function HomeEventRow({
  item,
  colors,
  t,
  onPress,
}: {
  item: HomeItem;
  colors: HomeColors;
  t: any;
  onPress: () => void;
}) {
  const meta = getEventMeta(item.type);
  const accentColor = item.isToday ? colors.warning : colors.primary;
  const initials = getInitials(item.name);

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
      <View style={styles.timelineColumn}>
        <View
          style={[
            styles.timelineDot,
            {
              borderColor: accentColor,
              backgroundColor: colors.card,
            },
          ]}
        >
          <View
            style={[styles.timelineDotInner, { backgroundColor: accentColor }]}
          />
        </View>

        <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
      </View>

      <View style={styles.eventContent}>
        <View style={styles.eventTopRow}>
          <View style={styles.eventMainText}>
            <View style={styles.eventTitleRow}>
              <Text
                style={[styles.eventName, { color: colors.title }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>

              <View
                style={[
                  styles.typeChip,
                  { backgroundColor: withOpacity(accentColor, "16") },
                ]}
              >
                <Text style={[styles.typeChipText, { color: accentColor }]}>
                  {meta.icon} {meta.label.toLowerCase()}
                </Text>
              </View>
            </View>

            <Text
              style={[styles.eventRelative, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.relativeLabel}
            </Text>
          </View>

          <View style={styles.eventRight}>
            <View style={[styles.datePill, { backgroundColor: colors.softCard }]}>
              <Text style={[styles.datePillText, { color: colors.text }]}>
                {item.dateLabel}
              </Text>
            </View>

            {item.isToday ? (
              <View
                style={[
                  styles.todayBadge,
                  { backgroundColor: withOpacity(colors.warning, "18") },
                ]}
              >
                <Text style={[styles.todayBadgeText, { color: colors.warning }]}>
                  {t("today.badge")}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: withOpacity(colors.primary, "14") },
                ]}
              >
                <Text style={[styles.badgeText, { color: colors.primary }]}>
                  {formatShortCountdown(item.daysUntil, t)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.eventBottomRow}>
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

          <Text
            style={[styles.eventMeta, { color: colors.text }]}
            numberOfLines={1}
          >
            {t("event.tapToView", {
              name: firstName(item.name) || t("event.unknownContact"),
            })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  hint: string;
  colors: HomeColors;
}) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View
        style={[styles.statIconBubble, { backgroundColor: colors.softPrimary }]}
      >
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>

      <Text style={[styles.statLabel, { color: colors.text }]}>{label}</Text>

      <Text style={[styles.statValue, { color: colors.title }]}>{value}</Text>

      <Text style={[styles.statHint, { color: colors.text }]}>{hint}</Text>
    </View>
  );
}

function InsightChip({
  type,
  count,
  colors,
}: {
  type: EventTypeValue;
  count: number;
  colors: HomeColors;
}) {
  const meta = getEventMeta(type);

  return (
    <View
      style={[
        styles.insightChip,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={styles.insightIcon}>{meta.icon}</Text>

      <View>
        <Text style={[styles.insightCount, { color: colors.title }]}>
          {count}
        </Text>

        <Text style={[styles.insightLabel, { color: colors.text }]}>
          {meta.label.toLowerCase()}
        </Text>
      </View>
    </View>
  );
}

function SectionHeader({
  title,
  icon,
  colors,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: HomeColors;
}) {
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={styles.sectionTitleLeft}>
        <View
          style={[
            styles.sectionIconBubble,
            { backgroundColor: colors.softPrimary },
          ]}
        >
          <Ionicons name={icon} size={15} color={colors.primary} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.title }]}>
          {title}
        </Text>
      </View>
    </View>
  );
}

function EmptyInlineCard({
  icon,
  title,
  text,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  colors: HomeColors;
}) {
  return (
    <View
      style={[
        styles.emptyCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.emptyIcon, { backgroundColor: colors.softPrimary }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>

      <View style={styles.emptyTextWrap}>
        <Text style={[styles.emptyTitle, { color: colors.title }]}>
          {title}
        </Text>

        <Text style={[styles.emptyText, { color: colors.text }]}>{text}</Text>
      </View>
    </View>
  );
}

function FilterChip({
  label,
  selected,
  colors,
  onPress,
}: {
  label: string;
  selected?: boolean;
  colors: HomeColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.filterChip,
        {
          backgroundColor: selected ? colors.softPrimary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.filterChipText,
          {
            color: selected ? colors.primary : colors.text,
            fontWeight: selected ? "900" : "800",
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ShowMoreButton({
  label,
  colors,
  onPress,
}: {
  label: string;
  colors: HomeColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.showMoreButton,
        {
          backgroundColor: colors.softPrimary,
          borderColor: withOpacity(colors.primary, "20"),
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.showMoreText, { color: colors.primary }]}>
        {label}
      </Text>

      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
    </TouchableOpacity>
  );
}

function PrivacyFooter({ colors }: { colors: HomeColors }) {
  return (
    <View
      style={[
        styles.privacyFooter,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.privacyIcon, { backgroundColor: colors.softPrimary }]}>
        <Ionicons
          name="phone-portrait-outline"
          size={17}
          color={colors.primary}
        />
      </View>

      <View style={styles.privacyTextWrap}>
        <Text style={[styles.privacyTitle, { color: colors.title }]}>
          Private on this device
        </Text>

        <Text style={[styles.privacyText, { color: colors.text }]}>
          Your relationship memory stays local unless you export a backup.
        </Text>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Skeleton                                                                     */
/* -------------------------------------------------------------------------- */

function HomeSkeleton({ colors }: { colors: HomeColors }) {
  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <View style={styles.skeletonAppBar}>
          <View style={styles.skeletonAppLeft}>
            <SkeletonBlock colors={colors} style={styles.skeletonAppIcon} />

            <View style={styles.skeletonAppText}>
              <SkeletonBlock colors={colors} style={styles.skeletonAppTitle} />
              <SkeletonBlock
                colors={colors}
                style={styles.skeletonAppSubtitle}
              />
            </View>
          </View>

          <SkeletonBlock colors={colors} style={styles.skeletonUserChip} />
        </View>

        <View
          style={[
            styles.skeletonHeroCard,
            { backgroundColor: colors.softPrimary },
          ]}
        >
          <SkeletonBlock colors={colors} style={styles.skeletonHeroTitle} />
          <SkeletonBlock colors={colors} style={styles.skeletonHeroLine} />
          <SkeletonBlock colors={colors} style={styles.skeletonHeroLineSmall} />
          <SkeletonBlock colors={colors} style={styles.skeletonBeforeMeet} />
        </View>

        <View style={styles.statsRow}>
          <SkeletonStatCard colors={colors} />
          <SkeletonStatCard colors={colors} />
        </View>

        <SkeletonSection colors={colors} />
        <SkeletonSection colors={colors} />
      </ScrollView>
    </View>
  );
}

function SkeletonStatCard({ colors }: { colors: HomeColors }) {
  return (
    <View
      style={[
        styles.skeletonStatCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <SkeletonBlock colors={colors} style={styles.skeletonSmallCircle} />
      <SkeletonBlock colors={colors} style={styles.skeletonStatLabel} />
      <SkeletonBlock colors={colors} style={styles.skeletonStatValue} />
      <SkeletonBlock colors={colors} style={styles.skeletonStatHint} />
    </View>
  );
}

function SkeletonSection({ colors }: { colors: HomeColors }) {
  return (
    <View style={styles.section}>
      <View style={styles.skeletonSectionHeader}>
        <SkeletonBlock colors={colors} style={styles.skeletonSectionIcon} />
        <SkeletonBlock colors={colors} style={styles.skeletonSectionTitle} />
      </View>

      <SkeletonEventRow colors={colors} />
      <SkeletonEventRow colors={colors} />
    </View>
  );
}

function SkeletonEventRow({ colors }: { colors: HomeColors }) {
  return (
    <View
      style={[
        styles.skeletonEventCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <SkeletonBlock colors={colors} style={styles.skeletonTimelineDot} />

      <View style={styles.skeletonEventText}>
        <SkeletonBlock colors={colors} style={styles.skeletonEventTitle} />
        <SkeletonBlock colors={colors} style={styles.skeletonEventSubtitle} />
        <SkeletonBlock colors={colors} style={styles.skeletonEventMeta} />
      </View>

      <SkeletonBlock colors={colors} style={styles.skeletonDatePill} />
    </View>
  );
}

function SkeletonBlock({
  colors,
  style,
}: {
  colors: HomeColors;
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
/* Helpers                                                                      */
/* -------------------------------------------------------------------------- */

function makeHomeColors(settings: any): HomeColors {
  return {
    background: settings.backgroundColor ?? "#F8F4FF",
    card: settings.cardColor ?? "#FFFFFF",
    title: settings.titleColor ?? "#10162F",
    text: settings.textColor ?? "#5F6680",
    primary: settings.primaryColor ?? "#6651E5",
    button: settings.buttonColor || settings.primaryColor || "#6651E5",
    buttonText: settings.buttonTextColor ?? "#FFFFFF",
    border: withOpacity(settings.textColor ?? "#10162F", "18"),
    muted: withOpacity(settings.textColor ?? "#10162F", "88"),
    softCard: withOpacity(settings.textColor ?? "#10162F", "08"),
    softPrimary: withOpacity(settings.primaryColor ?? "#6651E5", "16"),
    danger: "#EE6A5E",
    warning: "#EBA55B",
    success: "#7DA56D",
    shadow:
      settings.resolvedThemeMode === "dark" || settings.themeMode === "dark"
        ? "#000000"
        : "#6F3D2E",
  };
}

function shouldShowPlanCard(access: any, totalContacts: number) {
  if (!access) return false;
  if (access.isBeta) return false;
  if (access.maxContacts === "unlimited") return false;

  const remaining = getRemainingContacts(access, totalContacts);

  if (remaining === "unlimited") return false;

  return Number(remaining) <= 3;
}

function buildAttentionItems(
  todayItems: HomeItem[],
  upcoming: HomeItem[],
  t: any
): AttentionItem[] {
  const today = todayItems.map((item) => ({
    ...item,
    attentionTitle: `${item.name} needs attention today`,
    attentionText: `${getEventMeta(item.type).label} today. Open the profile and prepare a thoughtful action.`,
    accentKind: "today" as const,
  }));

  const soon = upcoming
    .filter((item) => item.daysUntil > 0 && item.daysUntil <= 7)
    .map((item) => ({
      ...item,
      attentionTitle: `${item.name} is coming up`,
      attentionText: `${getEventMeta(item.type).label} ${item.relativeLabel.toLowerCase()}. Prepare before the moment arrives.`,
      accentKind: "soon" as const,
    }));

  const nextImportant =
    today.length === 0 && soon.length === 0
      ? upcoming.slice(0, 2).map((item) => ({
          ...item,
          attentionTitle: `${item.name} is next`,
          attentionText: `${getEventMeta(item.type).label} ${item.relativeLabel.toLowerCase()}.`,
          accentKind: "soon" as const,
        }))
      : [];

  return [...today, ...soon, ...nextImportant];
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

function parseDateOnly(dateString?: string | null) {
  if (!dateString) return new Date("");

  const [year, month, day] = dateString.split("-").map(Number);

  if (!year || !month || !day) {
    return new Date(dateString);
  }

  return new Date(year, month - 1, day);
}

function formatDateLabel(date: Date) {
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function buildRelativeLabel(daysUntil: number, t: any) {
  if (daysUntil === 0) return t("relative.today");
  if (daysUntil === 1) return t("relative.tomorrow");

  if (daysUntil < 7) {
    return t("relative.inDays", { count: daysUntil });
  }

  if (daysUntil < 30) {
    const weeks = Math.ceil(daysUntil / 7);

    return weeks === 1
      ? t("relative.inWeek")
      : t("relative.inWeeks", { count: weeks });
  }

  return t("relative.inDays", { count: daysUntil });
}

function formatShortCountdown(daysUntil: number, t: any | null) {
  if (daysUntil === 0) return t ? t("countdown.today") : "Today";
  if (daysUntil === 1) return t ? t("countdown.oneDay") : "1d";

  if (daysUntil < 7) {
    return t ? t("countdown.days", { count: daysUntil }) : `${daysUntil}d`;
  }

  const weeks = Math.ceil(daysUntil / 7);

  return t ? t("countdown.weeks", { count: weeks }) : `${weeks}w`;
}

function buildUpcomingSections(items: HomeItem[], t: any): UpcomingSection[] {
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
      title: t("upcoming.thisWeek"),
      data: week,
    });
  }

  if (month.length > 0) {
    sections.push({
      key: "month",
      title: t("upcoming.laterThisMonth"),
      data: month,
    });
  }

  return sections;
}

function getEventMeta(type: EventTypeValue) {
  return (
    EVENT_TYPE_META[type] ?? {
      icon: "✨",
      label: "Moment",
    }
  );
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

function firstName(name: string) {
  return name.split(" ").filter(Boolean)[0] ?? "";
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                       */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },

  container: {
    paddingHorizontal: 14,
    paddingTop: 38,
    paddingBottom: 34,
  },

  appBar: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  appTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  appIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  appTitleWrap: {
    flex: 1,
    minWidth: 0,
  },

  appTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.2,
  },

  appSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.78,
    marginTop: 1,
  },

  userChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  userChipText: {
    fontSize: 13,
    fontWeight: "900",
  },

  heroCard: {
    minHeight: 250,
    borderRadius: 32,
    padding: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  heroGlowOne: {
    position: "absolute",
    top: -54,
    right: -42,
    width: 155,
    height: 155,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.16)",
  },

  heroGlowTwo: {
    position: "absolute",
    bottom: -70,
    left: -52,
    width: 165,
    height: 165,
    borderRadius: 86,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  heroTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  heroEyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
    letterSpacing: 1,
    opacity: 0.72,
    marginBottom: 4,
  },

  heroGreeting: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -0.4,
  },

  heroSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    opacity: 0.84,
    marginTop: 7,
  },

  heroIconBubble: {
    width: 50,
    height: 50,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  heroIconText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  heroActionButton: {
    alignSelf: "flex-start",
    minHeight: 42,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 13,
    marginTop: 14,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  heroActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },

  statCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  statIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  statLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    opacity: 0.72,
  },

  statValue: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "900",
    marginTop: 3,
  },

  statHint: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 2,
    opacity: 0.72,
  },

  insightsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },

  insightChip: {
    minHeight: 45,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  insightIcon: {
    fontSize: 17,
  },

  insightCount: {
    fontSize: 14,
    fontWeight: "900",
  },

  insightLabel: {
    fontSize: 10,
    fontWeight: "800",
    opacity: 0.72,
  },

  section: {
    marginTop: 18,
  },

  sectionHeaderRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },

  sectionTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  sectionIconBubble: {
    width: 30,
    height: 30,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.1,
  },

  attentionList: {
    gap: 9,
  },

  attentionCard: {
    minHeight: 78,
    borderRadius: 24,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  attentionIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  attentionIconText: {
    fontSize: 18,
  },

  attentionTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  attentionTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
  },

  attentionText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 3,
  },

  attentionBadge: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  attentionBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },

  todayHighlightCard: {
    minHeight: 82,
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  todayHighlightText: {
    flex: 1,
    minWidth: 0,
  },

  todayTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
  },

  todayMeta: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.76,
    marginTop: 3,
  },

  todayIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },

  eventList: {
    marginTop: 10,
  },

  eventCard: {
    flexDirection: "row",
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 9,
    paddingVertical: 12,
    paddingRight: 12,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  timelineColumn: {
    width: 38,
    alignItems: "center",
  },

  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  timelineDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  timelineLine: {
    flex: 1,
    width: 2,
    marginTop: 5,
    marginBottom: 2,
    borderRadius: 999,
  },

  eventContent: {
    flex: 1,
    minWidth: 0,
  },

  eventTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  eventMainText: {
    flex: 1,
    minWidth: 0,
  },

  eventTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  eventName: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
  },

  eventRelative: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 3,
    opacity: 0.76,
  },

  eventRight: {
    alignItems: "flex-end",
    gap: 5,
  },

  datePill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },

  datePillText: {
    fontSize: 11,
    fontWeight: "900",
  },

  todayBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  todayBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },

  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  badgeText: {
    fontSize: 10,
    fontWeight: "900",
  },

  eventBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 11,
  },

  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 11,
    fontWeight: "900",
  },

  eventMeta: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    opacity: 0.72,
  },

  typeChip: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  typeChipText: {
    fontSize: 10,
    fontWeight: "900",
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },

  filterChip: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  filterChipText: {
    fontSize: 12,
  },

  upcomingSectionBlock: {
    marginTop: 6,
  },

  upcomingSectionTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    opacity: 0.72,
    marginBottom: 7,
  },

  emptyCard: {
    minHeight: 78,
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  emptyTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 3,
  },

  showMoreButton: {
    alignSelf: "center",
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  showMoreText: {
    fontSize: 12,
    fontWeight: "900",
  },

  accessCard: {
    minHeight: 64,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginTop: 18,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },

  accessIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  accessTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  accessTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "900",
  },

  accessSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.76,
    marginTop: 2,
  },

  privacyFooter: {
    minHeight: 74,
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  privacyIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  privacyTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  privacyTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  privacyText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 3,
  },

  skeletonBlock: {
    borderWidth: 1,
    opacity: 0.86,
  },

  skeletonAppBar: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  skeletonAppLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  skeletonAppIcon: {
    width: 38,
    height: 38,
    borderRadius: 16,
  },

  skeletonAppText: {
    flex: 1,
    gap: 6,
  },

  skeletonAppTitle: {
    width: 130,
    height: 17,
    borderRadius: 9,
  },

  skeletonAppSubtitle: {
    width: 190,
    height: 12,
    borderRadius: 6,
  },

  skeletonUserChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },

  skeletonHeroCard: {
    minHeight: 250,
    borderRadius: 32,
    padding: 16,
    marginBottom: 12,
    overflow: "hidden",
  },

  skeletonHeroTitle: {
    width: 165,
    height: 32,
    borderRadius: 14,
    marginTop: 6,
  },

  skeletonHeroLine: {
    width: "82%",
    height: 14,
    borderRadius: 7,
    marginTop: 14,
  },

  skeletonHeroLineSmall: {
    width: "58%",
    height: 14,
    borderRadius: 7,
    marginTop: 8,
  },

  skeletonBeforeMeet: {
    height: 78,
    borderRadius: 24,
    marginTop: 22,
  },

  skeletonStatCard: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  skeletonSmallCircle: {
    width: 34,
    height: 34,
    borderRadius: 14,
    marginBottom: 10,
  },

  skeletonStatLabel: {
    width: 70,
    height: 10,
    borderRadius: 5,
  },

  skeletonStatValue: {
    width: 42,
    height: 24,
    borderRadius: 10,
    marginTop: 8,
  },

  skeletonStatHint: {
    width: "78%",
    height: 11,
    borderRadius: 6,
    marginTop: 7,
  },

  skeletonSectionHeader: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 9,
  },

  skeletonSectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 13,
  },

  skeletonSectionTitle: {
    width: 150,
    height: 18,
    borderRadius: 9,
  },

  skeletonEventCard: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 9,
    padding: 12,
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  skeletonTimelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },

  skeletonEventText: {
    flex: 1,
    gap: 8,
  },

  skeletonEventTitle: {
    width: "76%",
    height: 15,
    borderRadius: 8,
  },

  skeletonEventSubtitle: {
    width: "52%",
    height: 12,
    borderRadius: 6,
  },

  skeletonEventMeta: {
    width: "62%",
    height: 12,
    borderRadius: 6,
  },

  skeletonDatePill: {
    width: 54,
    height: 24,
    borderRadius: 999,
    marginLeft: 10,
  },
});