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
  Image,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";

import { createContact } from "../../contacts/api";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";

type Props = {
  navigation: any;
};

export default function AddContactScreen({ navigation }: Props) {
  const { settings } = useAppearance();

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [birthday, setBirthday] = useState(""); // "YYYY-MM-DD"
  const [birthdayDate, setBirthdayDate] = useState<Date | undefined>(undefined);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // 🔥 new: local image URI
  const [photoUri, setPhotoUri] = useState<string | null>(null);

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

  // 🔥 pick a photo from gallery
  async function pickPhoto() {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow photo access to pick a picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri);
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
        // 🔥 send to API (make sure createContact handles photo_uri → multipart)
        photo_uri: photoUri || undefined,
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
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <Screen scroll>
        <View style={styles.container}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[
                styles.card,
                { backgroundColor: settings.cardColor },
              ]}
            >
              {/* Photo */}
              <Text
                style={[
                  styles.sectionTitle,
                  { color: settings.titleColor },
                ]}
              >
                Photo
              </Text>

              <View style={styles.photoRow}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photo} />
                ) : (
                  <View
                    style={[
                      styles.photoPlaceholder,
                      { backgroundColor: settings.cardColor },
                    ]}
                  >
                    <Text style={{ color: settings.textColor + "80" }}>
                      No photo
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.photoButton,
                    { backgroundColor: settings.buttonColor },
                  ]}
                  onPress={pickPhoto}
                >
                  <Text
                    style={[
                      styles.photoButtonText,
                      { color: settings.buttonTextColor },
                    ]}
                  >
                    {photoUri ? "Change photo" : "Add photo"}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Name section */}
              <Text
                style={[
                  styles.sectionTitle,
                  { color: settings.titleColor },
                ]}
              >
                Basic info
              </Text>

              <View style={styles.fieldGroup}>
                <Text
                  style={[
                    styles.label,
                    { color: settings.titleColor },
                  ]}
                >
                  First name
                </Text>
                <TextInput
                  value={first}
                  onChangeText={setFirst}
                  placeholder="Jane"
                  placeholderTextColor="#9CA3AF"
                  style={[
                    styles.input,
                    { color: settings.textColor },
                  ]}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text
                  style={[
                    styles.label,
                    { color: settings.titleColor },
                  ]}
                >
                  Last name
                </Text>
                <TextInput
                  value={last}
                  onChangeText={setLast}
                  placeholder="Doe"
                  placeholderTextColor="#9CA3AF"
                  style={[
                    styles.input,
                    { color: settings.textColor },
                  ]}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.divider} />

              {/* Extra details */}
              <Text
                style={[
                  styles.sectionTitle,
                  { color: settings.titleColor },
                ]}
              >
                Details
              </Text>

              {/* Birthday with date picker */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text
                    style={[
                      styles.label,
                      { color: settings.titleColor },
                    ]}
                  >
                    Birthday
                  </Text>
                  <Text style={styles.labelHint}>Tap to pick a date</Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={openBirthdayPicker}
                  style={[styles.input, styles.dateInput]}
                >
                  <Text
                    style={
                      birthday ? styles.dateText : styles.datePlaceholder
                    }
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
                  <Text
                    style={[
                      styles.label,
                      { color: settings.titleColor },
                    ]}
                  >
                    Email
                  </Text>
                  <Text style={styles.optionalTag}>Optional</Text>
                </View>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@example.com"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[
                    styles.input,
                    { color: settings.textColor },
                  ]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text
                    style={[
                      styles.label,
                      { color: settings.titleColor },
                    ]}
                  >
                    Phone
                  </Text>
                  <Text style={styles.optionalTag}>Optional</Text>
                </View>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+33 6 12 34 56 78"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  style={[
                    styles.input,
                    { color: settings.textColor },
                  ]}
                />
              </View>

              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text
                    style={[
                      styles.label,
                      { color: settings.titleColor },
                    ]}
                  >
                    Notes
                  </Text>
                  <Text style={styles.optionalTag}>Optional</Text>
                </View>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Something to remember about this contact..."
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="sentences"
                  style={[
                    styles.input,
                    styles.notesInput,
                    { color: settings.textColor },
                  ]}
                  multiline
                  textAlignVertical="top"
                  onFocus={() => {
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
    borderColor: "#eee",
  },

  // 🔥 photo UI
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  photoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  photoButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
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
