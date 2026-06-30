// src/screens/Events/EditEventScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
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
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { EventsStackParamList } from "../../navigation/EventsStack";
import { fetchEventById, updateEvent } from "../../events/repository";
import { EventDTO } from "../../events/types";
import { fetchReminders, updateReminder } from "../../reminders/repository";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { formatDateEU } from "../../lib/date";
import { AppId } from "../../contacts/types";

type Props = NativeStackScreenProps<EventsStackParamList, "EditEvent">;

type EventTypeValue = 1 | 2 | 3 | 4 | 5 | 6;

type EventTypeOption = {
  label: string;
  icon: string;
  value: EventTypeValue;
};

type ReminderRefreshResult = {
  total: number;
  failed: number;
  unscheduled: number;
};

type EditEventColors = {
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

export default function EditEventScreen({ route, navigation }: Props) {
  const { eventId, eventTitle, contactId: routeContactId } = route.params;

  const { settings } = useAppearance();
  const colors = useMemo(() => makeEditEventColors(settings), [settings]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [event, setEvent] = useState<EventDTO | null>(null);

  const [contactId, setContactId] = useState<AppId | null>(
    routeContactId ?? null
  );
  const [contactName, setContactName] = useState("Contact");
  const [contactPhoto, setContactPhoto] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventTypeValue>(1);

  const [dateString, setDateString] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [startTimeString, setStartTimeString] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);

  const [isRecurring, setIsRecurring] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const [hasEndDate, setHasEndDate] = useState(false);

  const [endDateString, setEndDateString] = useState("");
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const [endTimeString, setEndTimeString] = useState("");
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const selectedType =
    EVENT_TYPE_OPTIONS.find((option) => option.value === type) ??
    EVENT_TYPE_OPTIONS[0];

  useEffect(() => {
    let mounted = true;

    async function loadEvent() {
      try {
        setLoading(true);

        const loadedEvent = await fetchEventById(eventId);

        if (!mounted) return;

        setEvent(loadedEvent);

        setContactId(routeContactId ?? loadedEvent.contact ?? null);
        setContactName(loadedEvent.contact_name || "Contact");
        setContactPhoto(
          (loadedEvent as any).contact_photo ||
            (loadedEvent as any).contact_detail?.photo ||
            (loadedEvent as any).contact_detail?.photo_uri ||
            null
        );
        setTitle(loadedEvent.title || eventTitle || "");
        setType((loadedEvent.type as EventTypeValue) ?? 1);

        setDateString(loadedEvent.start_date || "");
        setDate(parseDateFromString(loadedEvent.start_date));

        if (loadedEvent.start_time) {
          const time = loadedEvent.start_time.slice(0, 5);

          setStartTimeString(time);
          setStartTime(parseTimeFromString(time));
        }

        const recurring = Boolean(loadedEvent.is_recurring);
        setIsRecurring(recurring);

        if (loadedEvent.end_date) {
          setHasEndDate(true);
          setEndDateString(loadedEvent.end_date);
          setEndDate(parseDateFromString(loadedEvent.end_date));
        } else {
          setHasEndDate(false);
          setEndDateString("");
          setEndDate(null);
        }

        if (loadedEvent.end_time) {
          const time = loadedEvent.end_time.slice(0, 5);

          setEndTimeString(time);
          setEndTime(parseTimeFromString(time));
        } else {
          setEndTimeString("");
          setEndTime(null);
        }

        setIsActive(Boolean(loadedEvent.is_active));
      } catch (error) {
        console.log("Failed to load event", error);
        Alert.alert("Error", "Could not load event.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadEvent();

    return () => {
      mounted = false;
    };
  }, [eventId, eventTitle, routeContactId]);

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

  function parseDateFromString(value?: string | null) {
    if (!value) return null;

    const [year, month, day] = value.split("-").map(Number);

    if (!year || !month || !day) return null;

    return new Date(year, month - 1, day);
  }

  function parseTimeFromString(value?: string | null) {
    if (!value) return null;

    const [hoursRaw, minutesRaw] = value.split(":");
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);

    const base = new Date();
    base.setHours(Number.isNaN(hours) ? 0 : hours);
    base.setMinutes(Number.isNaN(minutes) ? 0 : minutes);
    base.setSeconds(0);
    base.setMilliseconds(0);

    return base;
  }

  function resetEndFields() {
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
      resetEndFields();
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

  function onDateChange(_: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (!selectedDate) return;

    setDate(selectedDate);
    setDateString(formatDate(selectedDate));
  }

  function onStartTimeChange(_: DateTimePickerEvent, selectedTime?: Date) {
    if (Platform.OS === "android") {
      setShowStartTimePicker(false);
    }

    if (!selectedTime) return;

    setStartTime(selectedTime);
    setStartTimeString(formatTime(selectedTime));
  }

  function onEndDateChange(_: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setShowEndDatePicker(false);
    }

    if (!selectedDate) return;

    setEndDate(selectedDate);
    setEndDateString(formatDate(selectedDate));

    setEndTime(null);
    setEndTimeString("");
  }

  function onEndTimeChange(_: DateTimePickerEvent, selectedTime?: Date) {
    if (Platform.OS === "android") {
      setShowEndTimePicker(false);
    }

    if (!selectedTime) return;

    setEndTime(selectedTime);
    setEndTimeString(formatTime(selectedTime));
  }

  async function onSave() {
    if (!event) return;

    if (!title.trim()) {
      Alert.alert("Title required", "Please add a title.");
      return;
    }

    if (!dateString) {
      Alert.alert("Date required", "Please pick a date for this event.");
      return;
    }

    if (!isRecurring && hasEndDate && endDateString && endDateString < dateString) {
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
      await updateEvent(eventId, {
        title: title.trim(),
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
        is_active: isActive,
      });

      const reminderRefresh = await refreshRemindersForEvent(eventId);

      Alert.alert("Saved", getSaveMessage(reminderRefresh), [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.log("Failed to update event", error);

      const detail = error?.response?.data?.detail;

      if (detail) {
        Alert.alert("Cannot update event", detail);
      } else {
        Alert.alert("Error", "Could not update event.");
      }
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
            Loading event…
          </Text>
        </View>
      </Screen>
    );
  }

  if (!event) {
    return (
      <Screen>
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Event not found.
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
      <Screen scroll>
        <View style={[styles.root, { backgroundColor: colors.background }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            <CompactHeader
              colors={colors}
              contactName={contactName}
              selectedType={selectedType}
              isActive={isActive}
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

              <View
                style={[
                  styles.contactPill,
                  {
                    backgroundColor: colors.softCard,
                    borderColor: colors.border,
                  },
                ]}
              >
                {contactPhoto ? (
  <Image source={{ uri: contactPhoto }} style={styles.contactPhoto} />
) : (
  <View
    style={[
      styles.contactIcon,
      { backgroundColor: colors.softPrimary },
    ]}
  >
    <Text style={[styles.contactInitials, { color: colors.primary }]}>
      {getInitials(contactName)}
    </Text>
  </View>
)}

                <View style={styles.contactTextWrap}>
                  <Text style={[styles.contactPillLabel, { color: colors.text }]}>
                    For
                  </Text>

                 <Text
                style={[styles.contactPillName, { color: colors.title }]}
                numberOfLines={2}
              >
                {contactName}
              </Text>
                </View>
              </View>

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
                  onPress={() => setShowDatePicker(true)}
                />

                {showDatePicker ? (
                  <DateTimePicker
                    value={date || new Date()}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onDateChange}
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
                  onPress={() => setShowStartTimePicker(true)}
                />

                {showStartTimePicker ? (
                  <DateTimePicker
                    value={startTime || new Date()}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onStartTimeChange}
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
                      onPress={() => setShowEndDatePicker(true)}
                    />

                    {showEndDatePicker ? (
                      <DateTimePicker
                        value={endDate || date || new Date()}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={onEndDateChange}
                      />
                    ) : null}
                  </FieldGroup>

                  <FieldGroup label="End time" hint="Optional" colors={colors}>
                    <PickerField
                      icon="time-outline"
                      value={endTimeString}
                      placeholder="No end time"
                      colors={colors}
                      onPress={() => setShowEndTimePicker(true)}
                    />

                    {showEndTimePicker ? (
                      <DateTimePicker
                        value={endTime || new Date()}
                        mode="time"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={onEndTimeChange}
                      />
                    ) : null}
                  </FieldGroup>
                </View>
              ) : null}

              <Divider colors={colors} />

              <SectionTitle
                icon="power-outline"
                title="Status"
                colors={colors}
              />

              <View style={styles.repeatRow}>
                <RepeatChip
                  label="Active"
                  icon="checkmark-circle-outline"
                  selected={isActive}
                  colors={colors}
                  onPress={() => setIsActive(true)}
                />

                <RepeatChip
                  label="Paused"
                  icon="pause-circle-outline"
                  selected={!isActive}
                  colors={colors}
                  onPress={() => setIsActive(false)}
                />
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
                  styles.primaryButton,
                  { backgroundColor: colors.button },
                  saving && styles.primaryButtonDisabled,
                ]}
                onPress={onSave}
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
                    Save changes
                  </Text>
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
  selectedType,
  isActive,
}: {
  colors: EditEventColors;
  contactName: string;
  selectedType: EventTypeOption;
  isActive: boolean;
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
        <View style={styles.headerIconBubble}>
          <Text style={styles.headerEmoji}>{selectedType.icon}</Text>
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>EDIT MOMENT</Text>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Edit event
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={1}>
            For {contactName}
          </Text>
        </View>

        <View style={styles.statusPill}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isActive ? colors.success : colors.warning },
            ]}
          />

          <Text style={styles.statusPillText}>
            {isActive ? "Active" : "Paused"}
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
  colors: EditEventColors;
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
  colors: EditEventColors;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.title }]}>
          {label}
        </Text>

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
  colors: EditEventColors;
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
  colors: EditEventColors;
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
  colors: EditEventColors;
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

function Divider({ colors }: { colors: EditEventColors }) {
  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: colors.border },
      ]}
    />
  );
}
function getInitials(name?: string | null) {
  const parts = (name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

async function refreshRemindersForEvent(
  eventId: AppId | string
): Promise<ReminderRefreshResult> {
  try {
    const reminders = await fetchReminders();
    const eventReminders = reminders.filter(
      (item) => String(item.event) === String(eventId)
    );

    if (eventReminders.length === 0) {
      return { total: 0, failed: 0, unscheduled: 0 };
    }

    const results = await Promise.allSettled(
      eventReminders.map((item) =>
        updateReminder(item.id, {
          event: eventId as any,
          is_active: item.is_active,
        } as any)
      )
    );

    let failed = 0;
    let unscheduled = 0;

    results.forEach((result) => {
      if (result.status === "rejected") {
        failed += 1;
        return;
      }

      if (result.value.is_active && !result.value.notification_id) {
        unscheduled += 1;
      }
    });

    return {
      total: eventReminders.length,
      failed,
      unscheduled,
    };
  } catch (error) {
    console.log("Refresh event reminder notifications failed:", error);

    return { total: 0, failed: 1, unscheduled: 0 };
  }
}

function getSaveMessage(result: ReminderRefreshResult) {
  if (result.total === 0) {
    return "Event updated.";
  }

  if (result.failed > 0) {
    return "Event updated, but some reminder notifications could not be refreshed.";
  }

  if (result.unscheduled > 0) {
    return "Event updated. Some reminders are saved in the app only because phone notifications were not scheduled.";
  }

  return "Event updated and reminder notifications refreshed.";
}

function makeEditEventColors(settings: any): EditEventColors {
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

const styles = StyleSheet.create({
  contactPhoto: {
  width: 36,
  height: 36,
  borderRadius: 15,
},

contactInitials: {
  fontSize: 12,
  fontWeight: "900",
},
contactPillName: {
  fontSize: 15,
  lineHeight: 20,
  fontWeight: "900",
  marginTop: 1,
},
  keyboardRoot: {
    flex: 1,
  },

  root: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "800",
  },

  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 90,
  },

  compactHeader: {
    minHeight: 122,
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
    fontSize: 27,
    lineHeight: 32,
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

  statusPill: {
    minHeight: 32,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statusPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
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
});