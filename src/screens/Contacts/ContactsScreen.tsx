import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { fetchContacts } from "../../contacts/api";
import { Contact } from "../../contacts/types";
import { useIsFocused } from "@react-navigation/native";
import { Screen } from "../../components/Screen";

type Props = {
  navigation: any;
};

export default function ContactScreen({ navigation }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const isFocused = useIsFocused();
  async function load() {
    setLoading(true);
    try {
      const data = await fetchContacts();
      setContacts(data);
    } catch {
      alert("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (isFocused) {
      load();
    }
  }, [isFocused]);
  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const filteredContacts = contacts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q)
    );
  });

  const renderItem = ({ item }: { item: Contact;  }) => {

  


    const initials = `${item.first_name?.[0] || ""}${
      item.last_name?.[0] || ""
    }`.toUpperCase();

    return (
      <View>
        

        <TouchableOpacity
          onPress={() =>
            navigation.navigate("ContactDetail", {
              contactId: item.id,
              contactName: `${item.first_name} ${item.last_name}`,
            })
          }
          style={styles.card}
        >
          <View style={styles.cardLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {initials || "?"}
              </Text>
            </View>

            <View style={styles.cardText}>
              <Text
                style={styles.cardName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.first_name} {item.last_name}
              </Text>
              {item.birthday ? (
                <Text style={styles.cardSub}>
                  Birthday: {item.birthday}
                </Text>
              ) : (
                <Text style={styles.cardSubMuted}>No birthday set</Text>
              )}
            </View>
          </View>

          <Text style={styles.cardChevron}>›</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const isEmpty = !loading && filteredContacts.length === 0;

  return (
    <Screen>

    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Contacts</Text>
          {contacts.length > 0 && (
            <Text style={styles.subtitle}>
              {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("AddContact")}
        >
          <Text style={styles.addButtonText}>＋ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <TextInput
        style={styles.search}
        placeholder="Search contacts..."
        value={search}
        onChangeText={setSearch}
      />

      {/* List */}
      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={
          isEmpty ? styles.emptyListContainer : { paddingBottom: 16 }
        }
        ListEmptyComponent={
          isEmpty ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No contacts yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap “Add” to create your first contact.
              </Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          loading && contacts.length === 0 ? (
            <ActivityIndicator style={{ marginVertical: 16 }} />
          ) : null
        }
        renderItem={renderItem}
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
    color: "#777",
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#007AFF", // same accent as EventsScreen
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  search: {
    backgroundColor: "#f1f1f1",
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
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 4,
    color: "#333",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fafafa",
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
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    color: "#fff",
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
    color: "#666",
    fontSize: 13,
    marginTop: 2,
  },
  cardSubMuted: {
    color: "#999",
    fontSize: 12,
    marginTop: 2,
  },
  cardChevron: {
    fontSize: 22,
    color: "#ccc",
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
    color: "#666",
    textAlign: "center",
  },
});
