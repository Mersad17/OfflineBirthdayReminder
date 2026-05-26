// src/screens/events/AddEventScreen.tsx
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { createEvent } from "../../events/repository";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { formatDateEU } from "../../lib/date";
import { AppId } from "../../contacts/types";

type Props = {
  navigation: any;
  route: {
    params?: {
      contactId?: AppId;
      contactName?: string;
    };
  };
};

type EventTypeValue = 1 | 2 | 3 | 4 | 5 | 6;

type EventTypeOption = {
  label: string;
  icon: string;
  value: EventTypeValue;
};

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

export default function AddEventScreen({ navigation, route }: Props) {
  const { settings } = useAppearance();
  const colors = useMemo(() => makeAddEventColors(settings), [settings]);

  const contactId = route?.params?.contactId;
  const contactName = route?.params?.contactName || "Selected contact";

  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventTypeValue>(1);

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

  const selectedTypeOption =
    EVENT_TYPE_OPTIONS.find((option) => option.value === type) ??
    EVENT_TYPE_OPTIONS[0];

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

  async function onSubmit() {
    if (!contactId) {
      Alert.alert("No contact", "A contact is required to create an event.");
      return;
    }

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
      await createEvent({
        contact: contactId,
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
      });

      Alert.alert("Success", "Event created.");
      navigation.goBack();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;

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
              selectedType={selectedTypeOption}
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
                <View
                  style={[
                    styles.contactIcon,
                    { backgroundColor: colors.softPrimary },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={16}
                    color={colors.primary}
                  />
                </View>

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
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function CompactHeader({
  colors,
  contactName,
  selectedType,
}: {
  colors: AddEventColors;
  contactName: string;
  selectedType: EventTypeOption;
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
  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: colors.border },
      ]}
    />
  );
}

/* helpers */

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