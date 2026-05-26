// src/screens/Events/EventDetails.tsx
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "@react-navigation/native";

import { EventsStackParamList } from "../../navigation/EventsStack";
import { fetchEventById, deleteEvent } from "../../events/repository";
import {
  createReminder,
  updateReminder,
  deleteReminder,
} from "../../reminders/repository";
import { EVENT_TYPE_META, EventDTO, EventTypeValue } from "../../events/types";
import { formatDateTime } from "../../reminders/utils";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { formatDateEU } from "../../lib/date";
import { getEventTimeInfo } from "../../events/utils";
import { AppId } from "../../contacts/types";

type Props = NativeStackScreenProps<EventsStackParamList, "EventDetails">;

type ReminderFormData = {
  days_before: number | null;
  absolute_datetime: string | null;
  time_of_day?: string | null;
};

type EventDetailsColors = {
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
  dangerSoft: string;
  warning: string;
  success: string;
  shadow: string;
};

function makeEventDetailsColors(settings: any): EventDetailsColors {
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
    dangerSoft: "#FEE2E2",
    warning: "#EBA55B",
    success: "#7DA56D",
    shadow: settings.themeMode === "dark" ? "#000000" : "#6F3D2E",
  };
}

export default function EventDetails({ route, navigation }: Props) {
  const { eventId, eventTitle, from, contactId } = route.params;

  const { settings } = useAppearance();
  const colors = useMemo(() => makeEventDetailsColors(settings), [settings]);

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventDTO | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<any | null>(null);

  const isFocused = useIsFocused();

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  async function load() {
    setLoading(true);

    try {
      const data = await fetchEventById(eventId);
      setEvent(data);
    } catch (error) {
      console.log("Failed to load event:", error);
      Alert.alert("Error", "Failed to load event.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [eventId]);

  useEffect(() => {
    if (isFocused) {
      load();
    }
  }, [isFocused]);

  function openEdit() {
    if (!event) return;

    navigation.navigate("EditEvent", {
      eventId,
      eventTitle: event.title || eventTitle,
      from,
      contactId,
    });
  }

  function confirmDelete() {
    if (!event) return;

    Alert.alert(
      "Delete event?",
      "This event and its reminders will be removed.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEvent(event.id);

              if (from === "events") {
                navigation.navigate("EventsList");
              } else {
                navigation.goBack();
              }
            } catch (error) {
              console.log("Delete event failed:", error);
              Alert.alert("Error", "Could not delete event.");
            }
          },
        },
      ]
    );
  }

  async function confirmDeleteReminder(id: AppId) {
    Alert.alert("Delete reminder?", "This reminder will be removed.", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteReminder(id);

            const updated = await fetchEventById(eventId);
            setEvent(updated);
          } catch (error) {
            console.log("Delete reminder failed:", error);
            Alert.alert("Error", "Could not delete reminder.");
          }
        },
      },
    ]);
  }

  async function saveReminder(data: ReminderFormData) {
    if (!event) return;

    try {
      if (editingReminder) {
        await updateReminder(editingReminder.id, data);
      } else {
        await createReminder(event.id, data);
      }

      const updated = await fetchEventById(eventId);
      setEvent(updated);
    } catch (error) {
      console.log("Save reminder failed:", error);
      Alert.alert("Error", "Could not save reminder.");
    } finally {
      setShowModal(false);
      setEditingReminder(null);
    }
  }

  if (loading || !event) {
    return (
      <Screen>
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          {loading ? (
            <>
              <ActivityIndicator color={colors.primary} />

              <Text style={[styles.loadingText, { color: colors.text }]}>
                Loading event…
              </Text>
            </>
          ) : (
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Event not found.
            </Text>
          )}
        </View>
      </Screen>
    );
  }

  const timeInfo = getEventTimeInfo(event);
  const reminders = event.reminders ?? [];
  const countdownText = getCountdownText(event.days_until);
  const meta = getEventMeta(event.type);

  return (
    <Screen>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.page}
          showsVerticalScrollIndicator={false}
        >
          <CompactEventHeader
            colors={colors}
            event={event}
            meta={meta}
            countdownText={countdownText}
            onBack={() => navigation.goBack()}
            onEdit={openEdit}
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
              icon="information-circle-outline"
              title="Event details"
              colors={colors}
            />

            <DetailRow
              icon="sparkles-outline"
              label="Type"
              value={meta.label}
              colors={colors}
            />

            <DetailRow
              icon="power-outline"
              label="Status"
              value={event.is_active ? "Active" : "Paused"}
              colors={colors}
              valueColor={event.is_active ? colors.success : colors.warning}
            />

            <View
              style={[
                styles.scheduleBox,
                {
                  backgroundColor: colors.softCard,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.scheduleHeader}>
                <View
                  style={[
                    styles.scheduleIcon,
                    { backgroundColor: colors.softPrimary },
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={17}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.scheduleTitleWrap}>
                  <Text style={[styles.scheduleTitle, { color: colors.title }]}>
                    Schedule
                  </Text>

                  <Text style={[styles.scheduleMain, { color: colors.text }]}>
                    {timeInfo?.main ?? "—"}
                  </Text>
                </View>
              </View>

              {timeInfo?.sub ? (
                <Text style={[styles.scheduleSub, { color: colors.text }]}>
                  {timeInfo.sub}
                </Text>
              ) : null}

              <View
                style={[
                  styles.scheduleDivider,
                  { backgroundColor: colors.border },
                ]}
              />

              {event.next_occurrence ? (
                <Text style={[styles.scheduleNext, { color: colors.primary }]}>
                  Next occurrence · {formatDateEU(event.next_occurrence)}
                </Text>
              ) : (
                <Text style={[styles.scheduleNext, { color: colors.muted }]}>
                  No upcoming date
                </Text>
              )}
            </View>
          </View>

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
            <View style={styles.cardHeaderRow}>
              <SectionTitle
                icon="notifications-outline"
                title="Reminders"
                colors={colors}
                noMargin
              />

              <TouchableOpacity
                style={[
                  styles.addReminderButton,
                  {
                    backgroundColor: colors.softPrimary,
                    borderColor: withOpacity(colors.primary, "24"),
                  },
                ]}
                onPress={() => {
                  setEditingReminder(null);
                  setShowModal(true);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text
                  style={[
                    styles.addReminderButtonText,
                    { color: colors.primary },
                  ]}
                >
                  Add
                </Text>
              </TouchableOpacity>
            </View>

            {reminders.length === 0 ? (
              <View
                style={[
                  styles.emptyReminderBox,
                  {
                    backgroundColor: colors.softCard,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.emptyReminderIcon,
                    { backgroundColor: colors.softPrimary },
                  ]}
                >
                  <Ionicons
                    name="notifications-off-outline"
                    size={21}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.emptyReminderTextWrap}>
                  <Text
                    style={[
                      styles.emptyReminderTitle,
                      { color: colors.title },
                    ]}
                  >
                    No reminders yet
                  </Text>

                  <Text
                    style={[
                      styles.emptyReminderText,
                      { color: colors.text },
                    ]}
                  >
                    Add a reminder so you are notified before this moment.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.reminderList}>
                {reminders.map((reminder) => (
                  <ReminderRow
                    key={String(reminder.id)}
                    reminder={reminder}
                    colors={colors}
                    onPress={() => {
                      setEditingReminder(reminder);
                      setShowModal(true);
                    }}
                    onDelete={() => confirmDeleteReminder(reminder.id)}
                  />
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.deleteButton,
              {
                backgroundColor: withOpacity(colors.danger, "14"),
                borderColor: withOpacity(colors.danger, "35"),
              },
            ]}
            onPress={confirmDelete}
            activeOpacity={0.85}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color={colors.danger}
            />
            <Text style={[styles.deleteButtonText, { color: colors.danger }]}>
              Delete event
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <ReminderModal
          visible={showModal}
          initial={editingReminder}
          colors={colors}
          onClose={() => {
            setShowModal(false);
            setEditingReminder(null);
          }}
          onSave={saveReminder}
        />
      </View>
    </Screen>
  );
}

function ReminderModal({
  visible,
  onClose,
  onSave,
  initial,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: ReminderFormData) => void;
  initial?: {
    days_before: number | null;
    absolute_datetime: string | number | null;
    time_of_day?: string | null;
  } | null;
  colors: EventDetailsColors;
}) {
  const [daysBefore, setDaysBefore] = useState<number | null>(null);
  const [absoluteDate, setAbsoluteDate] = useState(new Date());
  const [relativeTime, setRelativeTime] = useState(createDefaultTime());

  const [mode, setMode] = useState<"relative" | "absolute">("relative");

  const [showRelativeTimePicker, setShowRelativeTimePicker] = useState(false);
  const [showAbsoluteDatePicker, setShowAbsoluteDatePicker] = useState(false);
  const [showAbsoluteTimePicker, setShowAbsoluteTimePicker] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const hasRelative = initial?.days_before !== null && initial?.days_before !== undefined;
    const hasAbsolute = initial?.absolute_datetime !== null && initial?.absolute_datetime !== undefined;

    setMode(hasRelative ? "relative" : hasAbsolute ? "absolute" : "relative");
    setDaysBefore(hasRelative ? Number(initial?.days_before) : null);
    setAbsoluteDate(dateFromAny(initial?.absolute_datetime) ?? new Date());
    setRelativeTime(timeFromString(initial?.time_of_day) ?? createDefaultTime());

    setShowRelativeTimePicker(false);
    setShowAbsoluteDatePicker(false);
    setShowAbsoluteTimePicker(false);
  }, [visible, initial]);

  function handleSave() {
    if (mode === "relative") {
      if (daysBefore === null || Number.isNaN(daysBefore) || daysBefore < 0) {
        Alert.alert("Validation", "Enter how many days before.");
        return;
      }

      onSave({
        days_before: daysBefore,
        absolute_datetime: null,
        time_of_day: formatHHMM(relativeTime),
      });

      return;
    }

    onSave({
      days_before: null,
      absolute_datetime: absoluteDate.toISOString(),
      time_of_day: null,
    });
  }

  function onAbsoluteDateChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") {
      setShowAbsoluteDatePicker(false);
    }

    if (!selected) return;

    const next = new Date(absoluteDate);
    next.setFullYear(selected.getFullYear());
    next.setMonth(selected.getMonth());
    next.setDate(selected.getDate());

    setAbsoluteDate(next);
  }

  function onAbsoluteTimeChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") {
      setShowAbsoluteTimePicker(false);
    }

    if (!selected) return;

    const next = new Date(absoluteDate);
    next.setHours(selected.getHours());
    next.setMinutes(selected.getMinutes());
    next.setSeconds(0);
    next.setMilliseconds(0);

    setAbsoluteDate(next);
  }

  function onRelativeTimeChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") {
      setShowRelativeTimePicker(false);
    }

    if (selected) {
      setRelativeTime(selected);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            modalStyles.container,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={modalStyles.modalHeader}>
            <View
              style={[
                modalStyles.modalIcon,
                { backgroundColor: colors.softPrimary },
              ]}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={colors.primary}
              />
            </View>

            <View style={modalStyles.modalTitleWrap}>
              <Text style={[modalStyles.eyebrow, { color: colors.primary }]}>
                REMINDER
              </Text>

              <Text style={[modalStyles.title, { color: colors.title }]}>
                {initial ? "Edit reminder" : "Add reminder"}
              </Text>
            </View>
          </View>

          <View
            style={[
              modalStyles.toggleRow,
              { backgroundColor: colors.softCard },
            ]}
          >
            <ModeButton
              label="Days before"
              selected={mode === "relative"}
              colors={colors}
              onPress={() => setMode("relative")}
            />

            <ModeButton
              label="Exact date"
              selected={mode === "absolute"}
              colors={colors}
              onPress={() => setMode("absolute")}
            />
          </View>

          {mode === "relative" ? (
            <>
              <FieldLabel label="Days before" colors={colors} />

              <ThemedInput
                value={daysBefore !== null ? String(daysBefore) : ""}
                onChangeText={(value) =>
                  setDaysBefore(value.trim() ? Number(value) : null)
                }
                placeholder="Example: 3"
                keyboardType="numeric"
                colors={colors}
              />

              <FieldLabel label="Time of day" colors={colors} />

              <TouchableOpacity
                style={[
                  modalStyles.pickerField,
                  {
                    backgroundColor: colors.softCard,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowRelativeTimePicker(true)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    modalStyles.pickerFieldText,
                    { color: colors.title },
                  ]}
                >
                  {formatHHMM(relativeTime)}
                </Text>

                <Ionicons
                  name="time-outline"
                  size={18}
                  color={colors.primary}
                />
              </TouchableOpacity>

              {showRelativeTimePicker ? (
                <DateTimePicker
                  value={relativeTime}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onRelativeTimeChange}
                />
              ) : null}
            </>
          ) : (
            <>
              <FieldLabel label="Exact date" colors={colors} />

              <TouchableOpacity
                style={[
                  modalStyles.pickerField,
                  {
                    backgroundColor: colors.softCard,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowAbsoluteDatePicker(true)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    modalStyles.pickerFieldText,
                    { color: colors.title },
                  ]}
                >
                  {formatDateEU(toYMD(absoluteDate))}
                </Text>

                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={colors.primary}
                />
              </TouchableOpacity>

              {showAbsoluteDatePicker ? (
                <DateTimePicker
                  value={absoluteDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onAbsoluteDateChange}
                />
              ) : null}

              <FieldLabel label="Exact time" colors={colors} />

              <TouchableOpacity
                style={[
                  modalStyles.pickerField,
                  {
                    backgroundColor: colors.softCard,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowAbsoluteTimePicker(true)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    modalStyles.pickerFieldText,
                    { color: colors.title },
                  ]}
                >
                  {formatHHMM(absoluteDate)}
                </Text>

                <Ionicons
                  name="time-outline"
                  size={18}
                  color={colors.primary}
                />
              </TouchableOpacity>

              {showAbsoluteTimePicker ? (
                <DateTimePicker
                  value={absoluteDate}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onAbsoluteTimeChange}
                />
              ) : null}
            </>
          )}

          <View style={modalStyles.actions}>
            <TouchableOpacity
              style={[
                modalStyles.cancelButton,
                {
                  backgroundColor: colors.softCard,
                  borderColor: colors.border,
                },
              ]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={[modalStyles.cancelText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                modalStyles.saveButton,
                { backgroundColor: colors.button },
              ]}
              onPress={handleSave}
              activeOpacity={0.88}
            >
              <Text
                style={[
                  modalStyles.saveText,
                  { color: colors.buttonText },
                ]}
              >
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CompactEventHeader({
  colors,
  event,
  meta,
  countdownText,
  onBack,
  onEdit,
}: {
  colors: EventDetailsColors;
  event: EventDTO;
  meta: { icon?: string; label?: string };
  countdownText: string | null;
  onBack: () => void;
  onEdit: () => void;
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

        <TouchableOpacity
          style={styles.headerEditButton}
          onPress={onEdit}
          activeOpacity={0.85}
        >
          <Ionicons name="pencil-outline" size={15} color="#FFFFFF" />
          <Text style={styles.headerEditText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.headerMainRow}>
        <View style={styles.headerIconBubble}>
          <Text style={styles.headerEmoji}>{meta.icon ?? "🎉"}</Text>
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>EVENT DETAILS</Text>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {event.title || "Untitled event"}
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={1}>
            For {event.contact_name || "Contact"}
          </Text>
        </View>
      </View>

      {countdownText ? (
        <View style={styles.countdownPill}>
          <Ionicons name="time-outline" size={13} color="#FFFFFF" />
          <Text style={styles.countdownText}>{countdownText}</Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

function SectionTitle({
  icon,
  title,
  colors,
  noMargin,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  colors: EventDetailsColors;
  noMargin?: boolean;
}) {
  return (
    <View style={[styles.sectionTitleRow, noMargin && { marginBottom: 0 }]}>
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

function DetailRow({
  icon,
  label,
  value,
  colors,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  colors: EventDetailsColors;
  valueColor?: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>
        <View
          style={[
            styles.detailIcon,
            { backgroundColor: colors.softPrimary },
          ]}
        >
          <Ionicons name={icon} size={15} color={colors.primary} />
        </View>

        <Text style={[styles.detailLabel, { color: colors.text }]}>
          {label}
        </Text>
      </View>

      <Text
        style={[
          styles.detailValue,
          { color: valueColor || colors.title },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function ReminderRow({
  reminder,
  colors,
  onPress,
  onDelete,
}: {
  reminder: any;
  colors: EventDetailsColors;
  onPress: () => void;
  onDelete: () => void;
}) {
  const isRelative =
    reminder.days_before !== null && reminder.days_before !== undefined;

  return (
    <TouchableOpacity
      style={[
        styles.reminderItem,
        {
          backgroundColor: colors.softCard,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <View
        style={[
          styles.reminderIcon,
          { backgroundColor: colors.softPrimary },
        ]}
      >
        <Ionicons
          name={isRelative ? "alarm-outline" : "calendar-outline"}
          size={17}
          color={colors.primary}
        />
      </View>

      <View style={styles.reminderContent}>
        <Text style={[styles.reminderText, { color: colors.title }]}>
          {isRelative
            ? `Remind ${reminder.days_before} ${
                reminder.days_before === 1 ? "day" : "days"
              } before`
            : "Exact reminder"}
        </Text>

        {reminder.time_of_day && isRelative ? (
          <Text style={[styles.reminderSub, { color: colors.text }]}>
            At {reminder.time_of_day}
          </Text>
        ) : null}

        {reminder.send_at ? (
          <Text style={[styles.reminderSub, { color: colors.text }]}>
            Scheduled · {formatDateTime(reminder.send_at)}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={[
          styles.reminderDeleteButton,
          { backgroundColor: withOpacity(colors.danger, "12") },
        ]}
        onPress={onDelete}
        activeOpacity={0.85}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={16} color={colors.danger} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function ModeButton({
  label,
  selected,
  colors,
  onPress,
}: {
  label: string;
  selected: boolean;
  colors: EventDetailsColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        modalStyles.toggleButton,
        {
          backgroundColor: selected ? colors.primary : "transparent",
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text
        style={[
          modalStyles.toggleText,
          { color: selected ? colors.buttonText : colors.text },
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
  colors: EventDetailsColors;
}) {
  return (
    <Text style={[modalStyles.label, { color: colors.title }]}>
      {label}
    </Text>
  );
}

function ThemedInput({
  colors,
  style,
  ...props
}: TextInputProps & {
  colors: EventDetailsColors;
}) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={colors.muted}
      style={[
        modalStyles.input,
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

/* helpers */

function getEventMeta(type: number) {
  const meta = EVENT_TYPE_META[type as EventTypeValue];

  return {
    icon: meta?.icon ?? "🎉",
    label: meta?.label ?? "Event",
  };
}

function getCountdownText(daysUntil?: number | null) {
  if (daysUntil === null || daysUntil === undefined) return null;
  if (daysUntil < 0 || daysUntil >= 30) return null;
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "Tomorrow";
  if (daysUntil < 7) return `In ${daysUntil} days`;

  return `In ${Math.ceil(daysUntil / 7)} weeks`;
}

function createDefaultTime() {
  const date = new Date();
  date.setHours(9);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date;
}

function timeFromString(value?: string | null) {
  if (!value) return null;

  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date;
}

function dateFromAny(value?: string | number | null) {
  if (value === null || value === undefined) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatHHMM(date: Date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
}

function toYMD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
  root: {
    flex: 1,
  },

  page: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 90,
    gap: 12,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "800",
  },

  compactHeader: {
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

  headerEditButton: {
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

  headerEditText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },

  headerMainRow: {
    marginTop: 16,
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
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 2,
  },

  countdownPill: {
    alignSelf: "flex-start",
    minHeight: 32,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 10,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  countdownText: {
    color: "#FFFFFF",
    fontSize: 12,
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

  cardHeaderRow: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
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

  detailRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  detailLabel: {
    fontSize: 13,
    fontWeight: "800",
    opacity: 0.76,
  },

  detailValue: {
    flex: 1,
    minWidth: 0,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "900",
  },

  scheduleBox: {
    marginTop: 10,
    borderRadius: 22,
    borderWidth: 1,
    padding: 13,
  },

  scheduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  scheduleIcon: {
    width: 38,
    height: 38,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  scheduleTitleWrap: {
    flex: 1,
    minWidth: 0,
  },

  scheduleTitle: {
    fontSize: 13,
    fontWeight: "900",
  },

  scheduleMain: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    opacity: 0.78,
    marginTop: 2,
  },

  scheduleSub: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 9,
  },

  scheduleDivider: {
    height: 1,
    marginVertical: 11,
  },

  scheduleNext: {
    fontSize: 13,
    fontWeight: "900",
  },

  addReminderButton: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  addReminderButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },

  emptyReminderBox: {
    minHeight: 86,
    borderRadius: 22,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  emptyReminderIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyReminderTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  emptyReminderTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  emptyReminderText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 3,
  },

  reminderList: {
    gap: 8,
  },

  reminderItem: {
    minHeight: 74,
    borderRadius: 22,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  reminderIcon: {
    width: 38,
    height: 38,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  reminderContent: {
    flex: 1,
    minWidth: 0,
  },

  reminderText: {
    fontSize: 14,
    fontWeight: "900",
  },

  reminderSub: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
  },

  reminderDeleteButton: {
    width: 34,
    height: 34,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  deleteButton: {
    minHeight: 52,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  deleteButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(20, 14, 10, 0.52)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },

  container: {
    width: "100%",
    maxWidth: 390,
    borderRadius: 30,
    borderWidth: 1,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 16,
  },

  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  modalTitleWrap: {
    flex: 1,
    minWidth: 0,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  title: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "900",
    marginTop: 2,
  },

  toggleRow: {
    flexDirection: "row",
    borderRadius: 999,
    padding: 4,
    marginBottom: 14,
  },

  toggleButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  toggleText: {
    fontSize: 12,
    fontWeight: "900",
  },

  label: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 12,
    marginBottom: 7,
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

  pickerField: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  pickerFieldText: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "800",
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },

  cancelButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    fontSize: 14,
    fontWeight: "900",
  },

  saveButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  saveText: {
    fontSize: 14,
    fontWeight: "900",
  },
});