// src/screens/Interactions/InteractionsHistoryScreen.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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
import { useAppearance } from "../../appearance/AppearanceContext";

type Props = NativeStackScreenProps<
  ContactsStackParamList,
  "InteractionsHistory"
>;

type GroupedInteractions = {
  label: string;
  dateKey: string;
  items: Interaction[];
};

type HistoryColors = {
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

export default function InteractionsHistoryScreen({
  route,
  navigation,
}: Props) {
  const { contactId } = route.params;
  const { settings } = useAppearance();
  const colors = useMemo(() => makeHistoryColors(settings), [settings]);

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
        <View style={[styles.loadingRoot, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} />

          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading relationship history…
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Animated.View style={[styles.animatedRoot, screenAnimatedStyle]}>
          <FlatList
            data={grouped}
            keyExtractor={(item) => item.dateKey}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.container,
              { backgroundColor: colors.background },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListHeaderComponent={
              <HistoryHeader
                colors={colors}
                stats={stats}
                heartFillPercent={headerHealth?.fillPercent ?? 16}
                heartColor={headerHealth?.color ?? colors.primary}
                onBack={() => navigation.goBack()}
                onAdd={openCreateInteraction}
              />
            }
            ListEmptyComponent={
              !initialLoading ? (
                <EmptyState colors={colors} onAdd={openCreateInteraction} />
              ) : null
            }
            ListFooterComponent={
              loadingMore ? (
                <ActivityIndicator
                  style={styles.footerLoader}
                  color={colors.primary}
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
                colors={colors}
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
  colors,
  stats,
  heartFillPercent,
  heartColor,
  onBack,
  onAdd,
}: {
  colors: HistoryColors;
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
      colors={[colors.primary, colors.button] as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
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
          <Ionicons name="add" size={17} color="#FFFFFF" />
          <Text style={styles.headerLogText}>Log</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.headerMainRow}>
        <View style={styles.headerTitleTextWrap}>
          <Text style={styles.headerEyebrow}>RELATIONSHIP HISTORY</Text>

          <Text style={styles.headerTitle} numberOfLines={2}>
            Moments you shared
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={2}>
            Calls, meetings, messages, and small details that keep the connection alive.
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

      <View style={styles.statsRow}>
        <HeaderStat
          colors={colors}
          label="Logs"
          value={String(stats.count)}
          icon="albums-outline"
        />

        <HeaderStat
          colors={colors}
          label="Latest"
          value={stats.latestLabel}
          icon="time-outline"
        />

        <HeaderStat
          colors={colors}
          label="Time"
          value={stats.totalMinutes > 0 ? `${stats.totalMinutes}m` : "—"}
          icon="hourglass-outline"
        />
      </View>
    </LinearGradient>
  );
}

function HeaderStat({
  colors,
  label,
  value,
  icon,
}: {
  colors: HistoryColors;
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
  colors,
  onEdit,
  onDelete,
}: {
  group: GroupedInteractions;
  index: number;
  colors: HistoryColors;
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
          <View style={[styles.dayDot, { backgroundColor: colors.primary }]} />

          <Text style={[styles.dayTitle, { color: colors.title }]}>
            {group.label}
          </Text>
        </View>

        <Text style={[styles.dayCount, { color: colors.text }]}>
          {group.items.length} {group.items.length === 1 ? "moment" : "moments"}
        </Text>
      </View>

      <View
        style={[
          styles.timelineCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
        ]}
      >
        {group.items.map((interaction, itemIndex) => {
          const isLast = itemIndex === group.items.length - 1;

          return (
            <InteractionRow
              key={String(interaction.id)}
              interaction={interaction}
              isLast={isLast}
              colors={colors}
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
  colors,
  onEdit,
  onDelete,
}: {
  interaction: Interaction;
  isLast: boolean;
  colors: HistoryColors;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const label = getInteractionLabel(interaction.type);
  const meta = interactionMeta(interaction.type, colors);

  return (
    <View style={[styles.interactionRow, isLast && styles.interactionRowLast]}>
      <View style={styles.timelineColumn}>
        <View
          style={[
            styles.timelineIcon,
            { backgroundColor: withOpacity(meta.color, "18") },
          ]}
        >
          <Ionicons name={meta.icon} size={16} color={meta.color} />
        </View>

        {!isLast ? (
          <View
            style={[
              styles.timelineLine,
              { backgroundColor: colors.border },
            ]}
          />
        ) : null}
      </View>

      <View style={styles.interactionContent}>
        <View style={styles.interactionTopRow}>
          <View style={styles.interactionTitleWrap}>
            <Text
              style={[styles.interactionType, { color: colors.title }]}
              numberOfLines={1}
            >
              {label}
            </Text>

            <Text
              style={[styles.interactionTime, { color: colors.text }]}
              numberOfLines={1}
            >
              {formatTime(interaction.happened_at)}
              {interaction.duration_minutes
                ? ` · ${interaction.duration_minutes} min`
                : ""}
            </Text>
          </View>

          <View style={styles.interactionActions}>
            <TouchableOpacity
              style={[
                styles.iconAction,
                { backgroundColor: colors.softCard },
              ]}
              onPress={onEdit}
              activeOpacity={0.82}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pencil-outline" size={15} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.iconAction,
                { backgroundColor: withOpacity(colors.danger, "12") },
              ]}
              onPress={onDelete}
              activeOpacity={0.82}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={15} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {interaction.note ? (
          <Text
            style={[styles.interactionNote, { color: colors.text }]}
            numberOfLines={3}
          >
            {interaction.note}
          </Text>
        ) : (
          <Text
            style={[
              styles.interactionNoteMuted,
              { color: colors.muted },
            ]}
          >
            No note added.
          </Text>
        )}
      </View>
    </View>
  );
}

function EmptyState({
  colors,
  onAdd,
}: {
  colors: HistoryColors;
  onAdd: () => void;
}) {
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
          { backgroundColor: colors.softPrimary },
        ]}
      >
        <Ionicons
          name="chatbubbles-outline"
          size={28}
          color={colors.primary}
        />
      </View>

      <Text style={[styles.emptyTitle, { color: colors.title }]}>
        No moments logged yet
      </Text>

      <Text style={[styles.emptyText, { color: colors.text }]}>
        Start with a quick note after a meeting, call, or conversation. It will
        become part of this person’s story.
      </Text>

      <TouchableOpacity
        style={[
          styles.emptyButton,
          { backgroundColor: colors.button },
        ]}
        onPress={onAdd}
        activeOpacity={0.88}
      >
        <Ionicons name="heart-outline" size={17} color={colors.buttonText} />

        <Text
          style={[
            styles.emptyButtonText,
            { color: colors.buttonText },
          ]}
        >
          Log first interaction
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* helpers */

function makeHistoryColors(settings: any): HistoryColors {
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
    purple: "#8A6BD8",
    blue: "#4D82D8",
    shadow: settings.themeMode === "dark" ? "#000000" : "#6F3D2E",
  };
}

function getInteractionLabel(type?: number | null) {
  if (type === null || type === undefined) return "Interaction";

  return interactionTypeLabel(type);
}

function interactionMeta(type: number | null | undefined, colors: HistoryColors) {
  const label = getInteractionLabel(type).toLowerCase();

  if (label.includes("call")) {
    return {
      icon: "call-outline" as keyof typeof Ionicons.glyphMap,
      color: colors.success,
    };
  }

  if (label.includes("message") || label.includes("text")) {
    return {
      icon: "chatbubble-ellipses-outline" as keyof typeof Ionicons.glyphMap,
      color: colors.blue,
    };
  }

  if (label.includes("meet") || label.includes("coffee")) {
    return {
      icon: "cafe-outline" as keyof typeof Ionicons.glyphMap,
      color: colors.warning,
    };
  }

  if (label.includes("gift")) {
    return {
      icon: "gift-outline" as keyof typeof Ionicons.glyphMap,
      color: colors.purple,
    };
  }

  return {
    icon: "heart-outline" as keyof typeof Ionicons.glyphMap,
    color: colors.primary,
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

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

  animatedRoot: {
    flex: 1,
  },

  loadingRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "800",
  },

  container: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 42,
  },

  headerCard: {
    minHeight: 178,
    borderRadius: 28,
    padding: 16,
    marginBottom: 18,
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

  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerCircleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },

  headerLogButton: {
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  headerLogText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  headerMainRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  headerTitleTextWrap: {
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
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "900",
    marginTop: 3,
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 3,
  },

  headerHeartCircle: {
    width: 56,
    height: 56,
    borderRadius: 22,
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

  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },

  headerStat: {
    flex: 1,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.11)",
    paddingHorizontal: 9,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },

  headerStatIcon: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },

  headerStatLabel: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },

  headerStatValue: {
    color: "#FFFFFF",
    fontSize: 12,
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
  },

  dayTitle: {
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  dayCount: {
    fontSize: 11,
    fontWeight: "800",
    opacity: 0.75,
  },

  timelineCard: {
    borderRadius: 26,
    borderWidth: 1,
    paddingVertical: 4,
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
  },

  interactionTime: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "800",
    opacity: 0.74,
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
  },

  interactionNote: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    opacity: 0.78,
  },

  interactionNoteMuted: {
    marginTop: 8,
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
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    marginTop: 12,
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
    marginTop: 18,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  emptyButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },
});