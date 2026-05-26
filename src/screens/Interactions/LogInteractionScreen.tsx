// src/screens/Interactions/LogInteractionScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
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
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import {
  createInteraction,
  updateInteraction,
} from "../../interactions/repository";
import { InteractionType } from "../../interactions/types";
import { ContactsStackParamList } from "../../navigation/ContactsStack";

type Props = NativeStackScreenProps<ContactsStackParamList, "LogInteraction">;

type LogInteractionColors = {
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
  purple: string;
  blue: string;
  shadow: string;
};

type InteractionTypeOption = {
  id: InteractionType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const INTERACTION_TYPES: InteractionTypeOption[] = [
  {
    id: InteractionType.CALL,
    label: "Call",
    icon: "call-outline",
  },
  {
    id: InteractionType.IN_PERSON,
    label: "In person",
    icon: "cafe-outline",
  },
  {
    id: InteractionType.MESSAGE,
    label: "Message",
    icon: "chatbubble-ellipses-outline",
  },
  {
    id: InteractionType.VIDEO,
    label: "Video",
    icon: "videocam-outline",
  },
  {
    id: InteractionType.OTHER,
    label: "Other",
    icon: "heart-outline",
  },
];

export default function LogInteractionScreen({ route, navigation }: Props) {
  const { contactId, interaction } = route.params;
  const isEdit = Boolean(interaction);

  const { settings } = useAppearance();
  const colors = useMemo(() => makeLogInteractionColors(settings), [settings]);

  const initialType = (interaction?.type ??
    InteractionType.OTHER) as InteractionType;

  const [type, setType] = useState<InteractionType>(initialType);
  const [note, setNote] = useState(interaction?.note ?? "");
  const [duration, setDuration] = useState(
    interaction?.duration_minutes?.toString() ?? ""
  );
  const [happenedAtDate, setHappenedAtDate] = useState(
    interaction ? new Date(interaction.happened_at) : new Date()
  );

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const selectedType =
    INTERACTION_TYPES.find((item) => item.id === type) ??
    INTERACTION_TYPES[INTERACTION_TYPES.length - 1];

  function openDatePicker() {
    setShowTimePicker(false);
    setShowDatePicker(true);
  }

  function openTimePicker() {
    setShowDatePicker(false);
    setShowTimePicker(true);
  }

  function onDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (event.type === "dismissed" || !selectedDate) return;

    setHappenedAtDate((current) => {
      const next = new Date(current);

      next.setFullYear(selectedDate.getFullYear());
      next.setMonth(selectedDate.getMonth());
      next.setDate(selectedDate.getDate());

      return next;
    });
  }

  function onTimeChange(event: DateTimePickerEvent, selectedTime?: Date) {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }

    if (event.type === "dismissed" || !selectedTime) return;

    setHappenedAtDate((current) => {
      const next = new Date(current);

      next.setHours(selectedTime.getHours());
      next.setMinutes(selectedTime.getMinutes());
      next.setSeconds(0);
      next.setMilliseconds(0);

      return next;
    });
  }

  async function handleSave() {
    if (saving) return;

    if (Number.isNaN(happenedAtDate.getTime())) {
      Alert.alert("Invalid date", "Please choose a valid date and time.");
      return;
    }

    if (happenedAtDate.getTime() > Date.now()) {
      Alert.alert(
        "Invalid date",
        "The interaction date cannot be in the future."
      );
      return;
    }

    const cleanDuration = duration.trim();

    if (cleanDuration && Number.isNaN(Number(cleanDuration))) {
      Alert.alert("Invalid duration", "Duration must be a number of minutes.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        happened_at: happenedAtDate.toISOString(),
        duration_minutes: cleanDuration ? Number(cleanDuration) : null,
        note: note.trim() || null,
        type,
      };

      if (isEdit && interaction) {
        await updateInteraction(interaction.id, payload);
      } else {
        await createInteraction({
          contact_id: contactId,
          ...payload,
        });
      }

      navigation.goBack();
    } catch (error) {
      console.log("Save interaction failed:", error);
      Alert.alert(
        "Interaction",
        isEdit
          ? "Could not update this interaction."
          : "Could not save this interaction."
      );
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
            contentContainerStyle={styles.content}
          >
            <CompactHeader
              colors={colors}
              isEdit={isEdit}
              selectedType={selectedType}
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
                icon="heart-outline"
                title="Interaction type"
                colors={colors}
              />

              <View style={styles.typeRow}>
                {INTERACTION_TYPES.map((item) => {
                  const selected = type === item.id;
                  const accent = getInteractionAccent(item.id, colors);

                  return (
                    <TouchableOpacity
                      key={String(item.id)}
                      onPress={() => setType(item.id)}
                      activeOpacity={0.85}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: selected
                            ? accent
                            : withOpacity(accent, "14"),
                          borderColor: selected
                            ? accent
                            : withOpacity(accent, "35"),
                        },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={15}
                        color={selected ? "#FFFFFF" : accent}
                      />

                      <Text
                        style={[
                          styles.typeChipText,
                          {
                            color: selected ? "#FFFFFF" : accent,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Divider colors={colors} />

              <SectionTitle
                icon="calendar-outline"
                title="When"
                colors={colors}
              />

              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={openDatePicker}
                  style={[
                    styles.dateTimeButton,
                    {
                      backgroundColor: colors.softCard,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.dateTimeIcon,
                      { backgroundColor: colors.softPrimary },
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.dateTimeTextWrap}>
                    <Text style={[styles.dateTimeLabel, { color: colors.text }]}>
                      Date
                    </Text>

                    <Text
                      style={[styles.dateTimeValue, { color: colors.title }]}
                      numberOfLines={1}
                    >
                      {formatReadableDate(happenedAtDate)}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={openTimePicker}
                  style={[
                    styles.dateTimeButton,
                    {
                      backgroundColor: colors.softCard,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.dateTimeIcon,
                      { backgroundColor: colors.softPrimary },
                    ]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.dateTimeTextWrap}>
                    <Text style={[styles.dateTimeLabel, { color: colors.text }]}>
                      Time
                    </Text>

                    <Text
                      style={[styles.dateTimeValue, { color: colors.title }]}
                      numberOfLines={1}
                    >
                      {formatReadableTime(happenedAtDate)}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {showDatePicker ? (
                <View style={styles.pickerWrap}>
                  <DateTimePicker
                    value={happenedAtDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                  />

                  {Platform.OS === "ios" ? (
                    <PickerDoneButton
                      colors={colors}
                      onPress={() => setShowDatePicker(false)}
                    />
                  ) : null}
                </View>
              ) : null}

              {showTimePicker ? (
                <View style={styles.pickerWrap}>
                  <DateTimePicker
                    value={happenedAtDate}
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

              <Divider colors={colors} />

              <SectionTitle
                icon="document-text-outline"
                title="Details"
                colors={colors}
              />

              <FieldGroup label="Note" hint="Optional" colors={colors}>
                <ThemedInput
                  placeholder="What was it about?"
                  value={note}
                  onChangeText={setNote}
                  multiline
                  textAlignVertical="top"
                  style={styles.noteInput}
                  colors={colors}
                />
              </FieldGroup>

              <FieldGroup
                label="Duration"
                hint="Optional minutes"
                colors={colors}
              >
                <ThemedInput
                  placeholder="Example: 30"
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="numeric"
                  colors={colors}
                />
              </FieldGroup>
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
                onPress={handleSave}
                disabled={saving}
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
                        styles.primaryButtonText,
                        { color: colors.buttonText },
                      ]}
                    >
                      {isEdit ? "Update interaction" : "Save interaction"}
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
  isEdit,
  selectedType,
  onBack,
}: {
  colors: LogInteractionColors;
  isEdit: boolean;
  selectedType: InteractionTypeOption;
  onBack: () => void;
}) {
  const accent = getInteractionAccent(selectedType.id, colors);

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
          <Ionicons
            name={isEdit ? "pencil-outline" : "add"}
            size={14}
            color="#FFFFFF"
          />

          <Text style={styles.headerPillText}>
            {isEdit ? "Edit" : "New log"}
          </Text>
        </View>
      </View>

      <View style={styles.headerMainRow}>
        <View
          style={[
            styles.headerIconBubble,
            { backgroundColor: withOpacity(accent, "30") },
          ]}
        >
          <Ionicons name={selectedType.icon} size={24} color="#FFFFFF" />
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>RELATIONSHIP MOMENT</Text>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {isEdit ? "Edit interaction" : "Log interaction"}
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={2}>
            Save calls, meetings, messages, and small moments you want to remember.
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
  colors: LogInteractionColors;
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
  colors,
  children,
}: {
  label: string;
  hint?: string;
  colors: LogInteractionColors;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.title }]}>
          {label}
        </Text>

        {hint ? (
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
  colors: LogInteractionColors;
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

function PickerDoneButton({
  colors,
  onPress,
}: {
  colors: LogInteractionColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.donePickerButton, { backgroundColor: colors.button }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.donePickerText, { color: colors.buttonText }]}>
        Done
      </Text>
    </TouchableOpacity>
  );
}

function Divider({ colors }: { colors: LogInteractionColors }) {
  return (
    <View
      style={[
        styles.divider,
        {
          backgroundColor: colors.border,
        },
      ]}
    />
  );
}

/* helpers */

function makeLogInteractionColors(settings: any): LogInteractionColors {
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
    purple: "#8A6BD8",
    blue: "#4D82D8",
    shadow: settings.themeMode === "dark" ? "#000000" : "#6F3D2E",
  };
}

function getInteractionAccent(
  type: InteractionType,
  colors: LogInteractionColors
) {
  switch (type) {
    case InteractionType.CALL:
      return colors.success;
    case InteractionType.IN_PERSON:
      return colors.warning;
    case InteractionType.MESSAGE:
      return colors.blue;
    case InteractionType.VIDEO:
      return colors.purple;
    case InteractionType.OTHER:
    default:
      return colors.primary;
  }
}

function formatReadableDate(date: Date) {
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatReadableTime(date: Date) {
  if (Number.isNaN(date.getTime())) return "Invalid time";

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

  typeChipText: {
    fontSize: 12,
    fontWeight: "900",
  },

  divider: {
    height: 1,
    marginVertical: 18,
  },

  dateTimeRow: {
    flexDirection: "row",
    gap: 10,
  },

  dateTimeButton: {
    flex: 1,
    minHeight: 64,
    borderRadius: 20,
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  dateTimeIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  dateTimeTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  dateTimeLabel: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    opacity: 0.68,
  },

  dateTimeValue: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    marginTop: 2,
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

  donePickerText: {
    fontSize: 14,
    fontWeight: "900",
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

  noteInput: {
    minHeight: 104,
    paddingTop: 12,
    lineHeight: 20,
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

  primaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  primaryButtonDisabled: {
    opacity: 0.6,
  },

  primaryButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
});