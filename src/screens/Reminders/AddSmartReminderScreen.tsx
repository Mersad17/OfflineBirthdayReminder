import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { AppId, Contact } from "../../contacts/types";
import {
  fetchContactById,
  fetchContacts,
} from "../../contacts/repository";

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

const QUICK_DAY_OPTIONS = [
  { label: "Tomorrow", days: 1 },
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
];

function normalizeContactsResponse(data: any): Contact[] {
  if (Array.isArray(data)) return data;
  return data?.results ?? [];
}

function fullName(contact?: Contact | null) {
  if (!contact) return "";
  return `${contact.first_name || ""} ${contact.last_name || ""}`.trim();
}

function todayStart() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function defaultTimeDate() {
  const date = new Date();
  date.setHours(9, 0, 0, 0);
  return date;
}

function toYMD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function toTimeOfDay(date: Date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");

  return `${h}:${m}`;
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

export default function AddSmartReminderScreen({ route, navigation }: Props) {
  const { settings } = useAppearance();

  const initialContactId = route.params?.contactId;
  const initialContactName = route.params?.contactName;
  const initialNote = route.params?.note;

  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(
    null
  );

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
    load();
  }, []);
React.useEffect(() => {
  if (initialNote) {
    setMessage(initialNote);
  }
}, [initialNote]);
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

  function onDateChange(_: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (!selectedDate) return;

    setCustomDate(selectedDate);
  }

  function onTimeChange(_: DateTimePickerEvent, selectedTime?: Date) {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }

    if (!selectedTime) return;

    setTimeDate(selectedTime);
  }

  async function onSave() {
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
        <View style={styles.center}>
          <ActivityIndicator color={settings.primaryColor} />
          <Text style={[styles.loadingText, { color: settings.textColor }]}>
            Loading smart reminder…
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.title, { color: settings.titleColor }]}>
          Smart Reminder
        </Text>

        <Text style={[styles.subtitle, { color: settings.textColor }]}>
          Create a reminder connected to a person.
        </Text>

        <View style={[styles.card, { backgroundColor: settings.cardColor }]}>
          <Text style={[styles.label, { color: settings.titleColor }]}>
            Who is this for?
          </Text>

          {initialContactId ? (
            <View style={styles.selectedContactBox}>
              <Ionicons
                name="person-circle-outline"
                size={22}
                color={settings.primaryColor}
              />

              <Text
                style={[
                  styles.selectedContactText,
                  { color: settings.textColor },
                ]}
                numberOfLines={1}
              >
                {selectedContactName()}
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.contactChips}
            >
              {contacts.map((contact) => {
                const active = selectedContact?.id === contact.id;

                return (
                  <TouchableOpacity
                    key={String(contact.id)}
                    style={[
                      styles.contactChip,
                      {
                        borderColor: active
                          ? settings.primaryColor
                          : "#E5E7EB",
                        backgroundColor: active
                          ? settings.primaryColor + "16"
                          : "#FFFFFF",
                      },
                    ]}
                    onPress={() => setSelectedContact(contact)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.contactChipText,
                        {
                          color: active
                            ? settings.primaryColor
                            : settings.textColor,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {fullName(contact) || "Unnamed"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: settings.cardColor }]}>
          <Text style={[styles.label, { color: settings.titleColor }]}>
            Remind me to
          </Text>

          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Ask how the interview went"
            placeholderTextColor={settings.textColor + "66"}
            multiline
            textAlignVertical="top"
            style={[
              styles.textArea,
              {
                color: settings.textColor,
                borderColor: settings.textColor + "18",
              },
            ]}
          />
        </View>

        <View style={[styles.card, { backgroundColor: settings.cardColor }]}>
          <Text style={[styles.label, { color: settings.titleColor }]}>
            Reminder date
          </Text>

          <View style={styles.segment}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                timingMode === "relative" && {
                  backgroundColor: settings.primaryColor,
                },
              ]}
              onPress={() => setTimingMode("relative")}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      timingMode === "relative"
                        ? settings.buttonTextColor
                        : settings.textColor,
                  },
                ]}
              >
                In a few days
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentButton,
                timingMode === "custom_date" && {
                  backgroundColor: settings.primaryColor,
                },
              ]}
              onPress={() => setTimingMode("custom_date")}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.segmentText,
                  {
                    color:
                      timingMode === "custom_date"
                        ? settings.buttonTextColor
                        : settings.textColor,
                  },
                ]}
              >
                Custom date
              </Text>
            </TouchableOpacity>
          </View>

          {timingMode === "relative" ? (
            <View style={styles.optionRow}>
              {QUICK_DAY_OPTIONS.map((option) => (
                <OptionPill
                  key={option.days}
                  label={option.label}
                  active={selectedDays === option.days}
                  onPress={() => setSelectedDays(option.days)}
                  color={settings.primaryColor}
                />
              ))}
            </View>
          ) : (
            <View style={styles.customDateBox}>
              <Text style={[styles.smallLabel, { color: settings.textColor }]}>
                Date
              </Text>

              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  {
                    borderColor: settings.textColor + "18",
                    backgroundColor: "#FFFFFF",
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.85}
              >
                <View style={styles.pickerButtonLeft}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={settings.primaryColor}
                  />

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.pickerButtonLabel,
                        { color: settings.textColor },
                      ]}
                    >
                      Selected date
                    </Text>

                    <Text
                      style={[
                        styles.pickerButtonValue,
                        { color: settings.titleColor },
                      ]}
                      numberOfLines={1}
                    >
                      {formatDateForUser(customDate)}
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name="chevron-down"
                  size={18}
                  color={settings.textColor}
                />
              </TouchableOpacity>

              {showDatePicker ? (
                <DateTimePicker
                  value={customDate}
                  mode="date"
                  minimumDate={todayStart()}
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={onDateChange}
                />
              ) : null}

              {Platform.OS === "ios" && showDatePicker ? (
                <TouchableOpacity
                  style={[
                    styles.donePickerButton,
                    { backgroundColor: settings.primaryColor },
                  ]}
                  onPress={() => setShowDatePicker(false)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.donePickerButtonText,
                      { color: settings.buttonTextColor },
                    ]}
                  >
                    Done
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          <Text
            style={[
              styles.smallLabel,
              {
                color: settings.textColor,
                marginTop: 14,
              },
            ]}
          >
            Time
          </Text>

          <TouchableOpacity
            style={[
              styles.pickerButton,
              {
                borderColor: settings.textColor + "18",
                backgroundColor: "#FFFFFF",
              },
            ]}
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.85}
          >
            <View style={styles.pickerButtonLeft}>
              <Ionicons
                name="time-outline"
                size={20}
                color={settings.primaryColor}
              />

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.pickerButtonLabel,
                    { color: settings.textColor },
                  ]}
                >
                  Reminder time
                </Text>

                <Text
                  style={[
                    styles.pickerButtonValue,
                    { color: settings.titleColor },
                  ]}
                  numberOfLines={1}
                >
                  {formatTimeForUser(timeDate)}
                </Text>
              </View>
            </View>

            <Ionicons
              name="chevron-down"
              size={18}
              color={settings.textColor}
            />
          </TouchableOpacity>

          {showTimePicker ? (
            <DateTimePicker
              value={timeDate}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={onTimeChange}
            />
          ) : null}

          {Platform.OS === "ios" && showTimePicker ? (
            <TouchableOpacity
              style={[
                styles.donePickerButton,
                { backgroundColor: settings.primaryColor },
              ]}
              onPress={() => setShowTimePicker(false)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.donePickerButtonText,
                  { color: settings.buttonTextColor },
                ]}
              >
                Done
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View
          style={[styles.previewCard, { backgroundColor: settings.cardColor }]}
        >
          <Text style={[styles.previewLabel, { color: settings.textColor }]}>
            Preview
          </Text>

          <Text style={[styles.previewText, { color: settings.titleColor }]}>
            {previewText()}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor: settings.buttonColor,
              opacity: saving ? 0.6 : 1,
            },
          ]}
          disabled={saving}
          onPress={onSave}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.saveButtonText,
              { color: settings.buttonTextColor },
            ]}
          >
            {saving ? "Saving…" : "Create reminder"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

function OptionPill({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.optionPill,
        {
          borderColor: active ? color : "#E5E7EB",
          backgroundColor: active ? color + "16" : "#FFFFFF",
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text
        style={[
          styles.optionPillText,
          {
            color: active ? color : "#374151",
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 10,
    fontWeight: "700",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 14,
    opacity: 0.75,
    fontWeight: "600",
  },
  card: {
    borderRadius: 20,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  label: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
  },
  smallLabel: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 7,
    opacity: 0.75,
  },
  selectedContactBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  selectedContactText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  contactChips: {
    gap: 8,
  },
  contactChip: {
    maxWidth: 160,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  contactChipText: {
    fontSize: 13,
    fontWeight: "900",
  },
  textArea: {
    minHeight: 92,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    lineHeight: 21,
  },
  segment: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: "center",
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
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  optionPillText: {
    fontSize: 12,
    fontWeight: "900",
  },
  customDateBox: {
    marginTop: 2,
  },
  pickerButton: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerButtonLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pickerButtonLabel: {
    fontSize: 11,
    fontWeight: "700",
    opacity: 0.7,
  },
  pickerButtonValue: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: 2,
  },
  donePickerButton: {
    alignSelf: "flex-end",
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  donePickerButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },
  previewCard: {
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "800",
    opacity: 0.7,
  },
  previewText: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4,
  },
  saveButton: {
    marginTop: 16,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "900",
  },
});