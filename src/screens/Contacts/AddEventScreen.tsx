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

type Props = {
  navigation: any;
  route: {
    params?: {
      contactId?: number;
      contactName?: string;
    };
  };
};

export default function AddEventScreen({ navigation, route }: Props) {
  const contactId = route?.params?.contactId;
  const contactName = route?.params?.contactName || "Selected contact";

  const [title, setTitle] = useState("");
  const [type, setType] = useState<1 | 2 | 3>(1); // 1=birthday, 2=anniversary, 3=other

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

    setSaving(true);
    try {
      await createEvent({
        contact: contactId,
        title: title.trim() || undefined,
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
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            {/* Contact info */}
            <Text style={styles.sectionTitle}>Contact</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.contactPill}
              // if later you add "Select contact" screen, you can navigate here
              // onPress={() => navigation.navigate("SelectContact")}
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
                <Text style={styles.optionalTag}>Optional</Text>
              </View>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Birthday party, Dinner, etc."
                style={styles.input}
                autoCapitalize="sentences"
                returnKeyType="done"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.typeRow}>
                {[
                  { label: "🎂 Birthday", value: 1 as 1 },
                  { label: "💍 Anniversary", value: 2 as 2 },
                  { label: "🎉 Other", value: 3 as 3 },
                ].map((t) => {
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
              onPress={onSubmit}
              disabled={saving}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
    justifyContent: "space-between",
  },
  typeChip: {
    flex: 1,
    marginRight: 6,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#eee",
    alignItems: "center",
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
    justifyContent: "space-between",
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
