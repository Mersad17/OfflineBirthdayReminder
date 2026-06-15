// src/screens/Events/AddEventScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { createEvent } from "../../events/repository";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { formatDateEU } from "../../lib/date";
import { AppId, Contact } from "../../contacts/types";
import { fetchContactById, fetchContacts } from "../../contacts/repository";
import { createReminder } from "../../reminders/repository";
import { REMINDER_STATUS } from "../../events/types";

type EventTypeValue = 1 | 2 | 3 | 4 | 5 | 6;

type Props = {
  navigation: any;
  route: {
    params?: {
      contactId?: AppId;
      contactName?: string;
      initialType?: EventTypeValue;
      initialTitle?: string;
    };
  };
};

type EventTypeOption = {
  label: string;
  icon: string;
  value: EventTypeValue;
};

type ReminderPreset = "none" | "at_time" | "one_hour_before" | "one_day_before";

type AddEventColors = {
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

const EVENT_TYPE_OPTIONS: EventTypeOption[] = [
  { label: "Birthday", icon: "🎂", value: 1 },
  { label: "Anniversary", icon: "💍", value: 2 },
  { label: "Important date", icon: "⭐", value: 3 },
  { label: "Meeting", icon: "🤝", value: 4 },
  { label: "Holiday", icon: "🏝", value: 5 },
  { label: "Other", icon: "✨", value: 6 },
];

const REMINDER_OPTIONS: {
  value: ReminderPreset;
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: "none",
    label: "None",
    subtitle: "No reminder",
    icon: "notifications-off-outline",
  },
  {
    value: "at_time",
    label: "At time",
    subtitle: "When it starts",
    icon: "time-outline",
  },
  {
    value: "one_hour_before",
    label: "1 hour before",
    subtitle: "Prepare before",
    icon: "alarm-outline",
  },
  {
    value: "one_day_before",
    label: "1 day before",
    subtitle: "Good for birthdays",
    icon: "calendar-outline",
  },
];

