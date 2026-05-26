// src/screens/Interactions/InteractionsHistoryScreen.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Easing,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { Screen } from "../../components/Screen";
import { ContactsStackParamList } from "../../navigation/ContactsStack";
import { fetchContactById } from "../../contacts/repository";
import {
  deleteInteraction,
  fetchInteractionsPaginated,
} from "../../interactions/repository";
import {
  Interaction,
  interactionTypeLabel,
} from "../../interactions/types";
import { AppId, Contact } from "../../contacts/types";
import { relationshipHealth } from "../Contacts/relationshipHealth";

type Props = NativeStackScreenProps<
  ContactsStackParamList,
  "InteractionsHistory"
>;

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

type GroupedInteractions = {
  label: string;
  dateKey: string;
  items: Interaction[];
};

export default function InteractionsHistoryScreen({
  route,
  navigation,
}: Props) {
  const { contactId } = route.params;

  const [contact, setContact] = useState<Contact | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [page, setPage] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const screenAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    screenAnim.setValue(0);

    Animated.timing(screenAnim, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [screenAnim]);

  const screenAnimatedStyle = {
    opacity: screenAnim,
    transform: [
      {
        translateY: screenAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
    ],
  };

  const loadPage = useCallback(
    async (pageToLoad = 1) => {
      const isFirstPage = pageToLoad === 1;

      if (loadingRef.current) return;
      if (!isFirstPage && !hasMoreRef.current) return;

      loadingRef.current = true;

      try {
        if (isFirstPage) {
          setInitialLoading(true);
        } else {
          setLoadingMore(true);
        }

        if (isFirstPage) {
          const [interactionResponse, contactData] = await Promise.all([
            fetchInteractionsPaginated(contactId, pageToLoad),
            fetchContactById(contactId),
          ]);

          setContact(contactData);
          setInteractions(interactionResponse.results);

          const nextHasMore = Boolean(interactionResponse.next);

          hasMoreRef.current = nextHasMore;
          setHasMore(nextHasMore);
          setPage(pageToLoad);
        } else {
          const interactionResponse = await fetchInteractionsPaginated(
            contactId,
            pageToLoad
          );

          setInteractions((prev) => [
            ...prev,
            ...interactionResponse.results,
          ]);

          const nextHasMore = Boolean(interactionResponse.next);

          hasMoreRef.current = nextHasMore;
          setHasMore(nextHasMore);
          setPage(pageToLoad);
        }
      } catch (error) {
        console.log("Failed to load interactions:", error);
        Alert.alert("Interactions", "Could not load interactions.");
      } finally {
        loadingRef.current = false;
        setInitialLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [contactId]
  );

  useFocusEffect(
    useCallback(() => {
      hasMoreRef.current = true;
      setHasMore(true);
      setPage(1);
      loadPage(1);
    }, [loadPage])
  );

  const sortedInteractions = useMemo(() => {
    return [...interactions].sort(
      (a, b) =>
        new Date(b.happened_at).getTime() -
        new Date(a.happened_at).getTime()
    );
  }, [interactions]);

  const headerHealth = useMemo(() => {
    if (!contact) return null;

    return relationshipHealth(contact, sortedInteractions);
  }, [contact, sortedInteractions]);

  const grouped = useMemo(() => {
    const map: Record<string, GroupedInteractions> = {};

    sortedInteractions.forEach((interaction) => {
      const dateKey = getDateKey(interaction.happened_at);
      const label = dayLabel(interaction.happened_at);

      if (!map[dateKey]) {
        map[dateKey] = {
          label,
          dateKey,
          items: [],
        };
      }

      map[dateKey].items.push(interaction);
    });

    return Object.values(map).sort(
      (a, b) => new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime()
    );
  }, [sortedInteractions]);

  const stats = useMemo(() => {
    const latest = sortedInteractions[0] ?? null;

    const totalMinutes = sortedInteractions.reduce(
      (sum, item) => sum + (item.duration_minutes || 0),
      0
    );

    return {
      count: sortedInteractions.length,
      latestLabel: latest ? dayLabel(latest.happened_at) : "No logs yet",
      totalMinutes,
    };
  }, [sortedInteractions]);

  async function onRefresh() {
    if (loadingRef.current) return;

    setRefreshing(true);
    hasMoreRef.current = true;
    setHasMore(true);
    setPage(1);

    await loadPage(1);
  }

  async function handleDelete(id: AppId) {
    Alert.alert(
      "Delete interaction?",
      "This moment will be removed from this person's history.",
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
              await deleteInteraction(id);

              setInteractions((prev) =>
                prev.filter((interaction) => interaction.id !== id)
              );
            } catch (error) {
              console.log("Delete interaction failed:", error);
              Alert.alert("Interactions", "Could not delete interaction.");
            }
          },
        },
      ]
    );
  }

  function openCreateInteraction() {
    navigation.navigate("LogInteraction", {
      contactId,
    });
  }

  function openEditInteraction(interaction: Interaction) {
    navigation.navigate("LogInteraction", {
      contactId,
      interaction,
    });
  }

  if (initialLoading && interactions.length === 0) {
    return (
      <Screen>
        <View style={styles.loadingRoot}>
          <ActivityIndicator color={RED} />
          <Text style={styles.loadingText}>
            Loading relationship history…
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.root}>
        <Animated.View style={[styles.animatedRoot, screenAnimatedStyle]}>
          <FlatList
            data={grouped}
            keyExtractor={(item) => item.dateKey}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.container}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={RED}
              />
            }
            ListHeaderComponent={
              <HistoryHeader
                stats={stats}
                heartFillPercent={headerHealth?.fillPercent ?? 16}
                heartColor={headerHealth?.color ?? PURPLE}
                onBack={() => navigation.goBack()}
                onAdd={openCreateInteraction}
              />
            }
            ListEmptyComponent={
              !initialLoading ? (
                <EmptyState onAdd={openCreateInteraction} />
              ) : null
            }
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator
                  style={styles.footerLoader}
                  color={RED}
                />
              ) : (
                <View style={styles.footerSpace} />
              )
            }
            onEndReached={() => {
              if (!loadingMore && hasMore) {
                loadPage(page + 1);
              }
            }}
            onEndReachedThreshold={0.5}
            renderItem={({ item, index }) => (
              <DaySection
                group={item}
                index={index}
                onEdit={openEditInteraction}
                onDelete={handleDelete}
              />
            )}
          />
        </Animated.View>
      </View>
    </Screen>
  );
}

