import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "react-native";

import { useIsFocused } from "@react-navigation/native";

import { fetchContacts } from "../../contacts/api";
import { Contact } from "../../contacts/types";
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
    const initials = `${item.first_name?.[0] || ""}${item.last_name?.[0] || ""}`.toUpperCase();

    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.card, { backgroundColor: colors.card }]}
      >
        <View style={styles.cardLeft}>
          {item.photo ? (
            <Image source={{ uri: item.photo }} style={styles.avatarImage} />
          ) : (
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.avatarText,
                  { color: colors.buttonText },
                ]}
              >
                {initials || "?"}
              </Text>
            </View>
          )}

          <View style={styles.cardText}>
            <Text
              style={[styles.cardName, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.first_name} {item.last_name}
            </Text>

            {item.birthday ? (
              <Text style={[styles.cardSub, { color: colors.text }]}>
                Birthday: {formatDateEU(item.birthday)}
              </Text>
            ) : (
              <Text
                style={[
                  styles.cardSubMuted,
                  { color: colors.text },
                ]}
              >
                No birthday set
              </Text>
            )}
          </View>
        </View>

        <Text
          style={[
            styles.cardChevron,
            { color: colors.text + "80" },
          ]}
        >
          ›
        </Text>
      </TouchableOpacity>
    );
  }
);


export default function ContactScreen({ navigation }: Props) {
  const { settings } = useAppearance();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const isFocused = useIsFocused();
  const loadingRef = useRef(false);
  async function load(pageToLoad = 1, reset = false) {
    if (loadingRef.current) return;
    loadingRef.current = true;
  
    setLoading(true);
    try {
      const res = await fetchContacts(pageToLoad);
      setContacts(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const filtered = res.results.filter((c: { id: number; }) => !existingIds.has(c.id));
        return reset ? res.results : [...prev, ...filtered];
      });
      setHasMore(!!res.next);
      setPage(pageToLoad);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }
  

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (isFocused) {
      load(1, true); // reset
    }
  }, [isFocused]);

useEffect(() => {
  const t = setTimeout(() => setDebouncedSearch(search), 200);
  return () => clearTimeout(t);
}, [search]);

  async function onRefresh() {
    setRefreshing(true);
    await load(1, true);
    setRefreshing(false);
  }
  
  
  
  const filteredContacts = useMemo(() => {
    if (!debouncedSearch) return contacts;
  
    const q = debouncedSearch.toLowerCase();
    return contacts.filter(c =>
      (c.first_name?.toLowerCase() ?? "").includes(q) ||
      (c.last_name?.toLowerCase() ?? "").includes(q)
    );
  }, [contacts, debouncedSearch]);
  
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
            contactName: `${item.first_name} ${item.last_name}`,
          })
        }
      />
    ),
    [navigation, settings]
  );
  

  const isEmpty = !loading && filteredContacts.length === 0;

  return (
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text
              style={[styles.title, { color: settings.titleColor }]}
            >
              Contacts
            </Text>
            {contacts.length > 0 && (
              <Text
                style={[
                  styles.subtitle,
                  { color: settings.textColor },
                ]}
              >
                {contacts.length} contact
                {contacts.length !== 1 ? "s" : ""}
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

        {/* Search */}
        <TextInput
          style={[
            styles.search,
            {
              backgroundColor: settings.cardColor,
              color: settings.textColor,
            },
          ]}
          placeholder="Search contacts..."
          placeholderTextColor={settings.textColor + "80"}
          value={search}
          onChangeText={setSearch}
        />

        {/* List */}
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => String(item.id)}
          getItemLayout={(_, index) => ({
            length: 64,
            offset: 64 * index,
            index,
          })}
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
                  No contacts yet
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: settings.textColor },
                  ]}
                >
                  Tap “Add” to create your first contact.
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
            if (!debouncedSearch && hasMore && !loading) {
              load(page + 1);
            }
          }}
          onEndReachedThreshold={0.6}
        
          ListFooterComponent={
            loading ? (
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
    marginBottom: 12,
  },
  letterHeader: {
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 4,
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
  cardText: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardSub: {
    fontSize: 13,
    marginTop: 2,
  },
  cardSubMuted: {
    fontSize: 12,
    marginTop: 2,
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
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
});
