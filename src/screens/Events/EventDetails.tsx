// src/screens/events/EventDetailsScreen.tsx (or EventDetails.tsx)
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { EventsStackParamList } from "../../navigation/EventsStack";

import {
  ActivityIndicator,
  Alert,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  TextInput,
  Animated,
} from "react-native";

import { fetchEventById, deleteEvent } from "../../events/api";
import {
  createReminder,
  updateReminder,
  deleteReminder,
} from "../../reminders/api";

import DateTimePicker from "@react-native-community/datetimepicker";
import { EVENT_TYPE_META, EventDTO, EventTypeValue } from "../../events/types";
import { useIsFocused } from "@react-navigation/native";
import { formatDateTime } from "../../reminders/utils";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";

// -----------------------------------------------------
// ⭐ MODAL COMPONENT (Reminder Editor with TOGGLE)
// -----------------------------------------------------
function ReminderModal({
  visible,
  onClose,
  onSave,
  initial,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    days_before: number | null;
    absolute_datetime: string | null;
    time_of_day?: string | null;
  }) => void;
  initial?: {
    days_before: number | null;
    absolute_datetime: string | null;
    time_of_day?: string | null;
  };
}) {
  const { settings } = useAppearance();
  const fade = React.useRef(new Animated.Value(0)).current;

  const [daysBefore, setDaysBefore] = useState<number | null>(
    initial?.days_before ?? null
  );
  const [tempDate, setTempDate] = useState(
    initial?.absolute_datetime
      ? new Date(initial.absolute_datetime)
      : new Date()
  );
  const [relativeTime, setRelativeTime] = useState<Date>(
    initial?.time_of_day
      ? (() => {
          const now = new Date();
          const [h, m] = initial.time_of_day.split(":").map(Number);
          now.setHours(h || 9);
          now.setMinutes(m || 0);
          return now;
        })()
      : new Date()
  );
  const [showRelativeTimePicker, setShowRelativeTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // "relative" = days_before + time_of_day, "absolute" = exact datetime
  const [mode, setMode] = useState<"relative" | "absolute">("relative");

  useEffect(() => {
    if (visible) {
      const hasRelative = initial?.days_before != null;
      const hasAbsolute = initial?.absolute_datetime != null;

      setMode(hasRelative ? "relative" : hasAbsolute ? "absolute" : "relative");
      setDaysBefore(initial?.days_before ?? null);
      setTempDate(
        initial?.absolute_datetime
          ? new Date(initial.absolute_datetime)
          : new Date()
      );

      if (initial?.time_of_day) {
        const now = new Date();
        const [h, m] = initial.time_of_day.split(":").map(Number);
        now.setHours(h || 9);
        now.setMinutes(m || 0);
        setRelativeTime(now);
      }

      Animated.timing(fade, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    } else {
      fade.setValue(0);
    }
  }, [visible, initial, fade]);

  if (!visible) return null;

  function openDatePicker() {
    setShowDatePicker(true);
  }

  function onDateSelected(e: any, selected?: Date) {
    setShowDatePicker(false);
    if (!selected) return;

    const d = new Date(selected);
    d.setHours(tempDate.getHours());
    d.setMinutes(tempDate.getMinutes());
    setTempDate(d);

    if (Platform.OS === "android") setShowTimePicker(true);
  }

  function onTimeSelected(e: any, selected?: Date) {
    setShowTimePicker(false);
    if (!selected) return;

    const d = new Date(tempDate);
    d.setHours(selected.getHours());
    d.setMinutes(selected.getMinutes());
    setTempDate(d);
  }

  function handleSave() {
    if (mode === "relative") {
      if (daysBefore === null || Number.isNaN(daysBefore)) {
        Alert.alert("Validation", "Please enter how many days before.");
        return;
      }
      const hours = relativeTime.getHours().toString().padStart(2, "0");
      const minutes = relativeTime.getMinutes().toString().padStart(2, "0");
      const timeStr = `${hours}:${minutes}`;
      onSave({
        days_before: daysBefore,
        absolute_datetime: null,
        time_of_day: timeStr,
      });
    } else {
      if (!tempDate) {
        Alert.alert("Validation", "Please choose a date and time.");
        return;
      }
      onSave({
        days_before: null,
        absolute_datetime: tempDate.toISOString(),
        time_of_day: null,
      });
    }
  }

  return (
    <Animated.View style={[modalStyles.overlay, { opacity: fade }]}>
      <View
        style={[
          modalStyles.container,
          { backgroundColor: settings.cardColor },
        ]}
      >
        <Text
          style={[
            modalStyles.title,
            { color: settings.primaryColor },
          ]}
        >
          {initial ? "Edit Reminder" : "Add Reminder"}
        </Text>

        {/* MODE TOGGLE */}
        <View
          style={[
            modalStyles.toggleRow,
            { backgroundColor: settings.backgroundColor },
          ]}
        >
          <TouchableOpacity
            style={[
              modalStyles.toggleButton,
              mode === "relative" && {
                ...modalStyles.toggleButtonActive,
                backgroundColor: settings.primaryColor,
              },
            ]}
            onPress={() => setMode("relative")}
          >
            <Text
              style={[
                modalStyles.toggleText,
                { color: settings.textColor },
                mode === "relative" && modalStyles.toggleTextActive,
              ]}
            >
              Days before
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              modalStyles.toggleButton,
              mode === "absolute" && {
                ...modalStyles.toggleButtonActive,
                backgroundColor: settings.primaryColor,
              },
            ]}
            onPress={() => setMode("absolute")}
          >
            <Text
              style={[
                modalStyles.toggleText,
                { color: settings.textColor },
                mode === "absolute" && modalStyles.toggleTextActive,
              ]}
            >
              Exact date & time
            </Text>
          </TouchableOpacity>
        </View>

        {/* RELATIVE MODE */}
        {mode === "relative" && (
          <>
            <Text
              style={[
                modalStyles.label,
                { color: settings.titleColor },
              ]}
            >
              Days Before
            </Text>
            <TextInput
              style={[
                modalStyles.input,
                {
                  backgroundColor: settings.cardColor,
                  borderColor: settings.cardColor + "60",
                  color: settings.textColor,
                },
              ]}
              keyboardType="numeric"
              value={daysBefore !== null ? String(daysBefore) : ""}
              onChangeText={(v) => setDaysBefore(v ? Number(v) : null)}
              placeholder="E.g. 3"
              placeholderTextColor={settings.textColor + "66"}
            />

            <Text
              style={[
                modalStyles.label,
                { color: settings.titleColor },
              ]}
            >
              Time of day
            </Text>
            <TouchableOpacity
              style={[
                modalStyles.dateButton,
                {
                  backgroundColor: settings.primaryColor + "15",
                  borderColor: settings.primaryColor + "60",
                },
              ]}
              onPress={() => setShowRelativeTimePicker(true)}
            >
              <Text
                style={[
                  modalStyles.dateButtonText,
                  { color: settings.primaryColor },
                ]}
              >
                {relativeTime.toLocaleTimeString()}
              </Text>
            </TouchableOpacity>
            {showRelativeTimePicker && (
              <DateTimePicker
                value={relativeTime}
                mode="time"
                display="default"
                onChange={(e, selected) => {
                  setShowRelativeTimePicker(false);
                  if (selected) {
                    setRelativeTime(selected);
                  }
                }}
              />
            )}
          </>
        )}

        {/* ABSOLUTE MODE */}
        {mode === "absolute" && (
          <>
            <Text
              style={[
                modalStyles.label,
                { color: settings.titleColor },
              ]}
            >
              Exact Date & Time
            </Text>
            <TouchableOpacity
              style={[
                modalStyles.dateButton,
                {
                  backgroundColor: settings.primaryColor + "15",
                  borderColor: settings.primaryColor + "60",
                },
              ]}
              onPress={openDatePicker}
            >
              <Text
                style={[
                  modalStyles.dateButtonText,
                  { color: settings.primaryColor },
                ]}
              >
                {tempDate.toLocaleString()}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="default"
                onChange={onDateSelected}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={tempDate}
                mode="time"
                display="default"
                onChange={onTimeSelected}
              />
            )}
          </>
        )}

        {/* ACTIONS */}
        <View style={modalStyles.row}>
          <TouchableOpacity onPress={onClose} style={modalStyles.cancelBtn}>
            <Text
              style={[
                modalStyles.cancelText,
                { color: settings.textColor },
              ]}
            >
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              modalStyles.saveBtn,
              { backgroundColor: settings.buttonColor },
            ]}
            onPress={handleSave}
          >
            <Text
              style={[
                modalStyles.saveText,
                { color: settings.buttonTextColor },
              ]}
            >
              Save
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

