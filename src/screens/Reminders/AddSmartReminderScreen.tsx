// src/screens/Reminders/AddSmartReminderScreen.tsx
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { AppId, Contact } from "../../contacts/types";
import { fetchContactById, fetchContacts } from "../../contacts/repository";
import {
  createCustomDateSmartReminder,
  createRelativeSmartReminder,
} from "../../reminders/smartReminderRepository";

type Props = {
  navigation: any;
  route: {
    params?: {
      contactId?: AppId;
      contactName?: string;
      note?: string;
    };
  };
};

type TimingMode = "relative" | "custom_date";

type SmartReminderColors = {
  background: string;
  card: string;
  title: string;
  text: string;
  primary: string;
  button: string;
  buttonText: string;
  border: string;
  muted: string;
  softCard: string;
  softPrimary: string;
  danger: string;
  warning: string;
  success: string;
  shadow: string;
};

const QUICK_DAY_OPTIONS = [
  { label: "Tomorrow", days: 1 },
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
];

export default function AddSmartReminderScreen({ route, navigation }: Props) {
  const { settings } = useAppearance();
  const colors = useMemo(() => makeSmartReminderColors(settings), [settings]);

  const initialContactId = route.params?.contactId;
  const initialContactName = route.params?.contactName;
  const initialNote = route.params?.note;

  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(
    null
  );

  const [contactSearch, setContactSearch] = React.useState("");
  const [message, setMessage] = React.useState(initialNote ?? "");

  const [timingMode, setTimingMode] = React.useState<TimingMode>("relative");
  const [selectedDays, setSelectedDays] = React.useState(14);

  const [customDate, setCustomDate] = React.useState<Date>(todayStart());
  const [timeDate, setTimeDate] = React.useState<Date>(defaultTimeDate());

  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [showTimePicker, setShowTimePicker] = React.useState(false);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    navigation.setOptions?.({
      headerShown: false,
    });
  }, [navigation]);

  React.useEffect(() => {
    load();
  }, []);

  React.useEffect(() => {
    if (initialNote) {
      setMessage(initialNote);
    }
  }, [initialNote]);

  const filteredContacts = useMemo(() => {
    const query = contactSearch.trim().toLowerCase();

    if (!query) {
      return contacts.slice(0, 8);
    }

    return contacts
      .filter((contact) => {
        const name = fullName(contact).toLowerCase();
        const phone = contact.phone?.toLowerCase() ?? "";
        const email = contact.email?.toLowerCase() ?? "";
        const group = contact.group_detail?.name?.toLowerCase() ?? "";

        return (
          name.includes(query) ||
          phone.includes(query) ||
          email.includes(query) ||
          group.includes(query)
        );
      })
      .slice(0, 12);
  }, [contacts, contactSearch]);

  async function load() {
    try {
      setLoading(true);

      if (initialContactId) {
        const contact = await fetchContactById(initialContactId);

        setSelectedContact(contact);
        setContacts([contact]);

        return;
      }

      const response = await fetchContacts({ page: 1 });
      const loadedContacts = normalizeContactsResponse(response);

      setContacts(loadedContacts);

      if (loadedContacts[0]) {
        setSelectedContact(loadedContacts[0]);
      }
    } catch (error) {
      console.log("Load smart reminder data failed", error);
      Alert.alert("Smart reminder", "Could not load contacts.");
    } finally {
      setLoading(false);
    }
  }

  function selectedContactName() {
    return fullName(selectedContact) || initialContactName || "Select contact";
  }

  function previewText() {
    const person = selectedContactName();
    const time = formatTimeForUser(timeDate);

    if (timingMode === "custom_date") {
      return `${person} · ${formatDateForUser(customDate)} at ${time}`;
    }

    if (selectedDays === 1) {
      return `${person} · Tomorrow at ${time}`;
    }

    return `${person} · In ${selectedDays} days at ${time}`;
  }

  function onDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (event.type === "dismissed" || !selectedDate) return;

    setCustomDate(startOfDay(selectedDate));
  }

  function onTimeChange(event: DateTimePickerEvent, selectedTime?: Date) {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }

    if (event.type === "dismissed" || !selectedTime) return;

    setTimeDate(selectedTime);
  }

  async function onSave() {
    if (saving) return;

    if (!selectedContact) {
      Alert.alert("Smart reminder", "Please choose a contact.");
      return;
    }

    const text = message.trim();

    if (!text) {
      Alert.alert("Smart reminder", "Write what you want to remember.");
      return;
    }

    if (timingMode === "custom_date" && customDate < todayStart()) {
      Alert.alert("Smart reminder", "Please choose today or a future date.");
      return;
    }

    try {
      setSaving(true);

      if (timingMode === "relative") {
        await createRelativeSmartReminder({
          contactId: selectedContact.id,
          text,
          daysFromNow: selectedDays,
          timeOfDay: toTimeOfDay(timeDate),
        });
      } else {
        await createCustomDateSmartReminder({
          contactId: selectedContact.id,
          text,
          date: toYMD(customDate),
          timeOfDay: toTimeOfDay(timeDate),
        });
      }

      Alert.alert("Smart reminder", "Reminder created.", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.log("Create smart reminder failed", error);
      Alert.alert(
        "Smart reminder",
        error?.message || "Could not create reminder."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} />

          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading smart reminder…
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.keyboardRoot, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <Screen>
        <View style={[styles.root, { backgroundColor: colors.background }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <CompactHeader
              colors={colors}
              contactName={selectedContactName()}
              preview={previewText()}
              onBack={() => navigation.goBack()}
            />

            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  shadowColor: colors.shadow,
                },
              ]}
            >
              <SectionTitle
                icon="person-outline"
                title="Who is this for?"
                colors={colors}
              />

              {initialContactId ? (
                <SelectedContactBox
                  contact={selectedContact}
                  fallbackName={selectedContactName()}
                  colors={colors}
                />
              ) : (
                <>
                  <SearchBox
                    value={contactSearch}
                    colors={colors}
                    onChangeText={setContactSearch}
                  />

                  <View style={styles.contactResults}>
                    {filteredContacts.length === 0 ? (
                      <EmptyContactResult colors={colors} />
                    ) : (
                      filteredContacts.map((contact) => (
                        <ContactRow
                          key={String(contact.id)}
                          contact={contact}
                          selected={selectedContact?.id === contact.id}
                          colors={colors}
                          onPress={() => setSelectedContact(contact)}
                        />
                      ))
                    )}
                  </View>
                </>
              )}

              <Divider colors={colors} />

              <SectionTitle
                icon="chatbubble-ellipses-outline"
                title="Remind me to"
                colors={colors}
              />

              <ThemedInput
                value={message}
                onChangeText={setMessage}
                placeholder="Ask how the interview went"
                multiline
                textAlignVertical="top"
                style={styles.textArea}
                colors={colors}
              />

              <Divider colors={colors} />

              <SectionTitle
                icon="calendar-outline"
                title="Reminder date"
                colors={colors}
              />

              <View
                style={[
                  styles.segment,
                  { backgroundColor: colors.softCard },
                ]}
              >
                <SegmentButton
                  label="In a few days"
                  selected={timingMode === "relative"}
                  colors={colors}
                  onPress={() => setTimingMode("relative")}
                />

                <SegmentButton
                  label="Custom date"
                  selected={timingMode === "custom_date"}
                  colors={colors}
                  onPress={() => setTimingMode("custom_date")}
                />
              </View>

              {timingMode === "relative" ? (
                <View style={styles.optionRow}>
                  {QUICK_DAY_OPTIONS.map((option) => (
                    <OptionPill
                      key={option.days}
                      label={option.label}
                      active={selectedDays === option.days}
                      colors={colors}
                      onPress={() => setSelectedDays(option.days)}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.customDateBox}>
                  <FieldLabel label="Date" colors={colors} />

                  <PickerButton
                    icon="calendar-outline"
                    label="Selected date"
                    value={formatDateForUser(customDate)}
                    colors={colors}
                    onPress={() => {
                      setShowTimePicker(false);
                      setShowDatePicker(true);
                    }}
                  />

                  {showDatePicker ? (
                    <View style={styles.pickerWrap}>
                      <DateTimePicker
                        value={customDate}
                        mode="date"
                        minimumDate={todayStart()}
                        display={Platform.OS === "ios" ? "inline" : "default"}
                        onChange={onDateChange}
                      />

                      {Platform.OS === "ios" ? (
                        <PickerDoneButton
                          colors={colors}
                          onPress={() => setShowDatePicker(false)}
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              )}

              <View style={styles.timeSection}>
                <FieldLabel label="Time" colors={colors} />

                <PickerButton
                  icon="time-outline"
                  label="Reminder time"
                  value={formatTimeForUser(timeDate)}
                  colors={colors}
                  onPress={() => {
                    setShowDatePicker(false);
                    setShowTimePicker(true);
                  }}
                />

                {showTimePicker ? (
                  <View style={styles.pickerWrap}>
                    <DateTimePicker
                      value={timeDate}
                      mode="time"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={onTimeChange}
                    />

                    {Platform.OS === "ios" ? (
                      <PickerDoneButton
                        colors={colors}
                        onPress={() => setShowTimePicker(false)}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>

            <View
              style={[
                styles.previewCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  shadowColor: colors.shadow,
                },
              ]}
            >
              <View
                style={[
                  styles.previewIcon,
                  { backgroundColor: colors.softPrimary },
                ]}
              >
                <Ionicons
                  name="eye-outline"
                  size={18}
                  color={colors.primary}
                />
              </View>

              <View style={styles.previewTextWrap}>
                <Text style={[styles.previewLabel, { color: colors.text }]}>
                  Preview
                </Text>

                <Text
                  style={[styles.previewText, { color: colors.title }]}
                  numberOfLines={2}
                >
                  {previewText()}
                </Text>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => navigation.goBack()}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    { color: colors.text },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: colors.button },
                  saving && styles.saveButtonDisabled,
                ]}
                disabled={saving}
                onPress={onSave}
                activeOpacity={0.88}
              >
                {saving ? (
                  <ActivityIndicator color={colors.buttonText} />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={colors.buttonText}
                    />

                    <Text
                      style={[
                        styles.saveButtonText,
                        { color: colors.buttonText },
                      ]}
                    >
                      Create reminder
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function CompactHeader({
  colors,
  contactName,
  preview,
  onBack,
}: {
  colors: SmartReminderColors;
  contactName: string;
  preview: string;
  onBack: () => void;
}) {
  return (
    <LinearGradient
      colors={[colors.primary, colors.button] as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.compactHeader}
    >
      <View style={styles.headerGlowOne} />
      <View style={styles.headerGlowTwo} />

      <View style={styles.headerTopRow}>
        <TouchableOpacity
          style={styles.headerCircleButton}
          onPress={onBack}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-back" size={23} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerPill}>
          <Ionicons name="notifications-outline" size={14} color="#FFFFFF" />
          <Text style={styles.headerPillText}>Smart</Text>
        </View>
      </View>

      <View style={styles.headerMainRow}>
        <View style={styles.headerIconBubble}>
          <Ionicons name="sparkles-outline" size={24} color="#FFFFFF" />
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>SMART REMINDER</Text>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {contactName}
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={2}>
            {preview}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function SectionTitle({
  icon,
  title,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  colors: SmartReminderColors;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <View
        style={[
          styles.sectionIconBubble,
          { backgroundColor: colors.softPrimary },
        ]}
      >
        <Ionicons name={icon} size={15} color={colors.primary} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.title }]}>
        {title}
      </Text>
    </View>
  );
}

function SearchBox({
  value,
  colors,
  onChangeText,
}: {
  value: string;
  colors: SmartReminderColors;
  onChangeText: (value: string) => void;
}) {
  return (
    <View
      style={[
        styles.contactSearchBox,
        {
          borderColor: colors.border,
          backgroundColor: colors.softCard,
        },
      ]}
    >
      <Ionicons name="search-outline" size={18} color={colors.text} />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search by name, phone, email, group..."
        placeholderTextColor={colors.muted}
        style={[styles.contactSearchInput, { color: colors.title }]}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {value.length > 0 ? (
        <TouchableOpacity onPress={() => onChangeText("")} activeOpacity={0.8}>
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function SelectedContactBox({
  contact,
  fallbackName,
  colors,
}: {
  contact: Contact | null;
  fallbackName: string;
  colors: SmartReminderColors;
}) {
  return (
    <View
      style={[
        styles.selectedContactBox,
        {
          backgroundColor: colors.softCard,
          borderColor: colors.border,
        },
      ]}
    >
      {contact?.photo ? (
        <Image source={{ uri: contact.photo }} style={styles.selectedPhoto} />
      ) : (
        <View
          style={[
            styles.contactAvatar,
            { backgroundColor: colors.softPrimary },
          ]}
        >
          <Text style={[styles.contactAvatarText, { color: colors.primary }]}>
            {contactInitials(contact)}
          </Text>
        </View>
      )}

      <View style={styles.contactResultTextWrap}>
        <Text
          style={[styles.contactResultName, { color: colors.title }]}
          numberOfLines={1}
        >
          {fallbackName}
        </Text>

        <Text
          style={[styles.contactResultMeta, { color: colors.text }]}
          numberOfLines={1}
        >
          Selected person
        </Text>
      </View>
    </View>
  );
}

function ContactRow({
  contact,
  selected,
  colors,
  onPress,
}: {
  contact: Contact;
  selected: boolean;
  colors: SmartReminderColors;
  onPress: () => void;
}) {
  const name = fullName(contact) || "Unnamed";
  const groupName = contact.group_detail?.name;

  return (
    <TouchableOpacity
      style={[
        styles.contactResultRow,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.softPrimary : colors.softCard,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {contact.photo ? (
        <Image source={{ uri: contact.photo }} style={styles.contactPhoto} />
      ) : (
        <View
          style={[
            styles.contactAvatar,
            {
              backgroundColor: selected ? colors.primary : colors.softPrimary,
            },
          ]}
        >
          <Text
            style={[
              styles.contactAvatarText,
              {
                color: selected ? colors.buttonText : colors.primary,
              },
            ]}
          >
            {contactInitials(contact)}
          </Text>
        </View>
      )}

      <View style={styles.contactResultTextWrap}>
        <Text
          style={[styles.contactResultName, { color: colors.title }]}
          numberOfLines={1}
        >
          {name}
        </Text>

        <Text
          style={[styles.contactResultMeta, { color: colors.text }]}
          numberOfLines={1}
        >
          {groupName || contact.phone || contact.email || "No details yet"}
        </Text>
      </View>

      {selected ? (
        <View
          style={[styles.selectedCheck, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="checkmark" size={14} color={colors.buttonText} />
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={17} color={colors.muted} />
      )}
    </TouchableOpacity>
  );
}

function EmptyContactResult({ colors }: { colors: SmartReminderColors }) {
  return (
    <View
      style={[
        styles.emptyContactResult,
        {
          backgroundColor: colors.softCard,
          borderColor: colors.border,
        },
      ]}
    >
      <Ionicons name="people-outline" size={20} color={colors.muted} />

      <Text style={[styles.emptyContactText, { color: colors.text }]}>
        No contacts found.
      </Text>
    </View>
  );
}

function SegmentButton({
  label,
  selected,
  colors,
  onPress,
}: {
  label: string;
  selected: boolean;
  colors: SmartReminderColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.segmentButton,
        { backgroundColor: selected ? colors.primary : "transparent" },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text
        style={[
          styles.segmentText,
          { color: selected ? colors.buttonText : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function OptionPill({
  label,
  active,
  colors,
  onPress,
}: {
  label: string;
  active: boolean;
  colors: SmartReminderColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.optionPill,
        {
          borderColor: active ? colors.primary : colors.border,
          backgroundColor: active ? colors.softPrimary : colors.softCard,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text
        style={[
          styles.optionPillText,
          { color: active ? colors.primary : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FieldLabel({
  label,
  colors,
}: {
  label: string;
  colors: SmartReminderColors;
}) {
  return (
    <Text style={[styles.smallLabel, { color: colors.text }]}>
      {label}
    </Text>
  );
}

function PickerButton({
  icon,
  label,
  value,
  colors,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: SmartReminderColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.pickerButton,
        {
          borderColor: colors.border,
          backgroundColor: colors.softCard,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.pickerButtonLeft}>
        <View
          style={[
            styles.pickerIcon,
            { backgroundColor: colors.softPrimary },
          ]}
        >
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>

        <View style={styles.pickerTextWrap}>
          <Text style={[styles.pickerButtonLabel, { color: colors.text }]}>
            {label}
          </Text>

          <Text
            style={[styles.pickerButtonValue, { color: colors.title }]}
            numberOfLines={1}
          >
            {value}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-down" size={18} color={colors.muted} />
    </TouchableOpacity>
  );
}

function PickerDoneButton({
  colors,
  onPress,
}: {
  colors: SmartReminderColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.donePickerButton, { backgroundColor: colors.button }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.donePickerButtonText, { color: colors.buttonText }]}>
        Done
      </Text>
    </TouchableOpacity>
  );
}

function ThemedInput({
  colors,
  style,
  ...props
}: TextInputProps & {
  colors: SmartReminderColors;
}) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={colors.muted}
      style={[
        styles.input,
        {
          backgroundColor: colors.softCard,
          borderColor: colors.border,
          color: colors.title,
        },
        style,
      ]}
    />
  );
}

function Divider({ colors }: { colors: SmartReminderColors }) {
  return (
    <View style={[styles.divider, { backgroundColor: colors.border }]} />
  );
}

/* helpers */

function makeSmartReminderColors(settings: any): SmartReminderColors {
  return {
    background: settings.backgroundColor,
    card: settings.cardColor,
    title: settings.titleColor,
    text: settings.textColor,
    primary: settings.primaryColor,
    button: settings.buttonColor || settings.primaryColor,
    buttonText: settings.buttonTextColor,
    border: withOpacity(settings.textColor, "16"),
    muted: withOpacity(settings.textColor, "88"),
    softCard: withOpacity(settings.textColor, "08"),
    softPrimary: withOpacity(settings.primaryColor, "16"),
    danger: "#EE6A5E",
    warning: "#EBA55B",
    success: "#7DA56D",
    shadow: settings.themeMode === "dark" ? "#000000" : "#6F3D2E",
  };
}

function normalizeContactsResponse(data: any): Contact[] {
  if (Array.isArray(data)) return data;

  return data?.results ?? [];
}

function fullName(contact?: Contact | null) {
  if (!contact) return "";

  return `${contact.first_name || ""} ${contact.last_name || ""}`.trim();
}

function contactInitials(contact?: Contact | null) {
  const first = contact?.first_name?.[0] ?? "";
  const last = contact?.last_name?.[0] ?? "";

  return `${first}${last}`.toUpperCase() || "?";
}

function todayStart() {
  const date = new Date();

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function defaultTimeDate() {
  const date = new Date();

  date.setHours(9, 0, 0, 0);

  return date;
}

function toYMD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toTimeOfDay(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function formatDateForUser(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeForUser(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function withOpacity(hexColor?: string | null, opacityHex = "22") {
  if (!hexColor || typeof hexColor !== "string") {
    return `#000000${opacityHex}`;
  }

  const normalized = hexColor.trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
    return `${normalized}${opacityHex}`;
  }

  return normalized;
}

/* styles */

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },

  root: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 90,
    gap: 12,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "800",
  },

  compactHeader: {
    minHeight: 154,
    borderRadius: 28,
    padding: 16,
    overflow: "hidden",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  headerGlowOne: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 145,
    height: 145,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.16)",
  },

  headerGlowTwo: {
    position: "absolute",
    bottom: -75,
    left: -55,
    width: 160,
    height: 160,
    borderRadius: 86,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerCircleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerPill: {
    minHeight: 36,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  headerPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  headerMainRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  headerIconBubble: {
    width: 54,
    height: 54,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  headerEyebrow: {
    color: "rgba(255,255,255,0.66)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "900",
    marginTop: 3,
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 2,
  },

  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 15,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  sectionTitleRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },

  sectionIconBubble: {
    width: 30,
    height: 30,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.1,
  },

  contactSearchBox: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  contactSearchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
  },

  contactResults: {
    marginTop: 10,
    gap: 8,
  },

  selectedContactBox: {
    minHeight: 62,
    borderRadius: 20,
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  selectedPhoto: {
    width: 40,
    height: 40,
    borderRadius: 17,
  },

  contactResultRow: {
    minHeight: 66,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  contactPhoto: {
    width: 40,
    height: 40,
    borderRadius: 17,
  },

  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  contactAvatarText: {
    fontSize: 13,
    fontWeight: "900",
  },

  contactResultTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  contactResultName: {
    fontSize: 14,
    fontWeight: "900",
  },

  contactResultMeta: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
  },

  selectedCheck: {
    width: 26,
    height: 26,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyContactResult: {
    minHeight: 68,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  emptyContactText: {
    fontSize: 12,
    fontWeight: "800",
    opacity: 0.72,
  },

  input: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    fontWeight: "700",
  },

  textArea: {
    minHeight: 98,
    paddingTop: 12,
    lineHeight: 21,
  },

  divider: {
    height: 1,
    marginVertical: 18,
  },

  segment: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 999,
    marginBottom: 12,
  },

  segmentButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  segmentText: {
    fontSize: 12,
    fontWeight: "900",
  },

  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  optionPill: {
    minHeight: 38,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  optionPillText: {
    fontSize: 12,
    fontWeight: "900",
  },

  customDateBox: {
    marginTop: 2,
  },

  smallLabel: {
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 7,
    opacity: 0.76,
  },

  timeSection: {
    marginTop: 14,
  },

  pickerButton: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  pickerButtonLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  pickerIcon: {
    width: 36,
    height: 36,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  pickerTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  pickerButtonLabel: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    opacity: 0.68,
  },

  pickerButtonValue: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
    marginTop: 1,
  },

  pickerWrap: {
    marginTop: 12,
  },

  donePickerButton: {
    minHeight: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  donePickerButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },

  previewCard: {
    minHeight: 74,
    borderRadius: 24,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  previewIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  previewTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  previewLabel: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    opacity: 0.68,
  },

  previewText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900",
    marginTop: 1,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },

  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },

  saveButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
});