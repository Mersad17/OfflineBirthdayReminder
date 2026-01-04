// src/screens/Events/EventsScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
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
  Modal,
  Image
} from "react-native";

import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { fetchEvents } from "../../events/api";
import { EventDTO, EventTypeValue, EVENT_TYPE_META } from "../../events/types";
import { formatDateEU } from "../../lib/date";

type Tab = "upcoming" | "past";

export default function EventsScreen({ navigation }: any) {
  const { settings } = useAppearance();

  const [tab, setTab] = useState<Tab>("upcoming");

  const [search, setSearch] = useState("");
  const [noReminderOnly, setNoReminderOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<number []>([]);

  const [draftNoReminderOnly, setDraftNoReminderOnly] = useState(false);
  const [draftTypeFilter, setDraftTypeFilter] = useState<number[]>([]);
  
  const [filterOpen, setFilterOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [events, setEvents] = useState<EventDTO[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  function iconForType(type: number) {
    const meta = EVENT_TYPE_META[type as EventTypeValue];
    return meta?.icon ?? "🎉";
  }

  function friendlyCountdown(days: number) {
    if (days === 0) return "🎉 Today";
    if (days === 1) return "Tomorrow";
    if (days < 7) return `in ${days} days`;
    if (days < 30) return `in ${Math.ceil(days / 7)} weeks`;
    return "";
  }

  async function load(pageToLoad = 1, merge = false) {
    setLoading(true);
    try {
      const data = await fetchEvents({
        filter: tab,
        page: pageToLoad,
        q: search.trim() ? search.trim() : undefined,
        no_reminder: noReminderOnly,
        type: typeFilter.length ? typeFilter : undefined,
      });

      const results = data.results || [];
      setEvents((prev) => {
        if (!merge) return results;
      
        const map = new Map<number, EventDTO>();
        [...prev, ...results].forEach((e) => map.set(e.id, e));
        return Array.from(map.values());
      });
            setPage(pageToLoad);
      setHasNext(!!data.next);
    } catch (err) {
      console.log("❌ Failed to load events", err);
    } finally {
      setLoading(false);
    }
  }
  const selectedTypeLabel =
  typeFilter.length === 0
    ? "Any"
    : typeFilter
        .map((t) => EVENT_TYPE_META[t as EventTypeValue]?.label)
        .join(", ");

  // Debounced reload when tab/search/filters change
  useEffect(() => {
    const t = setTimeout(() => {
      load(1, false);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search, noReminderOnly, typeFilter]);
  const AVATAR_COLORS = [
    "#6366F1", // indigo
    "#22C55E", // green
    "#F59E0B", // amber
    "#EF4444", // red
    "#3B82F6", // blue
    "#A855F7", // purple
  ];
  
  function avatarColor(contactId: number) {
    return AVATAR_COLORS[contactId % AVATAR_COLORS.length];
  }
  
  function renderAvatar(item: EventDTO) {
    const first = item.contact_first_name?.[0] ?? "";
    const last = item.contact_last_name?.[0] ?? "";
    const initials = `${first}${last}`.toUpperCase();
  
    return (
      <View>

        {item.contact_photo ? (
          <Image
          source={{ uri: item.contact_photo }}
          style={styles.avatarImage}
          />
          
        ) : (
          <View
            style={[
              styles.avatar,
              { backgroundColor: avatarColor(item.contact) },
            ]}
          >
            <Text style={[styles.avatarText, { color: "#fff" }]}>
              {initials || "?"}
            </Text>
          </View>
        )}
        </View>
    );
  }
  
  const onRefresh = async () => {
    setRefreshing(true);
    await load(1, false);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (hasNext && !loading) load(page + 1, true);
  };

  // Keep your existing month grouping if you had it
  const list = useMemo(() => {
    return [...events];
  }, [events]);

  return (
    <Screen>
      <View style={styles.container}>
        {/* Title row with Filter button */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: settings.titleColor }]}>Events</Text>

          <Pressable
            style={[
              styles.filterTopBtn,
              {
                backgroundColor: settings.backgroundColor,
                borderColor: settings.cardColor + "60",
              },
            ]}
            onPress={() => {
              setDraftNoReminderOnly(noReminderOnly);
              setDraftTypeFilter(typeFilter);
              setFilterOpen(true);
            }}
            
          >
            <Text style={{ color: settings.textColor, fontWeight: "700" }}>Filter</Text>
          </Pressable>
          
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          <Pressable
            style={[
              styles.filterButton,
              {
                backgroundColor: tab === "upcoming" ? settings.buttonColor : settings.backgroundColor,
                borderColor: settings.cardColor + "60",
                borderWidth: 1,
                flex: 1,
              },
            ]}
            onPress={() => setTab("upcoming")}
          >
            <Text
              style={[
                styles.filterText,
                { color: tab === "upcoming" ? settings.buttonTextColor : settings.textColor },
              ]}
            >
              Upcoming
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.filterButton,
              {
                backgroundColor: tab === "past" ? settings.buttonColor : settings.backgroundColor,
                borderColor: settings.cardColor + "60",
                borderWidth: 1,
                flex: 1,
              },
            ]}
            onPress={() => setTab("past")}
          >
            <Text
              style={[
                styles.filterText,
                { color: tab === "past" ? settings.buttonTextColor : settings.textColor },
              ]}
            >
              Past
            </Text>
          </Pressable>
        </View>

        {/* Search (optional but useful) */}
        <TextInput
          style={[
            styles.search,
            {
              backgroundColor: settings.cardColor,
              borderColor: settings.cardColor + "60",
              color: settings.textColor,
              borderWidth: 1,
            },
          ]}
          placeholder="Search events or contacts..."
          placeholderTextColor={settings.textColor + "66"}
          value={search}
          onChangeText={setSearch}
        />
        {noReminderOnly && (
          <Text style={{ color: settings.primaryColor, marginTop: 6 }}>
            ⚠️ Showing only events without future reminders  
          </Text>
        )}

        <FlatList
          data={list}
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
              <ActivityIndicator style={{ marginVertical: 16 }} color={settings.primaryColor} />
            ) : null
          }
          renderItem={({ item }) => (
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
                <View style={styles.cardRow}>
                  
                  {renderAvatar(item)}

                  <View style={styles.cardText}>
                    <Text
                      style={[styles.cardTitle, { color: settings.titleColor }]}
                      numberOfLines={1}
                    >
                      {iconForType(item.type)} {item.contact_name}
                    </Text>

                    <Text style={[styles.cardSub, { color: settings.textColor }]} numberOfLines={1}>
                      {item.title || "Untitled Event"} • {formatDateEU(item.next_occurrence)}
                      {tab === "upcoming" && item.days_until < 30 ? (
                        <Text style={{ color: settings.primaryColor }}>
                          {" "}• {friendlyCountdown(item.days_until)}
                        </Text>
                      ) : null}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.cardStatus, { color: settings.textColor + "AA" }]}>
                  {item.has_reminder
                    ? `🔔 ${item.reminder_count} reminder${item.reminder_count > 1 ? "s" : ""}`
                    : "⚠️ No reminder"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />

        {/* Filter Modal */}
        <Modal visible={filterOpen} transparent animationType="fade" onRequestClose={() => setFilterOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setFilterOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: settings.cardColor, borderColor: settings.cardColor + "60" }]}>
            <Text style={[styles.sheetTitle, { color: settings.titleColor }]}>Filters</Text>
            <Pressable
              style={[
                styles.sheetRow,
                { borderColor: settings.cardColor + "60", alignItems: "center" },
              ]}
              onPress={() => setDraftNoReminderOnly((v) => !v)}
                          >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 18, marginRight: 10 }}>
              {draftNoReminderOnly ? "☑️" : "⬜️"}
            </Text>

                <Text style={{ color: settings.textColor, fontWeight: "700" }}>
                  Show only events without reminders
                </Text>
              </View>
            </Pressable>


            {/* Optional type filter (keep or remove) */}
            <View style={[styles.sheetRow, { flexDirection: "column" }]}>
  <Text style={{ color: settings.textColor, fontWeight: "700", marginBottom: 8 }}>
    Event types
  </Text>

  {Object.entries(EVENT_TYPE_META).map(([key, meta]) => {
    const value = Number(key);
    const selected = draftTypeFilter.includes(value);

    return (
      <Pressable
        key={key}
        onPress={() =>
          setDraftTypeFilter((prev) =>
            prev.includes(value)
              ? prev.filter((v) => v !== value)
              : [...prev, value]
          )
        }
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 10,
        }}
      >
        <Text style={{ fontSize: 18, marginRight: 10 }}>
          {selected ? "☑️" : "⬜️"}
        </Text>
        <Text style={{ color: settings.textColor, fontSize: 16 }}>
          {meta.icon} {meta.label}
        </Text>
      </Pressable>
    );
  })}
