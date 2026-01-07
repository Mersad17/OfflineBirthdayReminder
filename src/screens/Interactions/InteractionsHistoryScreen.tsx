import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { deleteInteraction, fetchInteractionsPaginated } from "../../interactions/api";
import { Interaction, interactionTypeLabel } from "../../interactions/types";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ContactsStackParamList } from "../../navigation/ContactsStack";
import { useFocusEffect } from "@react-navigation/native";

type Props = NativeStackScreenProps<ContactsStackParamList,"InteractionsHistory">;

export default function InteractionsHistoryScreen({ route,navigation }: Props) {
  const { contactId } = route.params;
  const { settings } = useAppearance();

  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  async function load(pageToLoad = 1) {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const res = await fetchInteractionsPaginated(contactId, pageToLoad);

      setInteractions((prev) =>
        pageToLoad === 1 ? res.results : [...prev, ...res.results]
      );
      setHasMore(!!res.next);
      setPage(pageToLoad);
    } finally {
      setLoading(false);
    }
  }
  useFocusEffect(
    useCallback(() => {
      // 🔁 Reset pagination cleanly
      setPage(1);
      setHasMore(true);
      setInteractions([]);   
      load(1);
    }, [contactId])
  );

  const grouped = useMemo(() => {
    const map: Record<string, Interaction[]> = {};

    interactions.forEach((i) => {
      const label = dayLabel(i.happened_at);
      if (!map[label]) map[label] = [];
      map[label].push(i);
    });

    return Object.entries(map).map(([label, items]) => ({
      label,
      items,
    }));
  }, [interactions]);
  async function handleDelete(id: number) {
    Alert.alert(
      "Delete interaction",
      "Are you sure you want to delete this interaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteInteraction(id);
              setInteractions((prev) =>
                prev.filter((i) => i.id !== id)
              );
            } catch {
              Alert.alert("Error", "Could not delete interaction.");
            }
          },
        },
      ]
    );
  }
  
  return (
    <Screen>
      <FlatList
        data={grouped}
        keyExtractor={(item) => item.label}
        contentContainerStyle={styles.container}
        onEndReached={() => {
          if (!loading && hasMore) {
            load(page + 1);
          }
        }}
        
        onEndReachedThreshold={0.6}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <Text
                style={[
                  styles.emptyTitle,
                  { color: settings.titleColor },
                ]}
              >
                No interactions yet
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: settings.textColor + "99" },
                ]}
              >
                When you log a call, message, or meeting, it will appear here.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <ActivityIndicator
              style={{ marginVertical: 20 }}
              color={settings.primaryColor}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.dayBlock}>
            <Text
              style={[
                styles.dayHeader,
                { color: settings.textColor + "AA" },
              ]}
            >
              {item.label}
            </Text>

            <View
              style={[
                styles.card,
                {
                  backgroundColor: settings.cardColor,
                  borderColor: settings.cardColor + "55",
                },
              ]}
            >
              {item.items.map((i, idx) => (
              <View
                key={i.id}
                style={[
                  styles.row,
                  idx === item.items.length - 1 && styles.rowLast,
                ]}
              >
                <View style={styles.timeRow}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                <Text style={[styles.time, { color: settings.titleColor }]}>
                  {formatTime(i.happened_at)}
                  {i.duration_minutes ? ` · ${i.duration_minutes} min` : ""}
                </Text>

                {i.type != null && (
                  <Text style={{ fontSize: 12, color: settings.textColor + "99" }}>
                    · {interactionTypeLabel(i.type)}
                  </Text>
                )}
              </View>

                  <View style={styles.actions}>
                      {/* Edit */}
                      <TouchableOpacity
                        onPress={() =>
                          navigation.navigate("LogInteraction", {
                            contactId,
                            interaction: i,
                          })
                        }
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather
                          name="edit-2"
                          size={15}
                          color={settings.textColor + "AA"}
                        />
                      </TouchableOpacity>

                      {/* Delete */}
                      <TouchableOpacity
                        onPress={() => handleDelete(i.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Feather name="trash-2" size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                </View>

                {i.note && (
                  <Text
                    style={[
                      styles.note,
                      { color: settings.textColor },
                    ]}
                    numberOfLines={2}
                  >
                    {i.note}
                  </Text>
                )}
                </View>
              ))}
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

/* helpers */

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

  return d.toLocaleDateString();
}

/* styles */
const styles = StyleSheet.create({
  container: {
    padding: 12,
    paddingBottom: 32,
  },

  dayBlock: {
    marginBottom: 16,
  },

  dayHeader: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    opacity: 0.6,
  },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },

  row: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  rowLast: {
    borderBottomWidth: 0,
  },

  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  time: {
    fontSize: 14,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  
  note: {
    fontSize: 12.5,
    marginTop: 3,
    opacity: 0.7,
    lineHeight: 16,
  },

  delete: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.5,
  },

  emptyWrap: {
    marginTop: 120, 
    alignItems: "center",
    paddingHorizontal: 24,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.7,
  },
});