export default function AddEventScreen({ navigation, route }: Props) {
  const { settings } = useAppearance();
  const colors = useMemo(() => makeAddEventColors(settings), [settings]);

  const initialContactId = route?.params?.contactId;
  const initialContactName = route?.params?.contactName;
  const initialType = route?.params?.initialType ?? 1;
  const initialTitle = route?.params?.initialTitle ?? "";

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const [showContactPicker, setShowContactPicker] = useState(!initialContactId);
  const [contactSearch, setContactSearch] = useState("");

  const [selectedContactId, setSelectedContactId] = useState<
    AppId | undefined
  >(initialContactId);

  const [selectedContactName, setSelectedContactName] = useState(
    initialContactName || ""
  );

  const contactName = selectedContactName || "Choose contact";

  const [title, setTitle] = useState(initialTitle);
  const [type, setType] = useState<EventTypeValue>(initialType);

  const [dateString, setDateString] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [startTimeString, setStartTimeString] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);

  const [isRecurring, setIsRecurring] = useState(true);
  const [hasEndDate, setHasEndDate] = useState(false);

  const [endDateString, setEndDateString] = useState("");
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const [endTimeString, setEndTimeString] = useState("");
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [saving, setSaving] = useState(false);

  const [reminderPreset, setReminderPreset] =
    useState<ReminderPreset>("one_day_before");

  const [successVisible, setSuccessVisible] = useState(false);
  const [createdEventTitle, setCreatedEventTitle] = useState("");

  const selectedTypeOption =
    EVENT_TYPE_OPTIONS.find((option) => option.value === type) ??
    EVENT_TYPE_OPTIONS[0];

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
        const relationship = contact.relationship_label?.toLowerCase() ?? "";

        return (
          name.includes(query) ||
          phone.includes(query) ||
          email.includes(query) ||
          group.includes(query) ||
          relationship.includes(query)
        );
      })
      .slice(0, 12);
  }, [contacts, contactSearch]);

  useEffect(() => {
    navigation.setOptions?.({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    let mounted = true;

    async function loadInitialContact(contactId: AppId) {
      try {
        setLoadingContacts(true);

        const contact = await fetchContactById(contactId);

        if (!mounted) return;

        setSelectedContact(contact);
        setSelectedContactId(contact.id);
        setSelectedContactName(fullName(contact) || initialContactName || "");
        setContacts([contact]);
        setShowContactPicker(false);
      } catch (error) {
        console.log("Load initial event contact failed:", error);

        if (mounted) {
          setSelectedContactName(initialContactName || "");
        }
      } finally {
        if (mounted) {
          setLoadingContacts(false);
        }
      }
    }

    async function loadContacts() {
      try {
        setLoadingContacts(true);

        const response = await fetchContacts({ page: 1 });
        const loadedContacts = normalizeContactsResponse(response);

        if (!mounted) return;

        setContacts(loadedContacts);

        if (loadedContacts.length === 1) {
          const onlyContact = loadedContacts[0];

          setSelectedContact(onlyContact);
          setSelectedContactId(onlyContact.id);
          setSelectedContactName(fullName(onlyContact));
          setShowContactPicker(false);
        }
      } catch (error) {
        console.log("Load contacts for event failed:", error);
      } finally {
        if (mounted) {
          setLoadingContacts(false);
        }
      }
    }

    if (initialContactId) {
      loadInitialContact(initialContactId);
    } else {
      loadContacts();
    }

    return () => {
      mounted = false;
    };
  }, [initialContactId, initialContactName]);

  function selectContact(contact: Contact) {
    setSelectedContact(contact);
    setSelectedContactId(contact.id);
    setSelectedContactName(fullName(contact));

    setContactSearch("");
    setShowContactPicker(false);

    Keyboard.dismiss();
  }

  function formatDate(dateValue: Date) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function formatTime(dateValue: Date) {
    const hours = String(dateValue.getHours()).padStart(2, "0");
    const minutes = String(dateValue.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
  }

  function resetEndDateFields() {
    setHasEndDate(false);
    setEndDate(null);
    setEndDateString("");
    setEndTime(null);
    setEndTimeString("");
    setShowEndDatePicker(false);
    setShowEndTimePicker(false);
  }

  function selectRepeatMode(nextIsRecurring: boolean) {
    setIsRecurring(nextIsRecurring);

    if (nextIsRecurring) {
      resetEndDateFields();
    }
  }

  function toggleHasEndDate() {
    setHasEndDate((current) => {
      const next = !current;

      if (!next) {
        setEndDate(null);
        setEndDateString("");
        setEndTime(null);
        setEndTimeString("");
        setShowEndDatePicker(false);
        setShowEndTimePicker(false);
      }

      return next;
    });
  }

  function closePickerOnAndroid(close: () => void) {
    if (Platform.OS === "android") {
      close();
    }
  }

  function handleDateValueChange(_event: any, selectedDate?: Date) {
    if (!selectedDate) return;

    setDate(selectedDate);
    setDateString(formatDate(selectedDate));

    closePickerOnAndroid(() => setShowDatePicker(false));
  }

  function handleStartTimeValueChange(_event: any, selectedTime?: Date) {
    if (!selectedTime) return;

    setStartTime(selectedTime);
    setStartTimeString(formatTime(selectedTime));

    closePickerOnAndroid(() => setShowStartTimePicker(false));
  }

  function handleEndDateValueChange(_event: any, selectedDate?: Date) {
    if (!selectedDate) return;

    setEndDate(selectedDate);
    setEndDateString(formatDate(selectedDate));

    setEndTime(null);
    setEndTimeString("");

    closePickerOnAndroid(() => setShowEndDatePicker(false));
  }

  function handleEndTimeValueChange(_event: any, selectedTime?: Date) {
    if (!selectedTime) return;

    setEndTime(selectedTime);
    setEndTimeString(formatTime(selectedTime));

    closePickerOnAndroid(() => setShowEndTimePicker(false));
  }

  async function onSubmit() {
    if (!selectedContactId) {
      Alert.alert("No contact", "Choose a person for this event.");
      return;
    }

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      Alert.alert("Title required", "Please add a title.");
      return;
    }

    if (!dateString) {
      Alert.alert("Date required", "Please pick a date for this event.");
      return;
    }

    if (
      !isRecurring &&
      hasEndDate &&
      endDateString &&
      endDateString < dateString
    ) {
      Alert.alert(
        "Invalid end date",
        "End date cannot be earlier than start date."
      );
      return;
    }

    if (
      !isRecurring &&
      hasEndDate &&
      endDateString === dateString &&
      startTimeString &&
      endTimeString &&
      endTimeString <= startTimeString
    ) {
      Alert.alert("Invalid end time", "End time must be after start time.");
      return;
    }

    setSaving(true);

    try {
      const createdEvent = await createEvent({
        contact: selectedContactId,
        title: cleanTitle,
        type,
        start_date: dateString,
        start_time: startTimeString ? `${startTimeString}:00` : undefined,
        end_date:
          !isRecurring && hasEndDate && endDateString
            ? endDateString
            : undefined,
        end_time:
          !isRecurring && hasEndDate && endTimeString
            ? `${endTimeString}:00`
            : undefined,
        is_recurring: isRecurring,
      });

      if (reminderPreset !== "none") {
        await createEventReminder({
          eventId: createdEvent.id,
          preset: reminderPreset,
          dateString,
          startTimeString,
        });
      }

      setCreatedEventTitle(cleanTitle);
      setSuccessVisible(true);
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.message;

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
      style={[styles.keyboardRoot, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <Screen>
        <View style={[styles.root, { backgroundColor: colors.background }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <CompactHeader
              colors={colors}
              contactName={contactName}
              selectedType={selectedTypeOption}
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
                title="Contact"
                colors={colors}
              />

              <ContactSelector
                colors={colors}
                contactName={contactName}
                selectedContact={selectedContact}
                contacts={filteredContacts}
                selectedContactId={selectedContactId}
                loading={loadingContacts}
                showPicker={showContactPicker}
                locked={Boolean(initialContactId)}
                searchValue={contactSearch}
                onSearchChange={setContactSearch}
                onTogglePicker={() =>
                  setShowContactPicker((current) => !current)
                }
                onSelect={selectContact}
              />

              <Divider colors={colors} />

              <SectionTitle
                icon="sparkles-outline"
                title="Basic info"
                colors={colors}
              />

              <FieldGroup label="Event title" required colors={colors}>
                <ThemedInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Birthday party, coffee, first date..."
                  autoCapitalize="sentences"
                  returnKeyType="done"
                  colors={colors}
                />
              </FieldGroup>

              <FieldGroup label="Type" colors={colors}>
                <View style={styles.typeRow}>
                  {EVENT_TYPE_OPTIONS.map((option) => {
                    const active = type === option.value;

                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.typeChip,
                          {
                            backgroundColor: active
                              ? colors.primary
                              : colors.softCard,
                            borderColor: active ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setType(option.value)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.typeEmoji}>{option.icon}</Text>

                        <Text
                          style={[
                            styles.typeChipText,
                            {
                              color: active ? colors.buttonText : colors.text,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </FieldGroup>

              <Divider colors={colors} />

              <SectionTitle
                icon="calendar-outline"
                title="When"
                colors={colors}
              />

              <FieldGroup
                label={hasEndDate ? "Start date" : "Date"}
                required
                colors={colors}
              >
                <PickerField
                  icon="calendar-outline"
                  value={dateString ? formatDateEU(dateString) : ""}
                  placeholder="Pick a date"
                  colors={colors}
                  onPress={() => {
                    setShowStartTimePicker(false);
                    setShowEndDatePicker(false);
                    setShowEndTimePicker(false);
                    setShowDatePicker(true);
                  }}
                />

                {showDatePicker ? (
                  <DateTimePicker
                    value={date || new Date()}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onValueChange={handleDateValueChange}
                    onDismiss={() => setShowDatePicker(false)}
                    onNeutralButtonPress={() => setShowDatePicker(false)}
                  />
                ) : null}
              </FieldGroup>

              <FieldGroup
                label={hasEndDate ? "Start time" : "Time"}
                hint="Optional"
                colors={colors}
              >
                <PickerField
                  icon="time-outline"
                  value={startTimeString}
                  placeholder="No specific time"
                  colors={colors}
                  onPress={() => {
                    setShowDatePicker(false);
                    setShowEndDatePicker(false);
                    setShowEndTimePicker(false);
                    setShowStartTimePicker(true);
                  }}
                />

                {showStartTimePicker ? (
                  <DateTimePicker
                    value={startTime || new Date()}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onValueChange={handleStartTimeValueChange}
                    onDismiss={() => setShowStartTimePicker(false)}
                    onNeutralButtonPress={() => setShowStartTimePicker(false)}
                  />
                ) : null}
              </FieldGroup>

              <FieldGroup label="Repeat" colors={colors}>
                <View style={styles.repeatRow}>
                  <RepeatChip
                    label="Every year"
                    icon="repeat-outline"
                    selected={isRecurring}
                    colors={colors}
                    onPress={() => selectRepeatMode(true)}
                  />

                  <RepeatChip
                    label="One-time"
                    icon="ellipse-outline"
                    selected={!isRecurring}
                    colors={colors}
                    onPress={() => selectRepeatMode(false)}
                  />
                </View>
              </FieldGroup>

              {!isRecurring ? (
                <TouchableOpacity
                  style={[
                    styles.endDateToggle,
                    {
                      backgroundColor: colors.softCard,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={toggleHasEndDate}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: hasEndDate
                          ? colors.primary
                          : "transparent",
                        borderColor: hasEndDate ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {hasEndDate ? (
                      <Ionicons
                        name="checkmark"
                        size={15}
                        color={colors.buttonText}
                      />
                    ) : null}
                  </View>

                  <View style={styles.endDateToggleTextWrap}>
                    <Text
                      style={[
                        styles.endDateToggleTitle,
                        { color: colors.title },
                      ]}
                    >
                      This event has an end date
                    </Text>

                    <Text
                      style={[
                        styles.endDateToggleSubtitle,
                        { color: colors.text },
                      ]}
                    >
                      Useful for trips, holidays, or multi-day moments.
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : null}

              {!isRecurring && hasEndDate ? (
                <View style={styles.endDateBox}>
                  <FieldGroup label="End date" colors={colors}>
                    <PickerField
                      icon="calendar-outline"
                      value={endDateString ? formatDateEU(endDateString) : ""}
                      placeholder="No end date"
                      colors={colors}
                      onPress={() => {
                        setShowDatePicker(false);
                        setShowStartTimePicker(false);
                        setShowEndTimePicker(false);
                        setShowEndDatePicker(true);
                      }}
                    />

                    {showEndDatePicker ? (
                      <DateTimePicker
                        value={endDate || date || new Date()}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onValueChange={handleEndDateValueChange}
                        onDismiss={() => setShowEndDatePicker(false)}
                        onNeutralButtonPress={() =>
                          setShowEndDatePicker(false)
                        }
                      />
                    ) : null}
                  </FieldGroup>

                  <FieldGroup label="End time" hint="Optional" colors={colors}>
                    <PickerField
                      icon="time-outline"
                      value={endTimeString}
                      placeholder="No end time"
                      colors={colors}
                      onPress={() => {
                        setShowDatePicker(false);
                        setShowStartTimePicker(false);
                        setShowEndDatePicker(false);
                        setShowEndTimePicker(true);
                      }}
                    />

                    {showEndTimePicker ? (
                      <DateTimePicker
                        value={endTime || new Date()}
                        mode="time"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onValueChange={handleEndTimeValueChange}
                        onDismiss={() => setShowEndTimePicker(false)}
                        onNeutralButtonPress={() =>
                          setShowEndTimePicker(false)
                        }
                      />
                    ) : null}
                  </FieldGroup>
                </View>
              ) : null}

              <Divider colors={colors} />

              <SectionTitle
                icon="notifications-outline"
                title="Reminder"
                colors={colors}
              />

              <View style={styles.reminderGrid}>
                {REMINDER_OPTIONS.map((option) => (
                  <ReminderOptionCard
                    key={option.value}
                    option={option}
                    selected={reminderPreset === option.value}
                    colors={colors}
                    onPress={() => setReminderPreset(option.value)}
                  />
                ))}
              </View>

              <BeforeMeetInfoCard
                colors={colors}
                enabled={type === 4 || type === 6}
                contactName={contactName}
              />
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
                  style={[styles.secondaryButtonText, { color: colors.text }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.button },
                  saving && styles.primaryButtonDisabled,
                ]}
                onPress={onSubmit}
                disabled={saving}
                activeOpacity={0.88}
              >
                {saving ? (
                  <ActivityIndicator color={colors.buttonText} />
                ) : (
                  <Text
                    style={[
                      styles.primaryButtonText,
                      { color: colors.buttonText },
                    ]}
                  >
                    Save event
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          <SuccessSheet
            visible={successVisible}
            colors={colors}
            title="Event created"
            eventTitle={createdEventTitle}
            reminderLabel={getReminderLabel(reminderPreset)}
            beforeMeetEnabled={type === 4 || type === 6}
            onDone={() => {
              setSuccessVisible(false);
              navigation.goBack();
            }}
            onAddAnother={() => {
              setSuccessVisible(false);
              setTitle("");
              setDate(null);
              setDateString("");
              setStartTime(null);
              setStartTimeString("");
              setEndDate(null);
              setEndDateString("");
              setEndTime(null);
              setEndTimeString("");
              setHasEndDate(false);
              setShowDatePicker(false);
              setShowStartTimePicker(false);
              setShowEndDatePicker(false);
              setShowEndTimePicker(false);
            }}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function ReminderOptionCard({
  option,
  selected,
  colors,
  onPress,
}: {
  option: {
    value: ReminderPreset;
    label: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
  };
  selected: boolean;
  colors: AddEventColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.reminderOption,
        {
          backgroundColor: selected ? colors.softPrimary : colors.softCard,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View
        style={[
          styles.reminderOptionIcon,
          { backgroundColor: selected ? colors.primary : colors.softPrimary },
        ]}
      >
        <Ionicons
          name={option.icon}
          size={17}
          color={selected ? colors.buttonText : colors.primary}
        />
      </View>

      <Text
        style={[
          styles.reminderOptionTitle,
          { color: selected ? colors.primary : colors.title },
        ]}
        numberOfLines={1}
      >
        {option.label}
      </Text>

      <Text
        style={[styles.reminderOptionSubtitle, { color: colors.text }]}
        numberOfLines={1}
      >
        {option.subtitle}
      </Text>
    </TouchableOpacity>
  );
}

function BeforeMeetInfoCard({
  colors,
  enabled,
  contactName,
}: {
  colors: AddEventColors;
  enabled: boolean;
  contactName: string;
}) {
  if (!enabled) return null;

  return (
    <View
      style={[
        styles.beforeMeetCard,
        {
          backgroundColor: colors.softPrimary,
          borderColor: withOpacity(colors.primary, "24"),
        },
      ]}
    >
      <View
        style={[
          styles.beforeMeetIcon,
          { backgroundColor: withOpacity(colors.primary, "18") },
        ]}
      >
        <Ionicons name="flash-outline" size={18} color={colors.primary} />
      </View>

      <View style={styles.beforeMeetTextWrap}>
        <Text style={[styles.beforeMeetTitle, { color: colors.title }]}>
          Before Meet will appear
        </Text>

        <Text style={[styles.beforeMeetText, { color: colors.text }]}>
          The calendar can show a prep card before meeting {contactName}.
        </Text>
      </View>
    </View>
  );
}

function SuccessSheet({
  visible,
  colors,
  title,
  eventTitle,
  reminderLabel,
  beforeMeetEnabled,
  onDone,
  onAddAnother,
}: {
  visible: boolean;
  colors: AddEventColors;
  title: string;
  eventTitle: string;
  reminderLabel: string;
  beforeMeetEnabled: boolean;
  onDone: () => void;
  onAddAnother: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDone}
    >
      <View style={styles.successOverlay}>
        <View
          style={[
            styles.successSheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.successIcon,
              { backgroundColor: colors.softPrimary },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={30}
              color={colors.primary}
            />
          </View>

          <Text style={[styles.successTitle, { color: colors.title }]}>
            {title}
          </Text>

          <Text
            style={[styles.successMessage, { color: colors.text }]}
            numberOfLines={2}
          >
            {eventTitle}
          </Text>

          <View
            style={[
              styles.successPreview,
              {
                backgroundColor: colors.softCard,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={17}
              color={colors.primary}
            />

            <Text
              style={[styles.successPreviewText, { color: colors.title }]}
              numberOfLines={2}
            >
              Reminder: {reminderLabel}
            </Text>
          </View>

          {beforeMeetEnabled ? (
            <View
              style={[
                styles.successPreview,
                {
                  backgroundColor: colors.softCard,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons
                name="flash-outline"
                size={17}
                color={colors.primary}
              />

              <Text
                style={[styles.successPreviewText, { color: colors.title }]}
                numberOfLines={2}
              >
                Before Meet: enabled
              </Text>
            </View>
          ) : null}

          <View style={styles.successActions}>
            <TouchableOpacity
              style={[
                styles.successSecondaryButton,
                {
                  backgroundColor: colors.softCard,
                  borderColor: colors.border,
                },
              ]}
              onPress={onAddAnother}
              activeOpacity={0.85}
            >
              <Text style={[styles.successSecondaryText, { color: colors.text }]}>
                Add another
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.successPrimaryButton,
                { backgroundColor: colors.button },
              ]}
              onPress={onDone}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.successPrimaryText, { color: colors.buttonText }]}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ContactSelector({
  colors,
  contactName,
  selectedContact,
  contacts,
  selectedContactId,
  loading,
  showPicker,
  locked,
  searchValue,
  onSearchChange,
  onTogglePicker,
  onSelect,
}: {
  colors: AddEventColors;
  contactName: string;
  selectedContact: Contact | null;
  contacts: Contact[];
  selectedContactId?: AppId;
  loading: boolean;
  showPicker: boolean;
  locked: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onTogglePicker: () => void;
  onSelect: (contact: Contact) => void;
}) {
  return (
    <View>
      <TouchableOpacity
        style={[
          styles.contactPill,
          {
            backgroundColor: colors.softCard,
            borderColor: colors.border,
          },
        ]}
        onPress={locked ? undefined : onTogglePicker}
        activeOpacity={locked ? 1 : 0.85}
      >
        {selectedContact?.photo ? (
          <Image
            source={{ uri: selectedContact.photo }}
            style={styles.contactPillPhoto}
          />
        ) : (
          <View
            style={[
              styles.contactIcon,
              { backgroundColor: colors.softPrimary },
            ]}
          >
            <Text style={[styles.contactMiniInitials, { color: colors.primary }]}>
              {selectedContactId ? getInitials(contactName) : "?"}
            </Text>
          </View>
        )}

        <View style={styles.contactTextWrap}>
          <Text style={[styles.contactPillLabel, { color: colors.text }]}>
            For
          </Text>

          <Text
            style={[styles.contactPillName, { color: colors.title }]}
            numberOfLines={1}
          >
            {contactName}
          </Text>
        </View>

        {!locked ? (
          <View
            style={[
              styles.changeContactButton,
              { backgroundColor: colors.softPrimary },
            ]}
          >
            <Text style={[styles.changeContactText, { color: colors.primary }]}>
              {showPicker ? "Close" : selectedContactId ? "Change" : "Choose"}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {!locked && showPicker ? (
        <View style={styles.contactPickerBox}>
          <SearchBox
            value={searchValue}
            colors={colors}
            onChangeText={onSearchChange}
          />

          {loading ? (
            <View style={styles.contactPickerLoading}>
              <ActivityIndicator color={colors.primary} />

              <Text
                style={[styles.contactPickerLoadingText, { color: colors.text }]}
              >
                Loading people…
              </Text>
            </View>
          ) : contacts.length === 0 ? (
            <View
              style={[
                styles.contactPickerEmpty,
                {
                  backgroundColor: colors.softCard,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.contactPickerEmptyTitle, { color: colors.title }]}
              >
                No people found
              </Text>

              <Text
                style={[styles.contactPickerEmptyText, { color: colors.text }]}
              >
                Try another search or create a person first.
              </Text>
            </View>
          ) : (
            contacts.map((contact) => {
              const selected = selectedContactId === contact.id;
              const name = fullName(contact) || "Unnamed";

              return (
                <TouchableOpacity
                  key={String(contact.id)}
                  style={[
                    styles.contactPickerRow,
                    {
                      backgroundColor: selected
                        ? colors.softPrimary
                        : colors.softCard,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => onSelect(contact)}
                  activeOpacity={0.85}
                >
                  {contact.photo ? (
                    <Image
                      source={{ uri: contact.photo }}
                      style={styles.contactMiniPhoto}
                    />
                  ) : (
                    <View
                      style={[
                        styles.contactMiniAvatar,
                        { backgroundColor: colors.softPrimary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.contactMiniInitials,
                          { color: colors.primary },
                        ]}
                      >
                        {getInitials(name)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.contactPickerTextWrap}>
                    <Text
                      style={[styles.contactPickerName, { color: colors.title }]}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>

                    <Text
                      style={[styles.contactPickerMeta, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {contact.relationship_label ||
                        contact.group_detail?.name ||
                        contact.phone ||
                        contact.email ||
                        "Person"}
                    </Text>
                  </View>

                  {selected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.primary}
                    />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={colors.muted}
                    />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      ) : null}
    </View>
  );
}

function SearchBox({
  value,
  colors,
  onChangeText,
}: {
  value: string;
  colors: AddEventColors;
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

function CompactHeader({
  colors,
  contactName,
  selectedType,
  onBack,
}: {
  colors: AddEventColors;
  contactName: string;
  selectedType: EventTypeOption;
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

      <View style={styles.headerTopActions}>
        <TouchableOpacity
          style={styles.headerCircleButton}
          onPress={onBack}
          activeOpacity={0.85}
        >
          <Ionicons name="chevron-back" size={23} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerPill}>
          <Text style={styles.headerPillEmoji}>{selectedType.icon}</Text>

          <Text style={styles.headerPillText}>New moment</Text>
        </View>
      </View>

      <View style={styles.headerTopRow}>
        <View style={styles.headerIconBubble}>
          <Text style={styles.headerEmoji}>{selectedType.icon}</Text>
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>NEW MOMENT</Text>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Add event
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={1}>
            For {contactName}
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
  colors: AddEventColors;
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

function FieldGroup({
  label,
  hint,
  required,
  colors,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  colors: AddEventColors;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.title }]}>{label}</Text>

        {required ? (
          <Text style={[styles.requiredTag, { color: colors.primary }]}>
            Required
          </Text>
        ) : hint ? (
          <Text style={[styles.optionalTag, { color: colors.muted }]}>
            {hint}
          </Text>
        ) : null}
      </View>

      {children}
    </View>
  );
}

function ThemedInput({
  colors,
  style,
  ...props
}: TextInputProps & {
  colors: AddEventColors;
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

function PickerField({
  icon,
  value,
  placeholder,
  colors,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  placeholder: string;
  colors: AddEventColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.input,
        styles.pickerInput,
        {
          backgroundColor: colors.softCard,
          borderColor: colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.pickerText,
          { color: value ? colors.title : colors.muted },
        ]}
        numberOfLines={1}
      >
        {value || placeholder}
      </Text>

      <Ionicons name={icon} size={18} color={colors.primary} />
    </TouchableOpacity>
  );
}

function RepeatChip({
  label,
  icon,
  selected,
  colors,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  colors: AddEventColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.repeatChip,
        {
          backgroundColor: selected ? colors.primary : colors.softCard,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons
        name={icon}
        size={16}
        color={selected ? colors.buttonText : colors.primary}
      />

      <Text
        style={[
          styles.repeatChipText,
          { color: selected ? colors.buttonText : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Divider({ colors }: { colors: AddEventColors }) {
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

/* helpers */

function normalizeContactsResponse(response: any): Contact[] {
  if (Array.isArray(response)) return response;

  return response?.results ?? [];
}

function fullName(contact?: Contact | null) {
  if (!contact) return "";

  return `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim();
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

async function createEventReminder({
  eventId,
  preset,
  dateString,
  startTimeString,
}: {
  eventId: AppId;
  preset: ReminderPreset;
  dateString: string;
  startTimeString: string;
}) {
  const timeOfDay = startTimeString || "09:00";

  if (preset === "at_time") {
    const sendAt = buildDateTime(dateString, timeOfDay);

    await createReminder(eventId, {
      event: eventId,
      absolute_datetime: sendAt.toISOString(),
      send_at: sendAt.toISOString(),
      status: REMINDER_STATUS.PENDING,
      is_active: true,
    } as any);

    return;
  }

  if (preset === "one_hour_before") {
    const sendAt = buildDateTime(dateString, timeOfDay);
    sendAt.setHours(sendAt.getHours() - 1);

    await createReminder(eventId, {
      event: eventId,
      absolute_datetime: sendAt.toISOString(),
      send_at: sendAt.toISOString(),
      status: REMINDER_STATUS.PENDING,
      is_active: true,
    } as any);

    return;
  }

  if (preset === "one_day_before") {
    await createReminder(eventId, {
      event: eventId,
      days_before: 1,
      time_of_day: timeOfDay,
      status: REMINDER_STATUS.PENDING,
      is_active: true,
    } as any);
  }
}

function buildDateTime(dateString: string, timeString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hourRaw, minuteRaw] = timeString.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  return new Date(
    year,
    month - 1,
    day,
    Number.isNaN(hour) ? 9 : hour,
    Number.isNaN(minute) ? 0 : minute,
    0,
    0
  );
}

function getReminderLabel(preset: ReminderPreset) {
  switch (preset) {
    case "at_time":
      return "At event time";
    case "one_hour_before":
      return "1 hour before";
    case "one_day_before":
      return "1 day before";
    case "none":
    default:
      return "None";
  }
}

function makeAddEventColors(settings: any): AddEventColors {
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

  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 90,
  },

  compactHeader: {
    minHeight: 154,
    borderRadius: 28,
    padding: 16,
    marginBottom: 12,
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

  headerTopActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
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

  headerPillEmoji: {
    fontSize: 13,
  },

  headerPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  headerTopRow: {
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

  headerEmoji: {
    fontSize: 24,
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
    fontSize: 28,
    lineHeight: 33,
    fontWeight: "900",
    marginTop: 3,
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    lineHeight: 18,
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

  contactPill: {
    minHeight: 58,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  contactPillPhoto: {
    width: 36,
    height: 36,
    borderRadius: 15,
  },

  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  contactTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  contactPillLabel: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    opacity: 0.68,
  },

  contactPillName: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    marginTop: 1,
  },

  changeContactButton: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  changeContactText: {
    fontSize: 12,
    fontWeight: "900",
  },

  contactPickerBox: {
    gap: 8,
    marginTop: 10,
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

  contactPickerLoading: {
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  contactPickerLoadingText: {
    fontSize: 12,
    fontWeight: "800",
  },

  contactPickerEmpty: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },

  contactPickerEmptyTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  contactPickerEmptyText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 4,
  },

  contactPickerRow: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  contactMiniPhoto: {
    width: 36,
    height: 36,
    borderRadius: 15,
  },

  contactMiniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  contactMiniInitials: {
    fontSize: 12,
    fontWeight: "900",
  },

  contactPickerTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  contactPickerName: {
    fontSize: 14,
    fontWeight: "900",
  },

  contactPickerMeta: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
  },

  divider: {
    height: 1,
    marginVertical: 18,
  },

  fieldGroup: {
    marginBottom: 14,
  },

  labelRow: {
    minHeight: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 10,
  },

  label: {
    fontSize: 13,
    fontWeight: "900",
  },

  requiredTag: {
    fontSize: 11,
    fontWeight: "900",
  },

  optionalTag: {
    fontSize: 11,
    fontWeight: "800",
  },

  input: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
  },

  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  typeChip: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  typeEmoji: {
    fontSize: 14,
  },

  typeChipText: {
    fontSize: 12,
    fontWeight: "900",
  },

  pickerInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  pickerText: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "800",
  },

  repeatRow: {
    flexDirection: "row",
    gap: 10,
  },

  repeatChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  repeatChipText: {
    fontSize: 13,
    fontWeight: "900",
  },

  endDateToggle: {
    minHeight: 70,
    borderRadius: 22,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 14,
  },

  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  endDateToggleTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  endDateToggleTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  endDateToggleSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 3,
  },

  endDateBox: {
    marginTop: 2,
  },

  reminderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  reminderOption: {
    width: "48%",
    minHeight: 94,
    borderRadius: 20,
    borderWidth: 1,
    padding: 11,
  },

  reminderOptionIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },

  reminderOptionTitle: {
    fontSize: 13,
    fontWeight: "900",
  },

  reminderOptionSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
  },

  beforeMeetCard: {
    minHeight: 76,
    borderRadius: 22,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginTop: 14,
  },

  beforeMeetIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  beforeMeetTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  beforeMeetTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  beforeMeetText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.76,
    marginTop: 3,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
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

  primaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonDisabled: {
    opacity: 0.6,
  },

  primaryButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },

  successOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 14, 10, 0.42)",
    justifyContent: "flex-end",
  },

  successSheet: {
    marginHorizontal: 12,
    marginBottom: Platform.OS === "ios" ? 28 : 26,
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: Platform.OS === "android" ? 24 : 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },

  successIcon: {
    width: 62,
    height: 62,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  successTitle: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
    textAlign: "center",
  },

  successMessage: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    textAlign: "center",
    opacity: 0.76,
    marginTop: 6,
  },

  successPreview: {
    width: "100%",
    minHeight: 52,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 12,
  },

  successPreviewText: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },

  successActions: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    marginBottom: Platform.OS === "android" ? 8 : 0,
  },

  successSecondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  successSecondaryText: {
    fontSize: 14,
    fontWeight: "900",
  },

  successPrimaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  successPrimaryText: {
    fontSize: 14,
    fontWeight: "900",
  },
});