// src/screens/events/AddEventScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { createEvent } from "../../events/api";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";

type Props = {
  navigation: any;
  route: {
    params?: {
      contactId?: number;
      contactName?: string;
    };
  };
};

// Keep this in sync with your Django EventTypes IntEnum
type EventTypeValue = 1 | 2 | 3 | 4 | 5 | 6;

const EVENT_TYPE_OPTIONS: { label: string; value: EventTypeValue }[] = [
  { label: "🎂 Birthday", value: 1 },
  { label: "💍 Anniversary", value: 2 },
  { label: "⭐ Important date", value: 3 },
  { label: "🤝 Meeting", value: 4 },
  { label: "🏝 Holiday", value: 5 },
  { label: "✨ Other", value: 6 },
];

export default function AddEventScreen({ navigation, route }: Props) {
  const { settings } = useAppearance();

  const contactId = route?.params?.contactId;
  const contactName = route?.params?.contactName || "Selected contact";

  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventTypeValue>(1); // default: Birthday

  const [dateString, setDateString] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [timeString, setTimeString] = useState("");
  const [time, setTime] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [isRecurring, setIsRecurring] = useState(true);
  const [saving, setSaving] = useState(false);

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

  function openDatePicker() {
    setShowDatePicker(true);
  }

  function openTimePicker() {
    setShowTimePicker(true);
  }

  function onDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
      setDateString(formatDate(selectedDate));
    }
  }

  function onTimeChange(event: DateTimePickerEvent, selectedTime?: Date) {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      setTime(selectedTime);
      setTimeString(formatTime(selectedTime));
    }
  }

  async function onSubmit() {
    if (!contactId) {
      Alert.alert("No contact", "A contact is required to create an event.");
      return;
    }
    if (!dateString) {
      Alert.alert("Date required", "Please pick a date for this event.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("No Title", "Please add a title.");
      return;
    }

    setSaving(true);
    try {
      await createEvent({
        contact: contactId,
        title: title.trim(),
        type,
        date: dateString,
        time: timeString ? `${timeString}:00` : undefined,
        is_recurring: isRecurring,
      });

      Alert.alert("Success", "Event created.");
      navigation.goBack();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (detail) {
        Alert.alert("Cannot add event", detail);
      } else {
        Alert.alert("Error", "Failed to create event.");
      }
    } finally {
      setSaving(false);
    }
  }

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
                  { backgroundColor: settings.cardColor },
                ]}
              >
                <Text
                  style={[
                    styles.contactPillLabel,
                    { color: settings.textColor },
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
                    style={[styles.label, { color: settings.textColor }]}
                  >
                    Event title
                  </Text>
                </View>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Birthday party, First date, Coffee, etc."
                  placeholderTextColor={settings.textColor + "66"}
                  style={[
                    styles.input,
                    {
                      backgroundColor: settings.cardColor,
                      borderColor: settings.cardColor + "60",
                      color: settings.textColor,
                    },
                  ]}
                  autoCapitalize="sentences"
                  returnKeyType="done"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text
                  style={[styles.label, { color: settings.textColor }]}
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
                              ? settings.primaryColor
                              : settings.cardColor,
                            borderColor: active
                              ? settings.primaryColor
                              : settings.cardColor + "40",
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
                    style={[styles.label, { color: settings.textColor }]}
                  >
                    Date
                  </Text>
                  <Text
                    style={[
                      styles.labelHint,
                      { color: settings.textColor + "80" },
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
                  <Text
                    style={[
                      styles.dateIcon,
                      { color: settings.textColor },
                    ]}
                  >
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
                    style={[styles.label, { color: settings.textColor }]}
                  >
                    Time
                  </Text>
                  <Text
                    style={[
                      styles.optionalTag,
                      { color: settings.textColor + "80" },
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
                  <Text
                    style={[
                      styles.dateIcon,
                      { color: settings.textColor },
                    ]}
                  >
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
                  style={[styles.label, { color: settings.textColor }]}
                >
                  Repeat
                </Text>
                <View style={styles.repeatRow}>
                  <TouchableOpacity
                    style={[
                      styles.repeatChip,
                      {
                        backgroundColor: isRecurring
                          ? settings.primaryColor
                          : settings.cardColor,
                        borderColor: isRecurring
                          ? settings.primaryColor
                          : settings.cardColor + "40",
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
                          ? settings.primaryColor
                          : settings.cardColor,
                        borderColor: !isRecurring
                          ? settings.primaryColor
                          : settings.cardColor + "40",
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
            </View>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  {
                    borderColor: settings.textColor + "33",
                  },
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
                  { backgroundColor: settings.buttonColor },
                  saving && styles.primaryButtonDisabled,
                ]}
                onPress={onSubmit}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: settings.buttonTextColor },
                  ]}
                >
                  {saving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
    borderWidth: 1,
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
    marginRight: 6,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
  },
  repeatChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
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