</View>


            <View style={styles.sheetBtns}>
              <Pressable
                style={[
                  styles.filterButton,
                  {
                    backgroundColor: settings.backgroundColor,
                    borderColor: settings.cardColor + "60",
                    borderWidth: 1,
                    flex: 1,
                  },
                ]}
                onPress={() => {
                  setDraftNoReminderOnly(false);
                  setDraftTypeFilter([]);
                }}
              >
                <Text style={[styles.filterText, { color: settings.textColor }]}>Clear</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.filterButton,
                  {
                    backgroundColor: settings.buttonColor,
                    borderColor: settings.cardColor + "60",
                    borderWidth: 1,
                    flex: 1,
                  },
                ]}
                onPress={() => {
                  setNoReminderOnly(draftNoReminderOnly);
                  setTypeFilter(draftTypeFilter);
                  setFilterOpen(false);
                }}
              >
                <Text style={[styles.filterText, { color: settings.buttonTextColor }]}>Done</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 50 },

  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 10 },

  filterTopBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },

  tabsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },

  search: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },

  filterButton: { borderRadius: 20, paddingVertical: 10 },
  filterText: { textAlign: "center", fontWeight: "600" },

  card: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  cardTitle: { fontSize: 17, fontWeight: "700", marginBottom: 2 },
  cardSub: { fontSize: 14 },
  cardStatus: { marginTop: 6, fontSize: 13 },

  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 140,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", marginBottom: 10 },
  sheetRow: {
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
  },
  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 12 },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  
  cardText: {
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
  
});