// -----------------------------------------------------
// ⭐ EVENT DETAILS SCREEN
// -----------------------------------------------------

type Props = NativeStackScreenProps<EventsStackParamList, "EventDetails">;

export default function EventDetails({ route, navigation }: Props) {
  const { eventId, eventTitle, from, contactId } = route.params;
  const { settings } = useAppearance();

  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState<EventDTO | null>(null);
  const isFocused = useIsFocused();

  const [showModal, setShowModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<any | null>(null);

  // Load event
  async function load() {
    setLoading(true);
    try {
      const e = await fetchEventById(eventId);
      setEvent(e);
    } catch {
      Alert.alert("Error", "Failed to load event.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [eventId]);

  useEffect(() => {
    if (isFocused) {
      load();
    }
  }, [isFocused]);

  // Set header
  useEffect(() => {
    if (!event) return;

    navigation.setOptions({
      title: eventTitle || "Event",
      headerRight: () => (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("EditEvent", {
              eventId,
              eventTitle: event.title || eventTitle,
              from,
              contactId,
            })
          }
        >
          <Text
            style={{
              color: settings.primaryColor,
              fontWeight: "700",
            }}
          >
            Edit
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [event, eventTitle, navigation, eventId, from, contactId, settings.primaryColor]);

  if (loading || !event) {
    return (
      <Screen>
        <View style={styles.center}>
          {loading ? (
            <>
              <ActivityIndicator color={settings.primaryColor} />
              <Text style={{ marginTop: 8, color: settings.textColor }}>
                Loading...
              </Text>
            </>
          ) : (
            <Text style={{ color: settings.textColor }}>
              Event not found.
            </Text>
          )}
        </View>
      </Screen>
    );
  }

  // DELETE EVENT
  function confirmDelete() {
    if (!event) return;

    const eventIdToDelete = event.id;

    Alert.alert("Delete Event", "Are you sure you want to delete this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteEvent(eventIdToDelete);
            if (from === "events") {
              navigation.navigate("EventsList");
            } else if (from === "contact") {
              navigation.goBack();
            } else {
              navigation.goBack();
            }
          } catch {
            Alert.alert("Error", "Could not delete event.");
          }
        },
      },
    ]);
  }

  // DELETE REMINDER
  async function confirmDeleteReminder(id: number) {
    Alert.alert("Delete Reminder", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteReminder(id);
            const updated = await fetchEventById(eventId);
            setEvent(updated);
          } catch {
            Alert.alert("Error", "Could not delete reminder.");
          }
        },
      },
    ]);
  }

  function iconForType(t: number) {
    const meta = EVENT_TYPE_META[t as EventTypeValue];
    return meta?.icon ?? "🎉";
  }

  function typeLabel(t: number) {
    const meta = EVENT_TYPE_META[t as EventTypeValue];
    return meta?.label ?? "Event";
  }

  function countdown(d: number) {
    if (d === 0) return "🎉 Today!";
    if (d === 1) return "Tomorrow 🎈";
    if (d < 7) return `In ${d} days`;
    if (d < 30) return `In ${Math.ceil(d / 7)} weeks`;
    return "";
  }

  return (
    <Screen scroll>
      <ScrollView contentContainerStyle={styles.page}>
        {/* HEADER */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: settings.cardColor,
              borderColor: settings.primaryColor + "40",
            },
          ]}
        >
          <Text style={styles.headerEmoji}>{iconForType(event.type)}</Text>
          <Text
            style={[
              styles.headerName,
              { color: settings.primaryColor },
            ]}
          >
            {event.contact_name}
          </Text>
          <Text
            style={[
              styles.headerTitle,
              { color: settings.textColor },
            ]}
          >
            {event.title || "Untitled Event"}
          </Text>

          {event.days_until < 30 && (
            <View
              style={[
                styles.countdownPill,
                {
                  backgroundColor: settings.primaryColor + "20",
                },
              ]}
            >
              <Text
                style={[
                  styles.countdownText,
                  { color: settings.primaryColor },
                ]}
              >
                {countdown(event.days_until)}
              </Text>
            </View>
          )}

          <Text
            style={[
              styles.confettiBottom,
              { color: settings.textColor },
            ]}
          >
            ✨🎊✨
          </Text>
        </View>

        {/* DETAILS */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: settings.cardColor,
              borderColor: settings.cardColor + "40",
            },
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: settings.titleColor },
            ]}
          >
            Event Details
          </Text>

          <DetailRow label="Type" value={typeLabel(event.type)} />
          <DetailRow label="Next Occurrence" value={event.next_occurrence} />
          <DetailRow label="Original Date" value={event.date} />
          <DetailRow
            label="Recurring"
            value={event.is_recurring ? "Yes" : "No"}
          />
          <DetailRow
            label="Status"
            value={event.is_active ? "Active" : "Inactive"}
          />
        </View>

        {/* REMINDERS */}
        <View
          style={[
            styles.card,
            styles.reminderCard,
            {
              backgroundColor: settings.cardColor,
              borderColor: settings.primaryColor + "33",
            },
          ]}
        >
          <Text
            style={[
              styles.cardTitle,
              { color: settings.titleColor },
            ]}
          >
            Reminders
          </Text>

          <TouchableOpacity
            style={[
              styles.addReminderBtn,
              { backgroundColor: settings.buttonColor + "20" },
            ]}
            onPress={() => {
              setEditingReminder(null);
              setShowModal(true);
            }}
          >
            <Text
              style={[
                styles.addReminderText,
                { color: settings.buttonColor },
              ]}
            >
              + Add Reminder
            </Text>
          </TouchableOpacity>

          {event.reminders.length === 0 ? (
            <Text
              style={[
                styles.noReminder,
                { color: settings.textColor },
              ]}
            >
              ⚠ No reminders yet
            </Text>
          ) : (
            event.reminders.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.reminderItem,
                  {
                    backgroundColor: settings.cardColor,
                    borderColor: settings.cardColor + "60",
                  },
                ]}
                onPress={() => {
                  setEditingReminder(r);
                  setShowModal(true);
                }}
              >
                <Text style={styles.reminderBullet}>🔔</Text>

                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.reminderText,
                      { color: settings.titleColor },
                    ]}
                  >
                    {r.days_before !== null
                      ? `Remind ${r.days_before} days before`
                      : `On this exact date:`}
                  </Text>

                  {r.send_at && (
                    <Text
                      style={[
                        styles.reminderSub,
                        { color: settings.textColor },
                      ]}
                    >
                      {formatDateTime(r.send_at)}
                    </Text>
                  )}
                </View>

                <TouchableOpacity onPress={() => confirmDeleteReminder(r.id)}>
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* DELETE EVENT */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={confirmDelete}
        >
          <Text style={styles.deleteButtonText}>Delete Event</Text>
        </TouchableOpacity>

        {/* MODAL */}
        <ReminderModal
          visible={showModal}
          initial={editingReminder}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            try {
              if (editingReminder) {
                await updateReminder(editingReminder.id, data);
              } else {
                await createReminder(event.id, data);
              }

              const updated = await fetchEventById(eventId);
              setEvent(updated);
            } catch {
              Alert.alert("Error", "Could not save reminder.");
            } finally {
              setShowModal(false);
            }
          }}
        />
      </ScrollView>
    </Screen>
  );
}

