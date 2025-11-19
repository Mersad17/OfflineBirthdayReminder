import React from "react";
import { View, Text, SectionList, RefreshControl, ActivityIndicator } from "react-native";
import { fetchContacts } from "../../contacts/api";
import { Contact } from "../../contacts/types";
import { fetchEvents } from "../../events/api";
import { EventDTO, UpcomingEvent } from "../../events/types";
import { nextOccurrenceFrom, daysBetween, formatFriendly, sectionFor } from "../../events/dateUtils";

export default function HomeScreen({ navigation }: any) {
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [sections, setSections] = React.useState<{ title: string; data: UpcomingEvent[] }[]>([]);

  async function load() {
    setLoading(true);
    try {
      // 1) fetch both in parallel
      const [contacts, events] = await Promise.all([fetchContacts(), fetchEvents()]);

      // 2) map contact id -> name for quick lookup
      const nameById = new Map<number, string>();
      contacts.forEach((c: Contact) => {
        nameById.set(c.id, `${c.first_name} ${c.last_name}`.trim());
      });

      // 3) compute next occurrence for each active recurring event, filter next 30 days
      const today = new Date();
      const horizonDays = 30;

      const upcoming: UpcomingEvent[] = events
        .filter((e: EventDTO) => e.is_active && e.is_recurring) // MVP: focus on birthdays (recurring)
        .map((e: EventDTO) => {
          const next = nextOccurrenceFrom(e.date, today);
          const du = daysBetween(today, next);
          return {
            id: e.id,
            contactId: e.contact,
            contactName: nameById.get(e.contact) || "Unknown",
            type: e.type,
            originalDate: e.date,
            nextOccurrence: next,
            daysUntil: du,
            formattedDate: formatFriendly(next),
            section: sectionFor(next, today),
          };
        })
        .filter((u) => u.daysUntil >= 0 && u.daysUntil <= horizonDays)
        .sort((a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime());

      // 4) group by section
      const groups: Record<string, UpcomingEvent[]> = { "This week": [], "Next week": [], Later: [] };
      upcoming.forEach((u) => groups[u.section].push(u));

      const nextSections = ["This week", "Next week", "Later"]
        .map((title) => ({ title, data: groups[title as keyof typeof groups] }))
        .filter((s) => s.data.length > 0);

      setSections(nextSections);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading && sections.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading upcoming birthdays…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {sections.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "600" }}>No upcoming birthdays</Text>
          <Text style={{ color: "#666", marginTop: 6 }}>
            Add a contact with a birthday and you’ll see it here.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderSectionHeader={({ section }) => (
            <View style={{ backgroundColor: "#f7f7f7", paddingVertical: 6, paddingHorizontal: 12 }}>
              <Text style={{ fontWeight: "700" }}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: "#eee" }}>
              <Text style={{ fontWeight: "600" }}>{item.contactName}</Text>
              <Text style={{ color: "#444" }}>{item.formattedDate}</Text>
              <Text style={{ color: "#888" }}>{friendlyCountdown(item.daysUntil)}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

function friendlyCountdown(daysUntil: number) {
  if (daysUntil === 0) return "🎉 Today";
  if (daysUntil === 1) return "Tomorrow";
  return `In ${daysUntil} days`;
}
