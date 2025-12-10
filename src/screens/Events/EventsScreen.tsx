// src/screens/Events/EventsScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { fetchEvents } from "../../events/api";
import {
  EventDTO,
  EventTypeValue,
  EVENT_TYPE_META,
} from "../../events/types";
import { Screen } from "../../components/Screen";

type FilterType = "upcoming" | "past" | "no_reminder";

export default function EventsScreen({ navigation }: any) {
  const [filter, setFilter] = useState<FilterType>("upcoming");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const [eventsByFilter, setEventsByFilter] = useState<
    Record<FilterType, EventDTO[]>
  >({
    upcoming: [],
    past: [],
    no_reminder: [],
  });

  const [pageByFilter, setPageByFilter] = useState<Record<FilterType, number>>({
    upcoming: 1,
    past: 1,
    no_reminder: 1,
  });

  const [hasNextByFilter, setHasNextByFilter] = useState<
    Record<FilterType, boolean>
  >({
    upcoming: false,
    past: false,
    no_reminder: false,
  });

  const [loadedByFilter, setLoadedByFilter] = useState<
    Record<FilterType, boolean>
  >({
    upcoming: false,
    past: false,
    no_reminder: false,
  });

  const events = eventsByFilter[filter];
  const page = pageByFilter[filter];
  const hasNext = hasNextByFilter[filter];

  async function loadEvents(
    filterToLoad: FilterType,
    pageToLoad = 1,
    merge = false
  ) {
    setLoading(true);
    try {
      const data = await fetchEvents(filterToLoad, pageToLoad);
      const results = data.results || [];

      setEventsByFilter((prev) => ({
        ...prev,
        [filterToLoad]: merge ? [...prev[filterToLoad], ...results] : results,
      }));

      setPageByFilter((prev) => ({
        ...prev,
        [filterToLoad]: pageToLoad,
      }));

      setHasNextByFilter((prev) => ({
        ...prev,
        [filterToLoad]: !!data.next,
      }));

      setLoadedByFilter((prev) => ({
        ...prev,
        [filterToLoad]: true,
      }));
    } catch (err) {
      console.log("❌ Failed to load events", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!loadedByFilter[filter]) {
      loadEvents(filter, 1, false);
    }
  }, [filter, loadedByFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents(filter, 1, false);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (hasNext && !loading) {
      loadEvents(filter, page + 1, true);
    }
  };

  const filteredEvents = events.filter((event) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      event.title?.toLowerCase().includes(q) ||
      event.contact_name?.toLowerCase().includes(q)
    );
  });

  function friendlyCountdown(days: number) {
    if (days === 0) return "🎉 Today";
    if (days === 1) return "Tomorrow";
    if (days < 7) return `in ${days} days`;
    if (days < 30) return `in ${Math.ceil(days / 7)} weeks`;
    return "";
  }

  // ⭐ new helper using EVENT_TYPE_META
  function iconForType(type: number) {
    const meta = EVENT_TYPE_META[type as EventTypeValue];
    return meta?.icon ?? "🎉";
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Events</Text>

        <TextInput
          style={styles.search}
          placeholder="Search events or contacts..."
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.filterRow}>
          {[
            { label: "Upcoming", value: "upcoming" as FilterType },
            { label: "Past", value: "past" as FilterType },
            { label: "No Reminder", value: "no_reminder" as FilterType },
          ].map(({ label, value }) => (
            <Pressable
              key={value}
              style={[
                styles.filterButton,
                filter === value && styles.filterButtonActive,
              ]}
              onPress={() => {
                if (filter !== value) setFilter(value);
              }}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === value && styles.filterTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            loading && hasNext ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : null
          }
          renderItem={({ item, index }) => {
            const previous = index > 0 ? filteredEvents[index - 1] : null;
            const showMonthHeader =
              !previous || previous.month_label !== item.month_label;

            return (
              <View>
                {showMonthHeader && (
                  <Text style={styles.monthHeader}>{item.month_label}</Text>
                )}
                <View style={styles.card}>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate("EventDetails", {
                        eventId: item.id,
                        eventTitle: item.title,
                        from: "events",
                      })
                    }
                  >
                    <Text
                      style={styles.cardTitle}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {iconForType(item.type)} {item.contact_name}
                    </Text>
                    <Text
                      style={styles.cardSub}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.title || "Untitled Event"} • {item.next_occurrence}
                      {item.days_until < 30 && (
                        <Text style={{ color: "#007AFF" }}>
                          {" "}
                          • {friendlyCountdown(item.days_until)}
                        </Text>
                      )}
                    </Text>
                    <Text style={styles.cardStatus}>
                      {item.has_reminder
                        ? `🔔 ${item.reminder_count} reminder${
                            item.reminder_count > 1 ? "s" : ""
                          }`
                        : "⚠️ No reminder"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 50 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  search: {
    backgroundColor: "#f1f1f1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  monthHeader: {
    fontSize: 18,
    fontWeight: "700",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 6,
    color: "#333",
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: "#eee",
    borderRadius: 20,
    paddingVertical: 8,
  },
  filterButtonActive: { backgroundColor: "#007AFF" },
  filterText: { textAlign: "center", color: "#333", fontWeight: "500" },
  filterTextActive: { color: "#fff" },
  card: {
    backgroundColor: "#fafafa",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTitle: { fontSize: 17, fontWeight: "700", marginBottom: 2 },
  cardSub: { color: "#666", fontSize: 14 },
  cardStatus: { marginTop: 6, fontSize: 13, color: "#777" },
});