// DETAIL ROW
function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  const { settings } = useAppearance();
  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.rowLabel,
          { color: settings.textColor + "AA" },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.rowValue,
          { color: settings.titleColor },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// -----------------------------------------------------
// STYLES
// -----------------------------------------------------
const styles = StyleSheet.create({
  page: { padding: 16, gap: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    padding: 26,
    borderRadius: 22,
    alignItems: "center",
    borderWidth: 2,
  },
  headerEmoji: { fontSize: 60 },
  headerName: { fontSize: 24, fontWeight: "800", marginTop: 6 },
  headerTitle: { fontSize: 16, marginTop: 4 },
  countdownPill: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  countdownText: { fontWeight: "700" },
  confettiBottom: { fontSize: 20, opacity: 0.7, marginTop: 8 },

  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  reminderCard: {},
  cardTitle: { fontSize: 20, fontWeight: "700", marginBottom: 12 },

  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  rowLabel: {},
  rowValue: { fontWeight: "600" },

  addReminderBtn: {
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  addReminderText: { fontWeight: "700" },

  noReminder: { marginTop: 6, fontStyle: "italic" },

  reminderItem: {
    flexDirection: "row",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    alignItems: "center",
  },

  reminderBullet: { fontSize: 20, marginRight: 10 },
  reminderText: { fontWeight: "600", fontSize: 15 },
  reminderSub: { marginTop: 3, fontSize: 13 },
  deleteIcon: { fontSize: 18, marginLeft: 8 },

  deleteButton: {
    backgroundColor: "#FEE2E2",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  deleteButtonText: { color: "#B91C1C", fontWeight: "700" },
});

// -----------------------------------------------------
// MODAL STYLES
// -----------------------------------------------------
const modalStyles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 999,
  },
  container: {
    width: "100%",
    padding: 22,
    borderRadius: 18,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 14,
    textAlign: "center",
  },

  // Toggle
  toggleRow: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 3,
    marginBottom: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
  },
  toggleButtonActive: {},
  toggleText: { fontSize: 13, fontWeight: "600" },
  toggleTextActive: { color: "#FFF" },

  label: { marginTop: 10, fontWeight: "600" },
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginTop: 6,
  },
  dateButton: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  dateButtonText: { fontWeight: "600" },

  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  cancelBtn: { padding: 10 },
  cancelText: { fontSize: 16 },
  saveBtn: {
    paddingVertical: 12,
    paddingHorizontal: 26,
    borderRadius: 10,
  },
  saveText: { fontWeight: "700", fontSize: 16 },
});
