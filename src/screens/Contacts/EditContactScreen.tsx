// src/screens/contacts/EditContactScreen.tsx
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ContactsStackParamList } from "../../navigation/ContactsStack";
import { useEffect, useRef, useState } from "react";
import { CreateContactInput } from "../../contacts/types";
import { fetchContactById, updateContact } from "../../contacts/api";
import {
  ActivityIndicator,
  Alert,
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { formatDateEU } from "../../lib/date";

type Props = NativeStackScreenProps<ContactsStackParamList, "EditContact">;

export default function EditContactScreen({ route, navigation }: Props) {
  const { contactId } = route.params;
  const { settings } = useAppearance();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contact, setContact] = useState<CreateContactInput | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [birthdayDateObj, setBirthdayDateObj] = useState(new Date());
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // 🔹 photo state
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [originalPhotoUri, setOriginalPhotoUri] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const c = await fetchContactById(contactId);
        setContact(c as any);

        setFirstName(c.first_name || "");
        setLastName(c.last_name || "");
        setBirthday(c.birthday || "");
        if (c.birthday) {
          setBirthdayDateObj(new Date(c.birthday));
        }
        setEmail(c.email || "");
        setPhone(c.phone || "");
        setNotes(c.notes || "");

        // current photo URL from backend
        setPhotoUri(c.photo || null);
        setOriginalPhotoUri(c.photo || null);
      } catch {
        Alert.alert("Error", "Could not load Contact");
      } finally {
        setLoading(false);
      }
    })();
  }, [contactId]);

  function onDateChange(_: any, selectedDate?: Date) {
    if (!selectedDate) {
      setShowDatePicker(false);
      return;
    }
    setShowDatePicker(false);
    setBirthdayDateObj(selectedDate);
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    setBirthday(`${y}-${m}-${d}`);
  }

  // ---------- photo pick / remove ----------
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
      mediaTypes: ['images'], 
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotoUri(result.assets[0].uri); // local file:// uri
    }
  }

  function removePhoto() {
    setPhotoUri(null);
  }

  async function onSave() {
    setError(null);
    if (!birthday.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setError("Birthday date must be in YYYY-MM-DD format.");
      return;
    }
    if (!firstName || !firstName.trim()) {
      setError("FirstName Required.");
      return;
    }

    setSaving(true);
    try {
      await updateContact(contactId, {
        first_name: firstName,
        last_name: lastName,
        birthday,
        email,
        phone,
        notes,
        // 👇 send our current choice to the API layer
        // - undefined   → don't touch photo
        // - null        → remove photo
        // - file:// uri → upload new one
        photo_uri:
          photoUri === originalPhotoUri
            ? undefined
            : photoUri === null
            ? null
            : photoUri,
      });

      navigation.goBack();
    } catch {
      Alert.alert("Error", "Could not update Contact");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !contact) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={settings.primaryColor} />
          <Text style={{ marginTop: 8, color: settings.textColor }}>
            Loading...
          </Text>
        </View>
      </Screen>
    );
  }

  const initials = `${(firstName || (contact as any).first_name || "")
    .charAt(0)
    .toUpperCase()}${(lastName || (contact as any).last_name || "")
    .charAt(0)
    .toUpperCase()}`;

  return (
    <Screen scroll>
      <View style={{ flex: 1 }}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.page}>
          {/* HEADER */}
          <View
            style={[
              styles.headerCard,
              {
                backgroundColor: settings.cardColor,
                borderColor: settings.primaryColor + "40",
              },
            ]}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatarPlaceholder,
                  { backgroundColor: settings.primaryColor + "22" },
                ]}
              >
                <Text
                  style={[
                    styles.avatarInitials,
                    { color: settings.primaryColor },
                  ]}
                >
                  {initials || "?"}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.photoButton,
                { borderColor: settings.primaryColor + "80" },
              ]}
              onPress={pickPhoto}
            >
              <Text
                style={[
                  styles.photoButtonText,
                  { color: settings.primaryColor },
                ]}
              >
                {photoUri ? "Change photo" : "Add photo"}
              </Text>
            </TouchableOpacity>

            {photoUri && (
              <TouchableOpacity onPress={removePhoto}>
                <Text style={styles.removePhotoText}>Remove photo</Text>
              </TouchableOpacity>
            )}

            <Text
              style={[
                styles.headerContact,
                { color: settings.primaryColor },
              ]}
            >
              {(contact as any).first_name} {(contact as any).last_name}
            </Text>
          </View>

          {/* FORM CARD */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: settings.cardColor,
                borderColor: settings.cardColor + "40",
              },
            ]}
          >
            <View style={styles.field}>
              <Text
                style={[styles.label, { color: settings.titleColor }]}
              >
                First Name
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: settings.cardColor,
                    borderColor: settings.cardColor + "60",
                    color: settings.textColor,
                  },
                ]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Contact Name"
                placeholderTextColor={settings.textColor + "66"}
              />
            </View>

            <View style={styles.field}>
              <Text
                style={[styles.label, { color: settings.titleColor }]}
              >
                Last Name
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: settings.cardColor,
                    borderColor: settings.cardColor + "60",
                    color: settings.textColor,
                  },
                ]}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter contact last name"
                placeholderTextColor={settings.textColor + "66"}
              />
            </View>

            <View style={styles.field}>
              <Text
                style={[styles.label, { color: settings.titleColor }]}
              >
                Birthday
              </Text>
              <TouchableOpacity
                style={[
                  styles.dateButton,
                  {
                    borderColor: settings.primaryColor + "60",
                    backgroundColor: settings.primaryColor + "15",
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text
                  style={[
                    styles.dateButtonText,
                    { color: settings.primaryColor },
                  ]}
                >
                  {formatDateEU(birthday) || "Pick a date"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text
                style={[styles.label, { color: settings.titleColor }]}
              >
                Email
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: settings.cardColor,
                    borderColor: settings.cardColor + "60",
                    color: settings.textColor,
                  },
                ]}
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor={settings.textColor + "66"}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.field}>
              <Text
                style={[styles.label, { color: settings.titleColor }]}
              >
                Phone
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: settings.cardColor,
                    borderColor: settings.cardColor + "60",
                    color: settings.textColor,
                  },
                ]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+33 6 12 34 56 78"
                placeholderTextColor={settings.textColor + "66"}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.field}>
              <Text
                style={[styles.label, { color: settings.titleColor }]}
              >
                Notes
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: settings.cardColor,
                    borderColor: settings.cardColor + "60",
                    color: settings.textColor,
                    textAlignVertical: "top",
                  },
                ]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Anything to add"
                placeholderTextColor={settings.textColor + "66"}
                autoCapitalize="sentences"
                multiline
                onFocus={() => {
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }, 150);
                }}
              />
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: settings.buttonColor },
                saving && { opacity: 0.6 },
              ]}
              onPress={onSave}
              disabled={saving}
            >
              <Text
                style={[
                  styles.saveButtonText,
                  { color: settings.buttonTextColor },
                ]}
              >
                {saving ? "Saving.." : "Save Changes"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text
                style={[
                  styles.cancelText,
                  { color: settings.textColor },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {showDatePicker && (
          <DateTimePicker
            mode="date"
            value={birthdayDateObj}
            onChange={onDateChange}
            display={Platform.OS === "ios" ? "spinner" : "default"}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 18,
    gap: 22,
    paddingBottom: 30,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
  },
  headerContact: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "800",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
  field: {
    gap: 4,
  },
  dateButton: {
    marginTop: 2,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dateButtonText: {
    fontWeight: "800",
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: {
    color: "#B91C1C",
    fontWeight: "600",
  },
  saveButton: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonText: {
    fontWeight: "700",
    fontSize: 17,
  },
  cancelText: {
    marginTop: 8,
    textAlign: "center",
  },

  // avatar / photo
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    marginBottom: 8,
  },
  avatarPlaceholder: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: "700",
  },
  photoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 2,
  },
  photoButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  removePhotoText: {
    fontSize: 12,
    color: "#B91C1C",
    marginTop: 2,
  },
});
