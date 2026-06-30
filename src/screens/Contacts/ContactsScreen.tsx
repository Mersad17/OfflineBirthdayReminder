import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

import { fetchContacts, fetchContactGroups } from "../../contacts/repository";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { formatDateEU } from "../../lib/date";
import { AppId, Contact, ContactGroup } from "../../contacts/types";

type Props = {
  navigation: any;
};

type ContactListColors = {
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
  shadow: string;
};

type ContactRowProps = {
  item: Contact;
  colors: ContactListColors;
  onPress: () => void;
};

type LoadContactsOptions = {
  pageToLoad?: number;
  reset?: boolean;
  clearBeforeLoad?: boolean;
};

const CONTACTS_STALE_AFTER_MS = 30_000;
const LIST_BATCH_SIZE = 10;

const ContactRow = React.memo(function ContactRow({
  item,
  colors,
  onPress,
}: ContactRowProps) {
  const name = fullName(item);
  const initials = getInitials(item);
  const group = item.group_detail;
  const groupColor = group?.color || colors.primary;
  const groupIcon = group?.icon || "people";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[
        styles.contactCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.contactLeft}>
        {item.photo ? (
          <Image source={{ uri: item.photo }} style={styles.avatarImage} />
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

        <View style={styles.contactTextBlock}>
          <Text
            style={[styles.contactName, { color: colors.title }]}
            numberOfLines={1}
          >
            {name}
          </Text>

          <View style={styles.metaRow}>
            {group?.name ? (
              <View
                style={[
                  styles.groupBadge,
                  {
                    borderColor: withOpacity(groupColor, "45"),
                    backgroundColor: withOpacity(groupColor, "16"),
                  },
                ]}
              >
                <Ionicons
                  name={groupIcon as any}
                  size={10}
                  color={groupColor}
                />

                <Text
                  style={[styles.groupBadgeText, { color: groupColor }]}
                  numberOfLines={1}
                >
                  {group.name}
                </Text>
              </View>
            ) : null}

            <Text
              style={[
                styles.contactSubText,
                { color: colors.text },
                !item.birthday && styles.mutedText,
              ]}
              numberOfLines={1}
            >
              {item.birthday
                ? `Birthday: ${formatDateEU(item.birthday)}`
                : "No birthday set"}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.chevronCircle, { backgroundColor: colors.softCard }]}>
        <Ionicons name="chevron-forward" size={16} color={colors.text} />
      </View>
    </TouchableOpacity>
  );
});