function HistoryHeader({
  stats,
  heartFillPercent,
  heartColor,
  onBack,
  onAdd,
}: {
  stats: {
    count: number;
    latestLabel: string;
    totalMinutes: number;
  };
  heartFillPercent: number;
  heartColor: string;
  onBack: () => void;
  onAdd: () => void;
}) {
  return (
    <LinearGradient
      colors={["#2B211B", "#3A2921", "#15100D"]}
      style={styles.headerCard}
    >
      <View style={styles.headerGlowOne} />
      <View style={styles.headerGlowTwo} />

      <View style={styles.headerTopRow}>
        <TouchableOpacity
          style={styles.headerCircleButton}
          onPress={onBack}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-back" size={23} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerLogButton}
          onPress={onAdd}
          activeOpacity={0.88}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.headerLogText}>Log interaction</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.headerContent}>
        <Text style={styles.headerEyebrow}>RELATIONSHIP HISTORY</Text>

        <View style={styles.headerTitleRow}>
          <View style={styles.headerTitleTextWrap}>
            <Text style={styles.headerTitle} numberOfLines={2}>
              Moments you shared
            </Text>
          </View>

          <View
            style={[
              styles.headerHeartCircle,
              { backgroundColor: withOpacity(heartColor, "18") },
            ]}
          >
            <HeartStrengthIcon
              fillPercent={heartFillPercent}
              color={heartColor}
              size={34}
            />
          </View>
        </View>

        <Text style={styles.headerSubtitle}>
          Calls, meetings, messages, and small details that keep the connection
          alive.
        </Text>
      </View>

      <View style={styles.statsRow}>
        <HeaderStat
          label="Logs"
          value={String(stats.count)}
          icon="albums-outline"
        />

        <HeaderStat
          label="Latest"
          value={stats.latestLabel}
          icon="time-outline"
        />

        <HeaderStat
          label="Time"
          value={stats.totalMinutes > 0 ? `${stats.totalMinutes}m` : "—"}
          icon="hourglass-outline"
        />
      </View>
    </LinearGradient>
  );
}

function HeaderStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.headerStat}>
      <View style={styles.headerStatIcon}>
        <Ionicons name={icon} size={13} color="#FFFFFF" />
      </View>

      <Text style={styles.headerStatLabel} numberOfLines={1}>
        {label}
      </Text>

      <Text style={styles.headerStatValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function HeartStrengthIcon({
  fillPercent,
  color,
  size = 30,
}: {
  fillPercent: number;
  color: string;
  size?: number;
}) {
  const safeFillPercent = Math.max(0, Math.min(100, fillPercent));
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: safeFillPercent,
      useNativeDriver: false,
      friction: 8,
      tension: 70,
    }).start();
  }, [animatedValue, safeFillPercent]);

  const animatedHeight = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [0, size],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.heartStrengthBox, { width: size, height: size }]}>
      <Ionicons
        name="heart"
        size={size}
        color="#E8DCD3"
        style={styles.heartStrengthLayer}
      />

      <Animated.View
        style={[
          styles.heartStrengthFillClip,
          {
            width: size,
            height: animatedHeight,
          },
        ]}
      >
        <View
          style={[
            styles.heartStrengthFillInner,
            {
              width: size,
              height: size,
            },
          ]}
        >
          <Ionicons name="heart" size={size} color={color} />
        </View>
      </Animated.View>

      <Ionicons
        name="heart-outline"
        size={size}
        color={color}
        style={styles.heartStrengthLayer}
      />
    </View>
  );
}

