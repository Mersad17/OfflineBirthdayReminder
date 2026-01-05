import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { api } from "../../lib/api";

type Interaction = {
  id: number;
  happened_at: string;
  duration_minutes: number | null;
  note: string | null;
};

type Props = {
  route: {
    params: {
      contactId: number;
    };
  };
};

export default function InteractionsHistoryScreen({ route }: Props) {
  const { contactId } = route.params;
  const { settings } = useAppearance();

  const [data, setData] = useState<Interaction[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  async function load(pageToLoad = 1) {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const res = await api.get(
        `/contacts/${contactId}/interactions/?page=${pageToLoad}`
      );

      setData((prev) =>
        pageToLoad === 1 ? res.data.results : [...prev, ...res.data.results]
      );
      setHasMore(!!res.data.next);
      setPage(pageToLoad);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
  }, [contactId]);

  const grouped = useMemo(() => {
    const out: { label: string; items: Interaction[] }[] = [];
    const map: Record<string, Interaction[]> = {};

    data.forEach((i) => {
      const label = dayLabel(i.happened_at);
      if (!map[label]) map[label] = [];
      map[label].push(i);
    });

    Object.entries(map).forEach(([label, items]) => {
      out.push({ label, items });
    });

    return out;
  }, [data]);

  return (
    <Screen>
      <FlatList
        data={grouped}
        keyExtractor={(item) => item.label}
        contentContainerStyle={styles.container}
        renderItem={({ item }) => (
          <View>
            <Text
              style={[
                styles.dayHeader,
                { color: settings.titleColor },
              ]}
            >
              {item.label}
            </Text>

            {item.items.map((i) => (
              <View key={i.id} style={styles.row}>
                <Text
                  style={[
                    styles.time,
                    { color: settings.titleColor },
                  ]}
                >
                  {formatTime(i.happened_at)}
                  {i.duration_minutes
                    ? ` · ${i.duration_minutes} min`
                    : ""}
                </Text>

                {i.note && (
                  <Text
                    style={[
                      styles.note,
                      { color: settings.textColor },
                    ]}
                  >
                    {i.note}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
        onEndReached={() => load(page + 1)}
        onEndReachedThreshold={0.6}
        ListFooterComponent={
          loading ? (
            <ActivityIndicator color={settings.primaryColor} />
          ) : null
        }
      />
    </Screen>
  );
}

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

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  dayHeader: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 4,
  },
  row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  time: {
    fontSize: 14,
    fontWeight: "700",
  },
  note: {
    fontSize: 13,
    marginTop: 2,
    opacity: 0.9,
  },
});
