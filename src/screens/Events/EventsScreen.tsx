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
import { useAppearance } from "../../appearance/AppearanceContext";

type FilterType = "upcoming" | "past" | "no_reminder";

export default function EventsScreen({ navigation }: any) {
  const { settings } = useAppearance();

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

  // ⭐ using EVENT_TYPE_META
  function iconForType(type: number) {
    const meta = EVENT_TYPE_META[type as EventTypeValue];
    return meta?.icon ?? "🎉";
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={[styles.title, { color: settings.titleColor }]}>
          Events
        </Text>

        <TextInput
          style={[
            styles.search,
            {
              backgroundColor: settings.cardColor,
              borderColor: settings.cardColor + "60",
              color: settings.textColor,
            },
          ]}
          placeholder="Search events or contacts..."
          placeholderTextColor={settings.textColor + "66"}
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.filterRow}>
          {[
            { label: "Upcoming", value: "upcoming" as FilterType },
            { label: "Past", value: "past" as FilterType },
            { label: "No Reminder", value: "no_reminder" as FilterType },
          ].map(({ label, value }) => {
            const isActive = filter === value;
            return (
              <Pressable
                key={value}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor: isActive
                      ? settings.buttonColor
                      : settings.backgroundColor,
                    borderColor: settings.cardColor + "60",
                    borderWidth: 1,
                  },
                ]}
                onPress={() => {
                  if (filter !== value) setFilter(value);
                }}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: isActive
                        ? settings.buttonTextColor
                        : settings.textColor,
                    },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={settings.primaryColor}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={
            loading && hasNext ? (
              <ActivityIndicator
                style={{ marginVertical: 16 }}
                color={settings.primaryColor}
              />
            ) : null
          }
          renderItem={({ item, index }) => {
            const previous = index > 0 ? filteredEvents[index - 1] : null;
            const showMonthHeader =
              !previous || previous.month_label !== item.month_label;

            return (
              <View>
                {showMonthHeader && (
                  <Text
                    style={[
                      styles.monthHeader,
                      {
                        backgroundColor: settings.cardColor,
                        color: settings.titleColor,
                      },
                    ]}
                  >
                    {item.month_label}
                  </Text>
                )}
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: settings.cardColor,
                      borderColor: settings.cardColor + "40",
                    },
                  ]}
                >
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
                      style={[
                        styles.cardTitle,
                        { color: settings.titleColor },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {iconForType(item.type)} {item.contact_name}
                    </Text>
                    <Text
                      style={[
                        styles.cardSub,
                        { color: settings.textColor },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.title || "Untitled Event"} • {item.next_occurrence}
                      {item.days_until < 30 && (
                        <Text style={{ color: settings.primaryColor }}>
                          {" "}
                          • {friendlyCountdown(item.days_until)}
                        </Text>
                      )}
                    </Text>
                    <Text
                      style={[
                        styles.cardStatus,
                        { color: settings.textColor + "AA" },
                      ]}
                    >
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
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 6,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 20,
    paddingVertical: 8,
  },
  filterText: {
    textAlign: "center",
    fontWeight: "500",
  },
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", marginBottom: 2 },
  cardSub: { fontSize: 14 },
  cardStatus: { marginTop: 6, fontSize: 13 },
});
