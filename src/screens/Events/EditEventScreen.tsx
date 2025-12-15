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
import { useAppearance } from "../../appearance/AppearanceContext";

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
  const { settings } = useAppearance();

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
        // contact left unchanged
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
          <ActivityIndicator color={settings.primaryColor} />
          <Text style={{ marginTop: 8, color: settings.textColor }}>
            Loading event…
          </Text>
        </View>
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen scroll>
        <View style={styles.center}>
          <Text style={{ color: settings.textColor }}>Event not found.</Text>
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
            <View
              style={[
                styles.card,
                {
                  backgroundColor: settings.cardColor,
                  borderColor: settings.cardColor + "40",
                },
              ]}
            >
              {/* Contact info */}
              <Text
                style={[
                  styles.sectionTitle,
                  { color: settings.titleColor },
                ]}
              >
                Contact
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.contactPill,
                  { backgroundColor: settings.backgroundColor },
                ]}
                disabled
              >
                <Text
                  style={[
                    styles.contactPillLabel,
                    { color: settings.textColor + "AA" },
                  ]}
                >
                  For
                </Text>
                <Text
                  style={[
                    styles.contactPillName,
                    { color: settings.titleColor },
                  ]}
                  numberOfLines={1}
                >
                  {contactName}
                </Text>
              </TouchableOpacity>

              <View
                style={[
                  styles.divider,
                  { backgroundColor: settings.cardColor + "40" },
                ]}
              />

              {/* Basic info */}
              <Text
                style={[
                  styles.sectionTitle,
                  { color: settings.titleColor },
                ]}
              >
                Basic info
              </Text>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text
                    style={[
                      styles.label,
                      { color: settings.titleColor },
                    ]}
                  >
                    Event title
                  </Text>
                </View>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Birthday party, First date, Coffee, etc."
                  style={[
                    styles.input,
                    {
                      backgroundColor: settings.cardColor,
                      borderColor: settings.cardColor + "60",
                      color: settings.textColor,
                    },
                  ]}
                  placeholderTextColor={settings.textColor + "66"}
                  autoCapitalize="sentences"
                  returnKeyType="done"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text
                  style={[
                    styles.label,
                    { color: settings.titleColor },
                  ]}
                >
                  Type
                </Text>
                <View style={styles.typeRow}>
                  {EVENT_TYPE_OPTIONS.map((t) => {
                    const active = type === t.value;
                    return (
                      <TouchableOpacity
                        key={t.value}
                        style={[
                          styles.typeChip,
                          {
                            backgroundColor: active
                              ? settings.buttonColor
                              : settings.backgroundColor,
                          },
                        ]}
                        onPress={() => setType(t.value)}
                      >
                        <Text
                          style={[
                            styles.typeChipText,
                            {
                              color: active
                                ? settings.buttonTextColor
                                : settings.textColor,
                            },
                          ]}
                        >
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View
                style={[
                  styles.divider,
                  { backgroundColor: settings.cardColor + "40" },
                ]}
              />

              {/* Date and time */}
              <Text
                style={[
                  styles.sectionTitle,
                  { color: settings.titleColor },
                ]}
              >
                When
              </Text>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text
                    style={[
                      styles.label,
                      { color: settings.titleColor },
                    ]}
                  >
                    Date
                  </Text>
                  <Text
                    style={[
                      styles.labelHint,
                      { color: settings.textColor + "99" },
                    ]}
                  >
                    Required
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={openDatePicker}
                  style={[
                    styles.input,
                    styles.dateInput,
                    {
                      backgroundColor: settings.cardColor,
                      borderColor: settings.cardColor + "60",
                    },
                  ]}
                >
                  <Text
                    style={
                      dateString
                        ? [styles.dateText, { color: settings.textColor }]
                        : [
                            styles.datePlaceholder,
                            { color: settings.textColor + "66" },
                          ]
                    }
                  >
                    {dateString || "Pick a date"}
                  </Text>
                  <Text style={[styles.dateIcon, { color: settings.textColor }]}>
                    📅
                  </Text>
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
                  <Text
                    style={[
                      styles.label,
                      { color: settings.titleColor },
                    ]}
                  >
                    Time
                  </Text>
                  <Text
                    style={[
                      styles.optionalTag,
                      { color: settings.textColor + "99" },
                    ]}
                  >
                    Optional
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={openTimePicker}
                  style={[
                    styles.input,
                    styles.dateInput,
                    {
                      backgroundColor: settings.cardColor,
                      borderColor: settings.cardColor + "60",
                    },
                  ]}
                >
                  <Text
                    style={
                      timeString
                        ? [styles.dateText, { color: settings.textColor }]
                        : [
                            styles.datePlaceholder,
                            { color: settings.textColor + "66" },
                          ]
                    }
                  >
                    {timeString || "No specific time"}
                  </Text>
                  <Text style={[styles.dateIcon, { color: settings.textColor }]}>
                    ⏰
                  </Text>
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
                <Text
                  style={[
                    styles.label,
                    { color: settings.titleColor },
                  ]}
                >
                  Repeat
                </Text>
                <View style={styles.repeatRow}>
                  <TouchableOpacity
                    style={[
                      styles.repeatChip,
                      {
                        backgroundColor: isRecurring
                          ? settings.buttonColor
                          : settings.backgroundColor,
                        marginRight: 6,
                      },
                    ]}
                    onPress={() => setIsRecurring(true)}
                  >
                    <Text
                      style={[
                        styles.repeatChipText,
                        {
                          color: isRecurring
                            ? settings.buttonTextColor
                            : settings.textColor,
                        },
                      ]}
                    >
                      Every year
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.repeatChip,
                      {
                        backgroundColor: !isRecurring
                          ? settings.buttonColor
                          : settings.backgroundColor,
                        marginRight: 0,
                      },
                    ]}
                    onPress={() => setIsRecurring(false)}
                  >
                    <Text
                      style={[
                        styles.repeatChipText,
                        {
                          color: !isRecurring
                            ? settings.buttonTextColor
                            : settings.textColor,
                        },
                      ]}
                    >
                      One-time only
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Status */}
              <View style={styles.fieldGroup}>
                <Text
                  style={[
                    styles.label,
                    { color: settings.titleColor },
                  ]}
                >
                  Status
                </Text>
                <View style={styles.repeatRow}>
                  <TouchableOpacity
                    style={[
                      styles.repeatChip,
                      {
                        backgroundColor: isActive
                          ? settings.buttonColor
                          : settings.backgroundColor,
                        marginRight: 6,
                      },
                    ]}
                    onPress={() => setIsActive(true)}
                  >
                    <Text
                      style={[
                        styles.repeatChipText,
                        {
                          color: isActive
                            ? settings.buttonTextColor
                            : settings.textColor,
                        },
                      ]}
                    >
                      Active
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.repeatChip,
                      {
                        backgroundColor: !isActive
                          ? settings.buttonColor
                          : settings.backgroundColor,
                        marginRight: 0,
                      },
                    ]}
                    onPress={() => setIsActive(false)}
                  >
                    <Text
                      style={[
                        styles.repeatChipText,
                        {
                          color: !isActive
                            ? settings.buttonTextColor
                            : settings.textColor,
                        },
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
                style={[
                  styles.secondaryButton,
                  { borderColor: settings.cardColor + "60" },
                ]}
                onPress={() => navigation.goBack()}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    { color: settings.textColor },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: settings.buttonColor,
                    opacity: saving ? 0.6 : 1,
                  },
                ]}
                onPress={onSave}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: settings.buttonTextColor },
                  ]}
                >
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

// ---------- styles (structure only, colors overridden with settings) ----------

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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  divider: {
    height: 1,
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
    marginBottom: 4,
  },
  labelHint: {
    fontSize: 11,
  },
  optionalTag: {
    fontSize: 11,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  contactPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  contactPillLabel: {
    fontSize: 12,
    marginRight: 6,
  },
  contactPillName: {
    fontSize: 14,
    fontWeight: "600",
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
    alignItems: "center",
    justifyContent: "center",
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: {
    fontSize: 14,
  },
  datePlaceholder: {
    fontSize: 14,
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
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
  },
  repeatChipText: {
    fontSize: 13,
    fontWeight: "500",
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
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  primaryButton: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
