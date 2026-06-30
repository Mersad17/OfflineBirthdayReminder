// src/screens/Reminders/AddReminderScreen.tsx
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

import { createReminder } from "../../reminders/repository";
import { fetchEvents } from "../../events/repository";
import { EventDTO, EventTypeValue, EVENT_TYPE_META } from "../../events/types";
import { Screen } from "../../components/Screen";
import { AppId } from "../../contacts/types";
import { useAppearance } from "../../appearance/AppearanceContext";
import { formatDateEU } from "../../lib/date";
import { getEventTimeInfo } from "../../events/utils";

type AddReminderColors = {
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

export default function AddReminderScreen({ navigation }: any) {
  const { settings } = useAppearance();
  const colors = useMemo(() => makeAddReminderColors(settings), [settings]);

  const [events, setEvents] = useState<EventDTO[]>([]);
  const [eventId, setEventId] = useState<AppId | null>(null);

  const [days, setDays] = useState("3");
  const [timeOfDay, setTimeOfDay] = useState(createDefaultTime());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    let mounted = true;

    async function loadEvents() {
      try {
        const response = await fetchEvents();

        const results: EventDTO[] = Array.isArray(response)
          ? response
          : response.results ?? [];

        if (!mounted) return;

        setEvents(results);

        if (results.length > 0) {
          setEventId(results[0].id);
        }
      } catch (error) {
        console.log("Failed to load events", error);
        Alert.alert("Error", "Failed to load events.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    navigation.setOptions?.({
      headerShown: false,
    });
  }, [navigation]);

  const selectedEvent = useMemo(() => {
    if (!eventId) return null;

    return events.find((event) => event.id === eventId) ?? null;
  }, [eventId, events]);

  function onTimeChange(event: DateTimePickerEvent, selectedTime?: Date) {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }

    if (event.type === "dismissed" || !selectedTime) return;

    setTimeOfDay(selectedTime);
  }

  async function onSave() {
    if (saving) return;

    if (!eventId) {
      Alert.alert("Missing event", "Please select an event.");
      return;
    }

    const cleanDays = days.trim();
    const daysBefore = Number(cleanDays);

    if (!cleanDays || Number.isNaN(daysBefore) || daysBefore < 0) {
      Alert.alert("Invalid days", "Days before must be 0 or more.");
      return;
    }

    setSaving(true);

    try {
      const createdReminder = await createReminder(eventId, {
     days_before: daysBefore,
      absolute_datetime: null,
      time_of_day: formatHHMM(timeOfDay),
    });

    Alert.alert(
      "Success",
      createdReminder.notification_id
        ? "Reminder created and phone notification scheduled."
        : "Reminder saved in the app, but phone notification was not scheduled. Choose a future time or check notification permission.",
      [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.log("Failed to create reminder", error);

      const detail = error?.response?.data?.detail || error?.message;

      Alert.alert("Error", detail || "Failed to create reminder.");
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
              selectedEvent={selectedEvent}
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
                icon="calendar-outline"
                title="Choose event"
                colors={colors}
              />

              {loading ? (
                <View
                  style={[
                    styles.loadingBox,
                    {
                      backgroundColor: colors.softCard,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <ActivityIndicator color={colors.primary} />

                  <Text style={[styles.loadingText, { color: colors.text }]}>
                    Loading events…
                  </Text>
                </View>
              ) : events.length === 0 ? (
                <View
                  style={[
                    styles.emptyBox,
                    {
                      backgroundColor: colors.softCard,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.emptyIcon,
                      { backgroundColor: colors.softPrimary },
                    ]}
                  >
                    <Ionicons
                      name="calendar-clear-outline"
                      size={22}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.emptyTextWrap}>
                    <Text style={[styles.emptyTitle, { color: colors.title }]}>
                      No events found
                    </Text>

                    <Text style={[styles.emptyText, { color: colors.text }]}>
                      Create an event first, then come back to add a reminder.
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.eventList}>
                  {events.map((event) => (
                    <EventOption
                      key={String(event.id)}
                      event={event}
                      selected={eventId === event.id}
                      colors={colors}
                      onPress={() => setEventId(event.id)}
                    />
                  ))}
                </View>
              )}

              <Divider colors={colors} />

              <SectionTitle
                icon="notifications-outline"
                title="Reminder timing"
                colors={colors}
              />

              <FieldGroup label="Days before" required colors={colors}>
                <ThemedInput
                  value={days}
                  onChangeText={setDays}
                  placeholder="Example: 3"
                  keyboardType="numeric"
                  colors={colors}
                />
              </FieldGroup>

              <FieldGroup label="Time of day" colors={colors}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setShowTimePicker(true)}
                  style={[
                    styles.timeButton,
                    {
                      backgroundColor: colors.softCard,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.timeIcon,
                      { backgroundColor: colors.softPrimary },
                    ]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={17}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.timeTextWrap}>
                    <Text style={[styles.timeLabel, { color: colors.text }]}>
                      Notify at
                    </Text>

                    <Text style={[styles.timeValue, { color: colors.title }]}>
                      {formatHHMM(timeOfDay)}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color={colors.muted}
                  />
                </TouchableOpacity>

                {showTimePicker ? (
                  <View style={styles.pickerWrap}>
                    <DateTimePicker
                      value={timeOfDay}
                      mode="time"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={onTimeChange}
                    />

                    {Platform.OS === "ios" ? (
                      <TouchableOpacity
                        style={[
                          styles.donePickerButton,
                          { backgroundColor: colors.button },
                        ]}
                        onPress={() => setShowTimePicker(false)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.donePickerText,
                            { color: colors.buttonText },
                          ]}
                        >
                          Done
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
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
                  (!eventId || saving) && styles.primaryButtonDisabled,
                ]}
                onPress={onSave}
                disabled={saving || !eventId}
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
                      Save reminder
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
  selectedEvent,
  onBack,
}: {
  colors: AddReminderColors;
  selectedEvent: EventDTO | null;
  onBack: () => void;
}) {
  const meta = selectedEvent
    ? EVENT_TYPE_META[selectedEvent.type as EventTypeValue]
    : null;

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
          <Text style={styles.headerPillText}>Reminder</Text>
        </View>
      </View>

      <View style={styles.headerMainRow}>
        <View style={styles.headerIconBubble}>
          <Text style={styles.headerEmoji}>{meta?.icon ?? "🔔"}</Text>
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>NEW REMINDER</Text>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Add reminder
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={2}>
            {selectedEvent
              ? selectedEvent.title || "Selected event"
              : "Choose an event and decide when you want to be notified."}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function EventOption({
  event,
  selected,
  colors,
  onPress,
}: {
  event: EventDTO;
  selected: boolean;
  colors: AddReminderColors;
  onPress: () => void;
}) {
  const meta = EVENT_TYPE_META[event.type as EventTypeValue];
  const timeInfo = getEventTimeInfo(event);

  const dateLabel = event.next_occurrence
    ? formatDateEU(event.next_occurrence)
    : event.start_date
    ? formatDateEU(event.start_date)
    : "No date";

  return (
    <TouchableOpacity
      style={[
        styles.eventOption,
        {
          backgroundColor: selected ? colors.softPrimary : colors.softCard,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <View
        style={[
          styles.eventIcon,
          {
            backgroundColor: selected
              ? colors.primary
              : withOpacity(colors.primary, "16"),
          },
        ]}
      >
        <Text style={styles.eventEmoji}>{meta?.icon ?? "✨"}</Text>
      </View>

      <View style={styles.eventTextWrap}>
        <Text
          style={[styles.eventTitle, { color: colors.title }]}
          numberOfLines={1}
        >
          {event.title || "Untitled event"}
        </Text>

        <Text
          style={[styles.eventMeta, { color: colors.text }]}
          numberOfLines={1}
        >
          {event.contact_name || "Contact"} · {dateLabel}
        </Text>

        {timeInfo?.main ? (
          <Text
            style={[styles.eventSubMeta, { color: colors.text }]}
            numberOfLines={1}
          >
            {timeInfo.main}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.radioCircle,
          {
            borderColor: selected ? colors.primary : colors.border,
            backgroundColor: selected ? colors.primary : "transparent",
          },
        ]}
      >
        {selected ? (
          <Ionicons name="checkmark" size={14} color={colors.buttonText} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function SectionTitle({
  icon,
  title,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  colors: AddReminderColors;
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
  required,
  colors,
  children,
}: {
  label: string;
  required?: boolean;
  colors: AddReminderColors;
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
  colors: AddReminderColors;
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

function Divider({ colors }: { colors: AddReminderColors }) {
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

function makeAddReminderColors(settings: any): AddReminderColors {
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

function createDefaultTime() {
  const date = new Date();
  date.setHours(9);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date;
}

function formatHHMM(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
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
    justifyContent: "space-between",
    alignItems: "center",
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

  loadingBox: {
    minHeight: 76,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  loadingText: {
    fontSize: 12,
    fontWeight: "800",
  },

  emptyBox: {
    minHeight: 90,
    borderRadius: 22,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 3,
  },

  eventList: {
    gap: 8,
  },

  eventOption: {
    minHeight: 78,
    borderRadius: 22,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  eventIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  eventEmoji: {
    fontSize: 19,
  },

  eventTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  eventTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  eventMeta: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.76,
    marginTop: 2,
  },

  eventSubMeta: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
    opacity: 0.66,
    marginTop: 1,
  },

  radioCircle: {
    width: 26,
    height: 26,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
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

  input: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
  },

  timeButton: {
    minHeight: 58,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  timeIcon: {
    width: 36,
    height: 36,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  timeTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  timeLabel: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    opacity: 0.68,
  },

  timeValue: {
    fontSize: 15,
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

  donePickerText: {
    fontSize: 14,
    fontWeight: "900",
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