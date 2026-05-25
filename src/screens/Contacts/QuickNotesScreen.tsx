import React from "react";
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
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ContactsStackParamList } from "../../navigation/ContactsStack";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { Contact } from "../../contacts/types";
import { fetchContactById, updateContact } from "../../contacts/repository";
import { createContactMemory } from "../../memories/repository";
import { createInteraction } from "../../interactions/repository";

type Props = NativeStackScreenProps<ContactsStackParamList, "QuickNote">;

const INTERACTION_TYPE_MEETING = 2;

function toYMD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatReadableDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function contactFullName(contact?: Contact | null, fallback?: string) {
  const name = `${contact?.first_name || ""} ${contact?.last_name || ""}`.trim();

  return name || fallback || "Contact";
}

export default function QuickNoteScreen({ route, navigation }: Props) {
  const { contactId, contactName } = route.params;
  const { settings } = useAppearance();

  const primary = settings.primaryColor || "#EE6A5E";
  const card = settings.cardColor || "#FFFFFF";
  const text = settings.textColor || "#5F5148";
  const title = settings.titleColor || "#2B211B";
  const button = settings.buttonColor || primary;
  const buttonText = settings.buttonTextColor || "#FFFFFF";

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [contact, setContact] = React.useState<Contact | null>(null);

  const [happenedAt, setHappenedAt] = React.useState(new Date());
  const [showDatePicker, setShowDatePicker] = React.useState(false);

  const [saveInteraction, setSaveInteraction] = React.useState(true);
  const [saveImportant, setSaveImportant] = React.useState(true);
  const [saveAskNext, setSaveAskNext] = React.useState(true);

  const [interactionNote, setInteractionNote] = React.useState("");
  const [importantMemory, setImportantMemory] = React.useState("");
  const [askNextTime, setAskNextTime] = React.useState("");

  React.useEffect(() => {
    navigation.setOptions({
      title: "Quick note",
    });
  }, [navigation]);

  React.useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await fetchContactById(contactId as any);

        if (active) {
          setContact(data);
        }
      } catch (error) {
        console.log("Quick note contact load failed:", error);
        Alert.alert("Quick note", "Could not load this contact.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [contactId]);

  function onDateChange(_: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (!selectedDate) return;

    setHappenedAt(selectedDate);
  }

  async function saveQuickNote() {
    const cleanInteraction = interactionNote.trim();
    const cleanImportant = importantMemory.trim();
    const cleanAskNext = askNextTime.trim();

    const shouldSaveInteraction = saveInteraction && cleanInteraction.length > 0;
    const shouldSaveImportant = saveImportant && cleanImportant.length > 0;
    const shouldSaveAskNext = saveAskNext && cleanAskNext.length > 0;

    if (!shouldSaveInteraction && !shouldSaveImportant && !shouldSaveAskNext) {
      Alert.alert(
        "Nothing to save",
        "Write at least one note, memory, or ask-next-time item."
      );
      return;
    }

    setSaving(true);

    try {
      if (shouldSaveInteraction) {
       await createInteraction({
            contact_id: contactId as any,
            type: INTERACTION_TYPE_MEETING,
            note: cleanInteraction,
            happened_at: toYMD(happenedAt),
            duration_minutes: null,
            });

        const nextTalkAt =
          contact?.talk_every_days && contact.talk_every_days > 0
            ? toYMD(addDays(happenedAt, contact.talk_every_days))
            : undefined;

        try {
          await updateContact(contactId as any, {
            talk_last_at: toYMD(happenedAt),
            ...(nextTalkAt ? { talk_next_at: nextTalkAt } : {}),
          } as any);
        } catch (error) {
          console.log("Quick note could not update last contact:", error);
        }
      }

      if (shouldSaveImportant) {
        await createContactMemory(contactId as any, {
          text: cleanImportant,
          memory_type: "important",
          date: null,
          is_pinned: true,
        });
      }

      if (shouldSaveAskNext) {
        await createContactMemory(contactId as any, {
          text: cleanAskNext,
          memory_type: "ask_next_time",
          date: null,
          is_pinned: true,
        });
      }

      Alert.alert("Saved", "Quick note saved to this profile.", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.log("Save quick note failed:", error);
      Alert.alert(
        "Quick note",
        error?.message || "Could not save this quick note."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={primary} />
          <Text style={[styles.loadingText, { color: text }]}>
            Loading quick note…
          </Text>
        </View>
      </Screen>
    );
  }

  const name = contactFullName(contact, contactName);
  const initials = `${contact?.first_name?.[0] || ""}${
    contact?.last_name?.[0] || ""
  }`.toUpperCase();

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.heroCard, { backgroundColor: card }]}>
            {contact?.photo ? (
              <Image source={{ uri: contact.photo }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: primary + "20" }]}>
                <Text style={[styles.avatarText, { color: primary }]}>
                  {initials || "?"}
                </Text>
              </View>
            )}

            <View style={styles.heroTextWrap}>
              <Text style={[styles.heroKicker, { color: text }]}>
                After meeting
              </Text>

              <Text style={[styles.heroTitle, { color: title }]} numberOfLines={1}>
                {name}
              </Text>

              <Text style={[styles.heroSubtitle, { color: text }]} numberOfLines={2}>
                Capture what happened now. The app will organize it into history,
                memories, and next conversation ideas.
              </Text>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: card }]}>
            <Text style={[styles.label, { color: title }]}>
              When did this happen?
            </Text>

            <TouchableOpacity
              style={[styles.dateButton, { borderColor: text + "22" }]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={18} color={primary} />

              <Text style={[styles.dateButtonText, { color: title }]}>
                {formatReadableDate(happenedAt)}
              </Text>
            </TouchableOpacity>

            {showDatePicker ? (
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={happenedAt}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={onDateChange}
                />

                {Platform.OS === "ios" ? (
                  <TouchableOpacity
                    style={[styles.donePickerButton, { backgroundColor: primary }]}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.donePickerText}>Done</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </View>

          <QuickNoteBlock
            enabled={saveInteraction}
            setEnabled={setSaveInteraction}
            icon="heart-outline"
            color="#EE6A5E"
            title="Interaction history"
            subtitle="Save what happened today."
            placeholder="Example: Met today at coffee. She said she is moving to Lyon."
            value={interactionNote}
            setValue={setInteractionNote}
            settings={settings}
          />

          <QuickNoteBlock
            enabled={saveImportant}
            setEnabled={setSaveImportant}
            icon="sparkles-outline"
            color="#8A6BD8"
            title="Important memory"
            subtitle="Something meaningful to remember."
            placeholder="Example: She likes Italian food."
            value={importantMemory}
            setValue={setImportantMemory}
            settings={settings}
          />

          <QuickNoteBlock
            enabled={saveAskNext}
            setEnabled={setSaveAskNext}
            icon="chatbubble-ellipses-outline"
            color="#EBA55B"
            title="Ask next time"
            subtitle="A thoughtful question for the next conversation."
            placeholder="Example: Ask if she found her new apartment."
            value={askNextTime}
            setValue={setAskNextTime}
            settings={settings}
          />

          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                backgroundColor: saving ? text + "55" : button,
              },
            ]}
            onPress={saveQuickNote}
            disabled={saving}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator color={buttonText} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={buttonText} />
                <Text style={[styles.saveButtonText, { color: buttonText }]}>
                  Save quick note
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function QuickNoteBlock({
  enabled,
  setEnabled,
  icon,
  color,
  title,
  subtitle,
  placeholder,
  value,
  setValue,
  settings,
}: {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  subtitle: string;
  placeholder: string;
  value: string;
  setValue: (value: string) => void;
  settings: any;
}) {
  return (
    <View style={[styles.card, { backgroundColor: settings.cardColor }]}>
      <TouchableOpacity
        style={styles.blockHeader}
        onPress={() => setEnabled(!enabled)}
        activeOpacity={0.85}
      >
        <View style={[styles.blockIcon, { backgroundColor: color + "18" }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>

        <View style={styles.blockTitleWrap}>
          <Text style={[styles.blockTitle, { color: settings.titleColor }]}>
            {title}
          </Text>

          <Text style={[styles.blockSubtitle, { color: settings.textColor }]}>
            {subtitle}
          </Text>
        </View>

        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: enabled ? color : "transparent",
              borderColor: enabled ? color : settings.textColor + "35",
            },
          ]}
        >
          {enabled ? (
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          ) : null}
        </View>
      </TouchableOpacity>

      {enabled ? (
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={settings.textColor + "70"}
          multiline
          textAlignVertical="top"
          style={[
            styles.input,
            {
              color: settings.titleColor,
              borderColor: settings.textColor + "18",
              backgroundColor: settings.textColor + "08",
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
    gap: 14,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
  },
  heroCard: {
    borderRadius: 28,
    padding: 16,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "900",
  },
  heroTextWrap: {
    flex: 1,
  },
  heroKicker: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    fontWeight: "500",
  },
  card: {
    borderRadius: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
  },
  dateButton: {
    height: 50,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  dateButtonText: {
    fontSize: 15,
    fontWeight: "800",
  },
  pickerWrap: {
    marginTop: 10,
  },
  donePickerButton: {
    marginTop: 8,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  donePickerText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  blockIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  blockTitleWrap: {
    flex: 1,
  },
  blockTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  blockSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  checkbox: {
    width: 25,
    height: 25,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 18,
    marginTop: 14,
    padding: 14,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },
  saveButton: {
    height: 56,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 2,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "900",
  },
});