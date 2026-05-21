import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";

import { fetchContacts, fetchContactGroups } from "../../contacts/api";
import { Contact, ContactGroup } from "../../contacts/types";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { formatDateEU } from "../../lib/date";

type Props = {
  navigation: any;
};

const ContactRow = React.memo(
  ({
    item,
    onPress,
    colors,
  }: {
    item: Contact;
    onPress: () => void;
    colors: {
      card: string;
      primary: string;
      text: string;
      buttonText: string;
    };
  }) => {
    const initials = `${item.first_name?.[0] || ""}${
      item.last_name?.[0] || ""
    }`.toUpperCase();

    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.card, { backgroundColor: colors.card }]}
      >
        <View style={styles.cardLeft}>
          {item.photo ? (
            <Image source={{ uri: item.photo }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.buttonText }]}>
                {initials || "?"}
              </Text>
            </View>
          )}

          <View style={styles.cardText}>
            <Text
              style={[styles.cardName, { color: colors.text }]}
              numberOfLines={1}
            >
              {`${item.first_name} ${item.last_name || ""}`.trim()}
            </Text>

            <View style={styles.metaRow}>
          {item.group_detail?.name ? (
            <View
              style={[
                styles.groupBadge,
                {
                  borderColor: item.group_detail.color || colors.primary,
                  backgroundColor: (item.group_detail.color || colors.primary) + "14",
                },
              ]}
            >
              <Ionicons
                name={(item.group_detail.icon || "people") as any}
                size={10}
                color={item.group_detail.color || colors.primary}
              />

              <Text
                style={[
                  styles.groupBadgeText,
                  {
                    color: item.group_detail.color || colors.primary,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.group_detail.name}
              </Text>
            </View>
          ) : null}

              {item.birthday ? (
                <Text
                  style={[styles.cardSub, { color: colors.text }]}
                  numberOfLines={1}
                >
                  Birthday: {formatDateEU(item.birthday)}
                </Text>
              ) : (
                <Text
                  style={[styles.cardSubMuted, { color: colors.text }]}
                  numberOfLines={1}
                >
                  No birthday set
                </Text>
              )}
            </View>
          </View>
        </View>

        <Text style={[styles.cardChevron, { color: colors.text + "80" }]}>
          ›
        </Text>
      </TouchableOpacity>
    );
  }
);

export default function ContactScreen({ navigation }: Props) {
  const { settings } = useAppearance();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<ContactGroup[]>([]);

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const isFocused = useIsFocused();
  const loadingRef = useRef(false);

  async function loadGroups() {
    try {
      const data = await fetchContactGroups({ onlyUsed: true });
      setGroups(data);
    } catch (error) {
      console.log("Failed to load contact groups:", error);
    }
  }

  async function load(pageToLoad = 1, reset = false) {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const res = await fetchContacts({
        page: pageToLoad,
        group: selectedGroupId,
        search: debouncedSearch || undefined,
      });

      const results: Contact[] = res.results ?? res;

      setContacts((prev) => {
        if (reset) return results;

        const existingIds = new Set(prev.map((c) => c.id));
        const filtered = results.filter((c) => !existingIds.has(c.id));

        return [...prev, ...filtered];
      });

      setHasMore(!!res.next);
      setPage(pageToLoad);
    } catch (error) {
      console.log("Failed to load contacts:", error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (isFocused) {
      loadGroups();
      load(1, true);
    }
  }, [isFocused, selectedGroupId, debouncedSearch]);

  async function onRefresh() {
    setRefreshing(true);
    await loadGroups();
    await load(1, true);
    setRefreshing(false);
  }

  const renderItem = useCallback(
    ({ item }: { item: Contact }) => (
      <ContactRow
        item={item}
        colors={{
          card: settings.cardColor,
          primary: settings.primaryColor,
          text: settings.textColor,
          buttonText: settings.buttonTextColor,
        }}
        onPress={() =>
          navigation.navigate("ContactDetail", {
            contactId: item.id,
            contactName: `${item.first_name} ${item.last_name || ""}`.trim(),
          })
        }
      />
    ),
    [navigation, settings]
  );

  const isEmpty = !loading && contacts.length === 0;

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: settings.titleColor }]}>
              Contacts
            </Text>

            {contacts.length > 0 && (
              <Text style={[styles.subtitle, { color: settings.textColor }]}>
                {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: settings.buttonColor },
            ]}
            onPress={() => navigation.navigate("AddContact")}
          >
            <Text
              style={[
                styles.addButtonText,
                { color: settings.buttonTextColor },
              ]}
            >
              ＋ Add
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={[
            styles.search,
            {
              backgroundColor: settings.cardColor,
              color: settings.textColor,
            },
          ]}
          placeholder="Search name, note, tag..."
          placeholderTextColor={settings.textColor + "80"}
          value={search}
          onChangeText={setSearch}
        />