function DaySection({
  group,
  index,
  onEdit,
  onDelete,
}: {
  group: GroupedInteractions;
  index: number;
  onEdit: (interaction: Interaction) => void;
  onDelete: (id: AppId) => void;
}) {
  const appearAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appearAnim, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index * 45, 220),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [appearAnim, index]);

  const animatedStyle = {
    opacity: appearAnim,
    transform: [
      {
        translateY: appearAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }),
      },
    ],
  };

  return (
    <Animated.View style={[styles.daySection, animatedStyle]}>
      <View style={styles.dayTitleRow}>
        <View style={styles.dayTitleLeft}>
          <View style={styles.dayDot} />
          <Text style={styles.dayTitle}>{group.label}</Text>
        </View>

        <Text style={styles.dayCount}>
          {group.items.length} {group.items.length === 1 ? "moment" : "moments"}
        </Text>
      </View>

      <View style={styles.timelineCard}>
        {group.items.map((interaction, itemIndex) => {
          const isLast = itemIndex === group.items.length - 1;

          return (
            <InteractionRow
              key={String(interaction.id)}
              interaction={interaction}
              isLast={isLast}
              onEdit={() => onEdit(interaction)}
              onDelete={() => onDelete(interaction.id as AppId)}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

function InteractionRow({
  interaction,
  isLast,
  onEdit,
  onDelete,
}: {
  interaction: Interaction;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const label = getInteractionLabel(interaction.type);
  const meta = interactionMeta(interaction.type);

  return (
    <View style={[styles.interactionRow, isLast && styles.interactionRowLast]}>
      <View style={styles.timelineColumn}>
        <View
          style={[
            styles.timelineIcon,
            { backgroundColor: withOpacity(meta.color, "20") },
          ]}
        >
          <Ionicons name={meta.icon} size={16} color={meta.color} />
        </View>

        {!isLast ? <View style={styles.timelineLine} /> : null}
      </View>

      <View style={styles.interactionContent}>
        <View style={styles.interactionTopRow}>
          <View style={styles.interactionTitleWrap}>
            <Text style={styles.interactionType} numberOfLines={1}>
              {label}
            </Text>

            <Text style={styles.interactionTime} numberOfLines={1}>
              {formatTime(interaction.happened_at)}
              {interaction.duration_minutes
                ? ` · ${interaction.duration_minutes} min`
                : ""}
            </Text>
          </View>

          <View style={styles.interactionActions}>
            <TouchableOpacity
              style={styles.iconAction}
              onPress={onEdit}
              activeOpacity={0.82}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pencil-outline" size={15} color={MUTED} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconAction}
              onPress={onDelete}
              activeOpacity={0.82}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={15} color={RED_DARK} />
            </TouchableOpacity>
          </View>
        </View>

        {interaction.note ? (
          <Text style={styles.interactionNote} numberOfLines={3}>
            {interaction.note}
          </Text>
        ) : (
          <Text style={styles.interactionNoteMuted}>No note added.</Text>
        )}
      </View>
    </View>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}>
        <Ionicons name="chatbubbles-outline" size={28} color={ORANGE} />
      </View>

      <Text style={styles.emptyTitle}>No moments logged yet</Text>

      <Text style={styles.emptyText}>
        Start with a quick note after a meeting, call, or conversation. It will
        become part of this person’s story.
      </Text>

      <TouchableOpacity
        style={styles.emptyButton}
        onPress={onAdd}
        activeOpacity={0.88}
      >
        <Ionicons name="heart-outline" size={17} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>Log first interaction</Text>
      </TouchableOpacity>
    </View>
  );
}

/* helpers */

function getInteractionLabel(type?: number | null) {
  if (type === null || type === undefined) return "Interaction";

  return interactionTypeLabel(type);
}

function interactionMeta(type?: number | null) {
  const label = getInteractionLabel(type).toLowerCase();

  if (label.includes("call")) {
    return {
      icon: "call-outline" as keyof typeof Ionicons.glyphMap,
      color: GREEN,
    };
  }

  if (label.includes("message") || label.includes("text")) {
    return {
      icon: "chatbubble-ellipses-outline" as keyof typeof Ionicons.glyphMap,
      color: BLUE,
    };
  }

  if (label.includes("meet") || label.includes("coffee")) {
    return {
      icon: "cafe-outline" as keyof typeof Ionicons.glyphMap,
      color: ORANGE,
    };
  }

  if (label.includes("gift")) {
    return {
      icon: "gift-outline" as keyof typeof Ionicons.glyphMap,
      color: PURPLE,
    };
  }

  return {
    icon: "heart-outline" as keyof typeof Ionicons.glyphMap,
    color: RED,
  };
}

function parseDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getDateKey(value?: string | null) {
  const date = parseDate(value);

  if (!date) return "unknown";

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function formatTime(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayLabel(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "Unknown";

  const today = new Date();
  const yesterday = new Date();

  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function withOpacity(hexColor?: string | null, opacityHex = "22") {
  if (!hexColor || typeof hexColor !== "string") return `#000000${opacityHex}`;

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
    backgroundColor: BG,
  },

  animatedRoot: {
    flex: 1,
  },

  loadingRoot: {
    flex: 1,
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: "#FFFFFF",
    marginTop: 12,
    fontSize: 14,
    fontWeight: "700",
  },

  container: {
    padding: 14,
    paddingBottom: 42,
    backgroundColor: BG,
  },

  headerCard: {
    minHeight: 270,
    borderRadius: 34,
    padding: 16,
    marginBottom: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },

  headerGlowOne: {
    position: "absolute",
    top: -45,
    right: -35,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(238,106,94,0.20)",
  },

  headerGlowTwo: {
    position: "absolute",
    bottom: -60,
    left: -50,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(235,165,91,0.16)",
  },

  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerCircleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },

  headerLogButton: {
    height: 42,
    borderRadius: 21,
    backgroundColor: RED,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: RED,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  headerLogText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },

  headerContent: {
    marginTop: 30,
  },

  headerEyebrow: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },

  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    marginTop: 5,
  },

  headerTitleTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "900",
  },

  headerHeartCircle: {
    width: 58,
    height: 58,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  heartStrengthBox: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  heartStrengthLayer: {
    position: "absolute",
  },

  heartStrengthFillClip: {
    position: "absolute",
    left: 0,
    bottom: 0,
    overflow: "hidden",
  },

  heartStrengthFillInner: {
    position: "absolute",
    left: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    marginTop: 8,
    maxWidth: 310,
  },

  statsRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 20,
  },

  headerStat: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.11)",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  headerStatIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  headerStatLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  headerStatValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2,
  },

  daySection: {
    marginBottom: 16,
  },

  dayTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 2,
  },

  dayTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  dayDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: RED,
  },

  dayTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: TEXT,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  dayCount: {
    fontSize: 11,
    fontWeight: "800",
    color: MUTED,
  },

  timelineCard: {
    borderRadius: 26,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 4,
    shadowColor: "#6F3D2E",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  interactionRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
  },

  interactionRowLast: {
    paddingBottom: 14,
  },

  timelineColumn: {
    width: 34,
    alignItems: "center",
  },

  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: BORDER,
    marginTop: 6,
    borderRadius: 999,
  },

  interactionContent: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 9,
  },

  interactionTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },

  interactionTitleWrap: {
    flex: 1,
    minWidth: 0,
  },

  interactionType: {
    fontSize: 15,
    fontWeight: "900",
    color: TEXT,
  },

  interactionTime: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "800",
    color: MUTED,
  },

  interactionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  iconAction: {
    width: 29,
    height: 29,
    borderRadius: 14.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5E9DF",
  },

  interactionNote: {
    marginTop: 8,
    color: MUTED,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },

  interactionNoteMuted: {
    marginTop: 8,
    color: "#B49F91",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    fontStyle: "italic",
  },

  footerLoader: {
    marginVertical: 20,
  },

  footerSpace: {
    height: 20,
  },

  emptyCard: {
    borderRadius: 30,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#6F3D2E",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: "#FFF1D8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "900",
  },

  emptyText: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 7,
    fontWeight: "600",
  },

  emptyButton: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: RED,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    shadowColor: RED,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
});