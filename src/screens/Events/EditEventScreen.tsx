// src/screens/Events/EditEventScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { EventsStackParamList } from "../../navigation/EventsStack";
import { fetchEventById, updateEvent } from "../../events/api";
import { EventDTO } from "../../events/types";
import { Screen } from "../../components/Screen";

// 👇 Keep this in sync with your Django EventTypes IntEnum
type EventTypeValue = 1 | 2 | 3 | 4 | 5 | 6;

const EVENT_TYPE_OPTIONS: { label: string; value: EventTypeValue }[] = [
  { label: "🎂 Birthday", value: 1 },
  { label: "💍 Anniversary", value: 2 },
  { label: "⭐ Important date", value: 3 },
  { label: "🤝 Meeting", value: 4 },
  { label: "🏝 Holiday", value: 5 },
  { label: "✨ Other", value: 6 },
];

type Props = NativeStackScreenProps<EventsStackParamList, "EditEvent">;

export default function EditEventScreen({ route, navigation }: Props) {
  const { eventId, eventTitle, contactId: routeContactId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [event, setEvent] = useState<EventDTO | null>(null);

  const [contactId, setContactId] = useState<number | null>(
    routeContactId ?? null
  );
  const [contactName, setContactName] = useState<string>("Contact");

  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventTypeValue>(1);

  const [dateString, setDateString] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [timeString, setTimeString] = useState("");
  const [time, setTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [isRecurring, setIsRecurring] = useState(true);
  const [isActive, setIsActive] = useState(true);

  // ---------- helpers ----------

  function formatDate(d: Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatTime(d: Date) {
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  function parseDateFromString(value: string | null | undefined): Date | null {
    if (!value) return null;
    const [year, month, day] = value.split("-").map((p) => Number(p));
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }

  function parseTimeFromString(value: string | null | undefined): Date | null {
    if (!value) return null;
    const parts = value.split(":");
    if (parts.length < 2) return null;
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    const base = new Date();
    base.setHours(hours || 0, minutes || 0, 0, 0);
    return base;
  }

  // ---------- load event ----------

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const e = await fetchEventById(eventId);
        setEvent(e);

        // Contact: prefer backend contact_name, but keep routeContactId
        setContactId(routeContactId ?? e.contact ?? null);
        setContactName(e.contact_name || "Contact");

        // Title: backend title OR eventTitle from route OR fallback
        const initialTitle = e.title || eventTitle || "";
        setTitle(initialTitle);

        // Type
        setType((e.type as EventTypeValue) ?? 1);

        // Date
        setDateString(e.date || "");
        setDate(parseDateFromString(e.date));

        // Time
        if (e.time) {
          const hhmm = e.time.slice(0, 5); // "HH:MM"
          setTimeString(hhmm);
          setTime(parseTimeFromString(hhmm));
        }

        setIsRecurring(e.is_recurring);
        setIsActive(e.is_active);
      } catch (err) {
        console.log("Failed to load event", err);
        Alert.alert("Error", "Could not load event.");
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId, eventTitle, routeContactId]);

  // ---------- pickers ----------

  function onDateChange(evt: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
      setDateString(formatDate(selectedDate));
    }
  }

  function onTimeChange(evt: DateTimePickerEvent, selectedTime?: Date) {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      setTime(selectedTime);
      setTimeString(formatTime(selectedTime));
    }
  }

  function openDatePicker() {
    setShowDatePicker(true);
  }

  function openTimePicker() {
    setShowTimePicker(true);
  }

  // ---------- save ----------

  async function onSave() {
    if (!event) return;

    if (!dateString) {
      Alert.alert("Date required", "Please pick a date for this event.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Title required", "Please add a title.");
      return;
    }

    setSaving(true);
    try {
      await updateEvent(eventId, {
        title: title.trim(),
        type,
        date: dateString,
        time: timeString ? `${timeString}:00` : undefined,
        is_recurring: isRecurring,
        is_active: isActive,
        // ⚠️ usually you DON'T change contact on edit,
        // so we don't send it (backend keeps existing contact)
      });

      Alert.alert("Saved", "Event updated.");
      navigation.goBack();
    } catch (e: any) {
      console.log("Failed to update event", e);
      const detail = e?.response?.data?.detail;
      if (detail) {
        Alert.alert("Cannot update event", detail);
      } else {
        Alert.alert("Error", "Could not update event.");
      }
    } finally {
      setSaving(false);
    }
  }

  // ---------- loading states ----------

  if (loading) {
    return (
      <Screen scroll>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 8 }}>Loading event…</Text>
        </View>
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen scroll>
        <View style={styles.center}>
          <Text>Event not found.</Text>
        </View>
      </Screen>
    );
  }

  // ---------- UI ----------

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <Screen scroll>
        <View style={styles.container}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.card}>
              {/* Contact info */}
              <Text style={styles.sectionTitle}>Contact</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.contactPill}
                disabled
              >
                <Text style={styles.contactPillLabel}>For</Text>
                <Text style={styles.contactPillName} numberOfLines={1}>
                  {contactName}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Basic info */}
              <Text style={styles.sectionTitle}>Basic info</Text>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Event title</Text>
                </View>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Birthday party, First date, Coffee, etc."
                  style={styles.input}
                  autoCapitalize="sentences"
                  returnKeyType="done"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.typeRow}>
                  {EVENT_TYPE_OPTIONS.map((t) => {
                    const active = type === t.value;
                    return (
                      <TouchableOpacity
                        key={t.value}
                        style={[
                          styles.typeChip,
                          active && styles.typeChipActive,
                        ]}
                        onPress={() => setType(t.value)}
                      >
                        <Text
                          style={[
                            styles.typeChipText,
                            active && styles.typeChipTextActive,
                          ]}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.divider} />

              {/* Date and time */}
              <Text style={styles.sectionTitle}>When</Text>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Date</Text>
                  <Text style={styles.labelHint}>Required</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={openDatePicker}
                  style={[styles.input, styles.dateInput]}
                >
                  <Text
                    style={
                      dateString ? styles.dateText : styles.datePlaceholder
                    }
                  >
                    {dateString || "Pick a date"}
                  </Text>
                  <Text style={styles.dateIcon}>📅</Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={date || new Date()}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onDateChange}
                  />
                )}
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Time</Text>
                  <Text style={styles.optionalTag}>Optional</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={openTimePicker}
                  style={[styles.input, styles.dateInput]}
                >
                  <Text
                    style={
                      timeString ? styles.dateText : styles.datePlaceholder
                    }
                  >
                    {timeString || "No specific time"}
                  </Text>
                  <Text style={styles.dateIcon}>⏰</Text>
                </TouchableOpacity>

                {showTimePicker && (
                  <DateTimePicker
                    value={time || new Date()}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onTimeChange}
                  />
                )}
              </View>

              {/* Recurrence */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Repeat</Text>
                <View style={styles.repeatRow}>
                  <TouchableOpacity
                    style={[
                      styles.repeatChip,
                      isRecurring && styles.repeatChipActive,
                    ]}
                    onPress={() => setIsRecurring(true)}
                  >
                    <Text
                      style={[
                        styles.repeatChipText,
                        isRecurring && styles.repeatChipTextActive,
                      ]}
                    >
                      Every year
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.repeatChip,
                      !isRecurring && styles.repeatChipActive,
                    ]}
                    onPress={() => setIsRecurring(false)}
                  >
                    <Text
                      style={[
                        styles.repeatChipText,
                        !isRecurring && styles.repeatChipTextActive,
                      ]}
                    >
                      One-time only
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Status */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.repeatRow}>
                  <TouchableOpacity
                    style={[
                      styles.repeatChip,
                      isActive && styles.repeatChipActive,
                    ]}
                    onPress={() => setIsActive(true)}
                  >
                    <Text
                      style={[
                        styles.repeatChipText,
                        isActive && styles.repeatChipTextActive,
                      ]}
                    >
                      Active
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.repeatChip,
                      !isActive && styles.repeatChipActive,
                    ]}
                    onPress={() => setIsActive(false)}
                  >
                    <Text
                      style={[
                        styles.repeatChipText,
                        !isActive && styles.repeatChipTextActive,
                      ]}
                    >
                      Paused
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.goBack()}
                disabled={saving}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  saving && styles.primaryButtonDisabled,
                ]}
                onPress={onSave}
                disabled={saving}
              >
                <Text style={styles.primaryButtonText}>
                  {saving ? "Saving..." : "Save changes"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

// ---------- styles (same style language as AddEvent) ----------

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  card: {
    backgroundColor: "#fafafa",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  labelHint: {
    fontSize: 11,
    color: "#999",
  },
  optionalTag: {
    fontSize: 11,
    color: "#777",
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#fff",
    fontSize: 14,
  },
  contactPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#f1f1f1",
  },
  contactPillLabel: {
    fontSize: 12,
    color: "#666",
    marginRight: 6,
  },
  contactPillName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flexShrink: 1,
  },
  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },
  typeChipActive: {
    backgroundColor: "#007AFF",
  },
  typeChipText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  typeChipTextActive: {
    color: "#fff",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: {
    fontSize: 14,
    color: "#333",
  },
  datePlaceholder: {
    fontSize: 14,
    color: "#999",
  },
  dateIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  repeatRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  repeatChip: {
    flex: 1,
    marginRight: 6,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#eee",
    alignItems: "center",
  },
  repeatChipActive: {
    backgroundColor: "#007AFF",
  },
  repeatChipText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  repeatChipTextActive: {
    color: "#fff",
  },
  actionsRow: {
    flexDirection: "row",
    marginTop: 18,
  },
  secondaryButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#333",
  },
  primaryButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#007AFF",
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