export default function ContactsScreen({ navigation }: Props) {
  const { settings } = useAppearance();
  const colors = useMemo(() => makeContactListColors(settings), [settings]);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<AppId | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const loadingRef = useRef(false);
  const requestIdRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);
  const lastLoadedAtRef = useRef<number | null>(null);
  const selectedGroupIdRef = useRef<AppId | null>(selectedGroupId);
  const debouncedSearchRef = useRef(debouncedSearch);

  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId;
  }, [selectedGroupId]);

  useEffect(() => {
    debouncedSearchRef.current = debouncedSearch;
  }, [debouncedSearch]);

  const loadGroups = useCallback(async () => {
    try {
      const data = await fetchContactGroups({ onlyUsed: true });
      setGroups(data);
    } catch (error) {
      console.log("Failed to load contact groups:", error);
    }
  }, []);

  const load = useCallback(
    async ({
      pageToLoad = 1,
      reset = false,
      clearBeforeLoad = false,
    }: LoadContactsOptions = {}) => {
      if (loadingRef.current && !reset) return;

      const requestId = ++requestIdRef.current;

      loadingRef.current = true;
      setLoading(true);

      if (reset && clearBeforeLoad) {
        setContacts([]);
      }

      try {
        const response = await fetchContacts({
          page: pageToLoad,
          group: selectedGroupIdRef.current,
          search: debouncedSearchRef.current || undefined,
        });

        if (requestId !== requestIdRef.current) return;

        const results: Contact[] = Array.isArray(response)
          ? response
          : response.results ?? [];

        setContacts((prev) => {
          if (reset) return results;

          const existingIds = new Set(prev.map((contact) => contact.id));

          const filtered = results.filter(
            (contact) => !existingIds.has(contact.id)
          );

          return [...prev, ...filtered];
        });

        setHasMore(!Array.isArray(response) && Boolean(response.next));
        setPage(pageToLoad);
        lastLoadedAtRef.current = Date.now();
      } catch (error) {
        if (requestId === requestIdRef.current) {
          console.log("Failed to load contacts:", error);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => clearTimeout(timeout);
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();

      if (!hasLoadedOnceRef.current) {
        hasLoadedOnceRef.current = true;

        setPage(1);
        setHasMore(true);

        loadGroups();
        load({
          pageToLoad: 1,
          reset: true,
          clearBeforeLoad: false,
        });

        return;
      }

      const isStale =
        !lastLoadedAtRef.current ||
        now - lastLoadedAtRef.current > CONTACTS_STALE_AFTER_MS;

      if (isStale) {
        loadGroups();
        load({
          pageToLoad: 1,
          reset: true,
          clearBeforeLoad: false,
        });
      }
    }, [load, loadGroups])
  );

  useEffect(() => {
    if (!hasLoadedOnceRef.current) return;

    setPage(1);
    setHasMore(true);

    load({
      pageToLoad: 1,
      reset: true,
      clearBeforeLoad: true,
    });
  }, [selectedGroupId, debouncedSearch, load]);

  async function onRefresh() {
    if (refreshing) return;

    setRefreshing(true);

    try {
      setPage(1);
      setHasMore(true);

      await Promise.all([
        loadGroups(),
        load({
          pageToLoad: 1,
          reset: true,
          clearBeforeLoad: false,
        }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  function openAddContact() {
    navigation.navigate("AddContact");
  }

  const renderItem = useCallback(
    ({ item }: { item: Contact }) => (
      <ContactRow
        item={item}
        colors={colors}
        onPress={() =>
          navigation.navigate("ContactDetail", {
            contactId: item.id,
            contactName: fullName(item),
          })
        }
      />
    ),
    [colors, navigation]
  );

  const handleEndReached = useCallback(() => {
    if (!hasMore) return;
    if (loadingRef.current) return;

    load({
      pageToLoad: page + 1,
      reset: false,
      clearBeforeLoad: false,
    });
  }, [hasMore, load, page]);

  const isEmpty = !loading && contacts.length === 0;
  const showSkeleton = loading && contacts.length === 0 && !refreshing;

  if (showSkeleton) {
    return (
      <Screen>
        <ContactsSkeleton colors={colors} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <FlatList
          data={contacts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            isEmpty ? styles.emptyListContainer : styles.listContent
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
              <ContactsHeader
                count={contacts.length}
                colors={colors}
                onAdd={openAddContact}
              />

              <SearchBox
                value={search}
                colors={colors}
                onChangeText={setSearch}
              />

              <GroupFilter
                groups={groups}
                selectedGroupId={selectedGroupId}
                colors={colors}
                onSelect={setSelectedGroupId}
              />
            </View>
          }
          ListEmptyComponent={
            isEmpty ? (
              <EmptyContactsState
                hasSearch={Boolean(debouncedSearch || selectedGroupId)}
                colors={colors}
                onAdd={openAddContact}
              />
            ) : null
          }
          ListFooterComponent={
            loading && contacts.length > 0 ? (
              <ActivityIndicator
                style={styles.footerLoader}
                color={colors.primary}
              />
            ) : (
              <View style={styles.footerSpace} />
            )
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.6}
          initialNumToRender={LIST_BATCH_SIZE}
          maxToRenderPerBatch={LIST_BATCH_SIZE}
          updateCellsBatchingPeriod={50}
          windowSize={7}
          removeClippedSubviews={Platform.OS === "android"}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </Screen>
  );
}

/* skeleton */

function ContactsSkeleton({ colors }: { colors: ContactListColors }) {
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        <View style={styles.skeletonHeaderCard}>
          <SkeletonBlock colors={colors} style={styles.skeletonHeaderTitle} />
          <SkeletonBlock colors={colors} style={styles.skeletonHeaderLine} />
          <SkeletonBlock colors={colors} style={styles.skeletonHeaderLineSmall} />
        </View>

        <SkeletonBlock colors={colors} style={styles.skeletonSearchBox} />

        <View style={styles.skeletonGroupRow}>
          <SkeletonBlock colors={colors} style={styles.skeletonGroupChip} />
          <SkeletonBlock colors={colors} style={styles.skeletonGroupChipWide} />
          <SkeletonBlock colors={colors} style={styles.skeletonGroupChip} />
        </View>

        {Array.from({ length: 8 }).map((_, index) => (
          <SkeletonContactRow key={`contact-skeleton-${index}`} colors={colors} />
        ))}
      </ScrollView>
    </View>
  );
}

function SkeletonContactRow({ colors }: { colors: ContactListColors }) {
  return (
    <View
      style={[
        styles.skeletonContactCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <SkeletonBlock colors={colors} style={styles.skeletonAvatar} />

      <View style={styles.skeletonContactText}>
        <SkeletonBlock colors={colors} style={styles.skeletonNameLine} />
        <SkeletonBlock colors={colors} style={styles.skeletonMetaLine} />
      </View>

      <SkeletonBlock colors={colors} style={styles.skeletonChevron} />
    </View>
  );
}

function SkeletonBlock({
  colors,
  style,
}: {
  colors: ContactListColors;
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

/* components */

function ContactsHeader({
  count,
  colors,
  onAdd,
}: {
  count: number;
  colors: ContactListColors;
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
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>Contacts</Text>

          <Text style={styles.headerSubtitle}>
            {count > 0
              ? `${count} contact${
                  count !== 1 ? "s" : ""
                } saved in your private memory.`
              : "Start building your private memory of the people who matter."}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerAddButton}
          onPress={onAdd}
          activeOpacity={0.88}
        >
          <Ionicons name="person-add-outline" size={17} color="#FFFFFF" />
          <Text style={styles.headerAddText}>Add</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

function SearchBox({
  value,
  colors,
  onChangeText,
}: {
  value: string;
  colors: ContactListColors;
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
        style={[styles.searchInput, { color: colors.title }]}
        placeholder="Search name, description, tag..."
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
      />

      {value.trim() ? (
        <TouchableOpacity onPress={() => onChangeText("")}>
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function GroupFilter({
  groups,
  selectedGroupId,
  colors,
  onSelect,
}: {
  groups: ContactGroup[];
  selectedGroupId: AppId | null;
  colors: ContactListColors;
  onSelect: (groupId: AppId | null) => void;
}) {
  if (groups.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.groupScroll}
      contentContainerStyle={styles.groupScrollContent}
    >
      <TouchableOpacity
        style={[
          styles.groupChip,
          {
            backgroundColor:
              selectedGroupId === null ? colors.primary : colors.card,
            borderColor:
              selectedGroupId === null ? colors.primary : colors.border,
          },
        ]}
        onPress={() => onSelect(null)}
        activeOpacity={0.85}
      >
        <Text
          style={[
            styles.groupChipText,
            {
              color: selectedGroupId === null ? colors.buttonText : colors.text,
            },
          ]}
          numberOfLines={1}
        >
          All
        </Text>
      </TouchableOpacity>

      {groups.map((group) => {
        const active = selectedGroupId === group.id;
        const groupColor = group.color || colors.primary;
        const groupIcon = group.icon || "people";

        return (
          <TouchableOpacity
            key={String(group.id)}
            style={[
              styles.groupChip,
              {
                backgroundColor: active
                  ? groupColor
                  : withOpacity(groupColor, "18"),
                borderColor: withOpacity(groupColor, "55"),
              },
            ]}
            onPress={() => onSelect(group.id)}
            activeOpacity={0.85}
          >
            <View style={styles.groupChipInner}>
              <Ionicons
                name={groupIcon as any}
                size={13}
                color={active ? "#FFFFFF" : groupColor}
              />

              <Text
                style={[
                  styles.groupChipText,
                  {
                    color: active ? "#FFFFFF" : groupColor,
                  },
                ]}
                numberOfLines={1}
              >
                {group.name}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function EmptyContactsState({
  hasSearch,
  colors,
  onAdd,
}: {
  hasSearch: boolean;
  colors: ContactListColors;
  onAdd: () => void;
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
      <View style={[styles.emptyIcon, { backgroundColor: colors.softPrimary }]}>
        <Ionicons
          name={hasSearch ? "search-outline" : "people-outline"}
          size={28}
          color={colors.primary}
        />
      </View>

      <Text style={[styles.emptyTitle, { color: colors.title }]}>
        {hasSearch ? "No contacts found" : "No contacts yet"}
      </Text>

      <Text style={[styles.emptySubtitle, { color: colors.text }]}>
        {hasSearch
          ? "Try another search or group filter."
          : "Add your first person and start remembering what matters."}
      </Text>

      {!hasSearch ? (
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: colors.button }]}
          onPress={onAdd}
          activeOpacity={0.88}
        >
          <Ionicons
            name="person-add-outline"
            size={17}
            color={colors.buttonText}
          />

          <Text style={[styles.emptyButtonText, { color: colors.buttonText }]}>
            Add first contact
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* helpers */

function makeContactListColors(settings: any): ContactListColors {
  return {
    background: settings.backgroundColor ?? "#F8F4FF",
    card: settings.cardColor ?? "#FFFFFF",
    title: settings.titleColor ?? "#10162F",
    text: settings.textColor ?? "#5F6680",
    primary: settings.primaryColor ?? "#6651E5",
    button: settings.buttonColor || settings.primaryColor || "#6651E5",
    buttonText: settings.buttonTextColor ?? "#FFFFFF",
    border: withOpacity(settings.textColor ?? "#10162F", "16"),
    muted: withOpacity(settings.textColor ?? "#10162F", "80"),
    softCard: withOpacity(settings.textColor ?? "#10162F", "08"),
    softPrimary: withOpacity(settings.primaryColor ?? "#6651E5", "16"),
    danger: "#EE6A5E",
    warning: "#EBA55B",
    shadow: settings.themeMode === "dark" ? "#000000" : "#6F3D2E",
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

function fullName(contact: Contact) {
  return (
    `${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
    "Unnamed contact"
  );
}

function getInitials(contact: Contact) {
  const first = contact.first_name?.[0] || "";
  const last = contact.last_name?.[0] || "";

  return `${first}${last}`.toUpperCase() || "?";
}

/* styles */

const styles = StyleSheet.create({
  root: {
    flex: 1,
     paddingTop: 25,
  },

  listContent: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 30,
  },

  emptyListContainer: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 30,
  },

  headerCard: {
    borderRadius: 32,
    padding: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  headerGlowOne: {
    position: "absolute",
    top: -54,
    right: -42,
    width: 155,
    height: 155,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.16)",
  },

  headerGlowTwo: {
    position: "absolute",
    bottom: -70,
    left: -52,
    width: 165,
    height: 165,
    borderRadius: 86,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerAddButton: {
    minHeight: 40,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  headerAddText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  headerTextBlock: {
    flex: 1,
    minWidth: 0,
    marginTop: 27,
    marginRight: 12,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "900",
    marginTop: 5,
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    marginTop: 7,
    maxWidth: 315,
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

  groupScroll: {
    marginBottom: 10,
    maxHeight: 42,
    flexGrow: 0,
  },

  groupScrollContent: {
    gap: 8,
    paddingRight: 16,
    alignItems: "center",
  },

  groupChip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 145,
    alignSelf: "flex-start",
    justifyContent: "center",
  },

  groupChipInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  groupChipText: {
    fontSize: 12,
    fontWeight: "900",
  },

  contactCard: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    padding: 12,
    marginBottom: 9,
    borderWidth: 1,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  contactLeft: {
    flex: 1,
    minWidth: 0,
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
    fontSize: 15,
    fontWeight: "900",
  },

  contactTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  contactName: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 5,
    flexWrap: "nowrap",
  },

  groupBadge: {
    maxWidth: 96,
    minHeight: 22,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },

  groupBadgeText: {
    maxWidth: 66,
    fontSize: 10,
    fontWeight: "900",
  },

  contactSubText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    opacity: 0.74,
  },

  mutedText: {
    opacity: 0.58,
  },

  chevronCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginLeft: 9,
    alignItems: "center",
    justifyContent: "center",
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

  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    opacity: 0.76,
    textAlign: "center",
    marginTop: 6,
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

  skeletonBlock: {
    borderWidth: 1,
    opacity: 0.86,
  },

  skeletonHeaderCard: {
    minHeight: 142,
    borderRadius: 32,
    padding: 16,
    marginBottom: 12,
    backgroundColor: "rgba(0,0,0,0.04)",
    overflow: "hidden",
  },

  skeletonHeaderTitle: {
    width: 150,
    height: 34,
    borderRadius: 14,
    marginTop: 26,
  },

  skeletonHeaderLine: {
    width: "82%",
    height: 14,
    borderRadius: 7,
    marginTop: 14,
  },

  skeletonHeaderLineSmall: {
    width: "55%",
    height: 14,
    borderRadius: 7,
    marginTop: 8,
  },

  skeletonSearchBox: {
    height: 50,
    borderRadius: 20,
    marginBottom: 10,
  },

  skeletonGroupRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },

  skeletonGroupChip: {
    width: 72,
    height: 36,
    borderRadius: 999,
  },

  skeletonGroupChipWide: {
    width: 112,
    height: 36,
    borderRadius: 999,
  },

  skeletonContactCard: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    padding: 12,
    marginBottom: 9,
    borderWidth: 1,
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },

  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 19,
    marginRight: 11,
  },

  skeletonContactText: {
    flex: 1,
    gap: 8,
  },

  skeletonNameLine: {
    width: "72%",
    height: 15,
    borderRadius: 8,
  },

  skeletonMetaLine: {
    width: "48%",
    height: 12,
    borderRadius: 6,
  },

  skeletonChevron: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginLeft: 9,
  },
});