import React, { useState, useRef } from "react";
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
import { createContact } from "../../contacts/api";
import { Screen } from "../../components/Screen";

type Props = {
  navigation: any;
};

export default function AddContactScreen({ navigation }: Props) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [birthday, setBirthday] = useState(""); // "YYYY-MM-DD"
  const [birthdayDate, setBirthdayDate] = useState<Date | undefined>(undefined);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);

  function formatDate(d: Date) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function openBirthdayPicker() {
    setShowBirthdayPicker(true);
  }

  function onBirthdayChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") {
      setShowBirthdayPicker(false);
    }
    if (date) {
      setBirthdayDate(date);
      setBirthday(formatDate(date));
    }
  }

  async function onSubmit() {
    if (!first.trim() || !last.trim()) {
      Alert.alert("Name required", "Please enter first and last name.");
      return;
    }
    setSaving(true);
    try {
      await createContact({
        first_name: first.trim(),
        last_name: last.trim(),
        birthday: birthday ? birthday : undefined,
        email: email || undefined,
        phone: phone || undefined,
        notes: notes || undefined,
      });
      Alert.alert("Success", "Contact created.");
      navigation.goBack();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (detail) {
        Alert.alert("Cannot add contact", detail);
      } else {
        Alert.alert("Error", "Failed to create contact.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0} // tweak if you have a header
    >
      <Screen scroll>

      <View style={styles.container}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            {/* Name section */}
            <Text style={styles.sectionTitle}>Basic info</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                value={first}
                onChangeText={setFirst}
                placeholder="Jane"
                style={styles.input}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                value={last}
                onChangeText={setLast}
                placeholder="Doe"
                style={styles.input}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            <View style={styles.divider} />

            {/* Extra details */}
            <Text style={styles.sectionTitle}>Details</Text>

            {/* Birthday with date picker */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Birthday</Text>
                <Text style={styles.labelHint}>Tap to pick a date</Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={openBirthdayPicker}
                style={[styles.input, styles.dateInput]}
              >
                <Text
                  style={birthday ? styles.dateText : styles.datePlaceholder}
                  >
                  {birthday || "1990-07-21"}
                </Text>
                <Text style={styles.dateIcon}>📅</Text>
              </TouchableOpacity>

              {showBirthdayPicker && (
                <DateTimePicker
                  value={birthdayDate || new Date(1990, 0, 1)}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onBirthdayChange}
                  maximumDate={new Date()}
                />
              )}
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.optionalTag}>Optional</Text>
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
                />
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Phone</Text>
                <Text style={styles.optionalTag}>Optional</Text>
              </View>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+33 6 12 34 56 78"
                keyboardType="phone-pad"
                style={styles.input}
                />
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Notes</Text>
                <Text style={styles.optionalTag}>Optional</Text>
              </View>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Something to remember about this contact..."
                autoCapitalize="sentences"
                style={[styles.input, styles.notesInput]}
                multiline
                textAlignVertical="top"
                onFocus={() => {
                  // small delay so keyboard opens then we scroll
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }, 150);
                }}
              />
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
  </Screen>
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
    paddingBottom: 80, // extra space so last field is above keyboard
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
  notesInput: {
    minHeight: 80,
    paddingTop: 8,
    paddingBottom: 8,
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
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
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