{groups.length > 0 && (
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
            selectedGroupId === null
              ? settings.primaryColor
              : settings.cardColor,
        },
      ]}
      onPress={() => setSelectedGroupId(null)}
    >
      <Text
        style={[
          styles.groupChipText,
          {
            color:
              selectedGroupId === null
                ? settings.buttonTextColor
                : settings.textColor,
          },
        ]}
        numberOfLines={1}
      >
        All
      </Text>
    </TouchableOpacity>

            {groups.map((group) => {
            const active = selectedGroupId === group.id;
            const groupColor = group.color || settings.primaryColor;
            const groupIcon = group.icon || "people";

            return (
              <TouchableOpacity
                key={group.id}
                style={[
                  styles.groupChip,
                  {
                    backgroundColor: active ? groupColor : groupColor + "18",
                    borderColor: groupColor + "60",
                  },
                ]}
                onPress={() => setSelectedGroupId(group.id)}
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
)}

        <FlatList
          data={contacts}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={settings.primaryColor}
            />
          }
          contentContainerStyle={
            isEmpty ? styles.emptyListContainer : { paddingBottom: 16 }
          }
          ListEmptyComponent={
            isEmpty ? (
              <View style={styles.emptyState}>
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: settings.titleColor },
                  ]}
                >
                  No contacts found
                </Text>

                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: settings.textColor },
                  ]}
                >
                  Try another search, group, or tap “Add” to create a contact.
                </Text>
              </View>
            ) : null
          }
          ListHeaderComponent={
            loading && contacts.length === 0 ? (
              <ActivityIndicator
                style={{ marginVertical: 16 }}
                color={settings.primaryColor}
              />
            ) : null
          }
          renderItem={renderItem}
          onEndReached={() => {
            if (hasMore && !loading) {
              load(page + 1);
            }
          }}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            loading && contacts.length > 0 ? (
              <ActivityIndicator
                style={{ marginVertical: 16 }}
                color={settings.primaryColor}
              />
            ) : null
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  search: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
 groupScroll: {
  marginBottom: 6,
  maxHeight: 36,
  flexGrow: 0,
},

groupScrollContent: {
  gap: 8,
  paddingRight: 16,
  alignItems: "center",
},
  
  groupChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    fontWeight: "700",
    fontSize: 16,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  cardText: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "600",
  },
 metaRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  marginTop: 4,
  flexWrap: "nowrap",
},
groupBadge: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  borderWidth: 1,
  borderRadius: 999,
  paddingHorizontal: 7,
  paddingVertical: 2,
  maxWidth: 90,
  alignSelf: "flex-start",
  flexShrink: 0,
},

groupBadgeText: {
  fontSize: 10,
  fontWeight: "700",
  maxWidth: 62,
},

groupChip: {
  paddingHorizontal: 11,
  paddingVertical: 7,
  borderRadius: 20,
  borderWidth: 1,
  maxWidth: 135,
  alignSelf: "flex-start",
},

groupChipInner: {
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
},
  cardSub: {
    fontSize: 12,
    flexShrink: 1,
  },
  cardSubMuted: {
    fontSize: 12,
    flexShrink: 1,
    opacity: 0.75,
  },
  cardChevron: {
    fontSize: 22,
    marginLeft: 8,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
});