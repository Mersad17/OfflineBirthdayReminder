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
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ContactsStackParamList } from "../../navigation/ContactsStack";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { Contact } from "../../contacts/types";
import { fetchContactById, updateContact } from "../../contacts/repository";
import { createContactMemory } from "../../memories/repository";
import { createInteraction } from "../../interactions/repository";

type Props = NativeStackScreenProps<ContactsStackParamList, "QuickNote">;

type QuickNoteColors = {
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
  orange: string;
  purple: string;
  shadow: string;
};

const INTERACTION_TYPE_MEETING = 2;

function toYMD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
  const colors = useMemo(() => makeQuickNoteColors(settings), [settings]);

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
      headerShown: false,
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

        const talkEveryDays = Number((contact as any)?.talk_every_days || 0);

        const nextTalkAt =
          talkEveryDays > 0 ? toYMD(addDays(happenedAt, talkEveryDays)) : undefined;

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
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <ActivityIndicator color={colors.primary} />

          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading quick note…
          </Text>
        </View>
      </Screen>
    );
  }

  const name = contactFullName(contact, contactName);
  const initials = getInitials(contact);

  return (
    <KeyboardAvoidingView
      style={[styles.keyboard, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <Screen>
        <View style={[styles.root, { backgroundColor: colors.background }]}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <CompactQuickNoteHeader
              colors={colors}
              contact={contact}
              name={name}
              initials={initials}
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
                title="When did this happen?"
                colors={colors}
              />

              <TouchableOpacity
                style={[
                  styles.dateButton,
                  {
                    backgroundColor: colors.softCard,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.dateIconBubble,
                    { backgroundColor: colors.softPrimary },
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={17}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.dateTextWrap}>
                  <Text style={[styles.dateLabel, { color: colors.text }]}>
                    Interaction date
                  </Text>

                  <Text style={[styles.dateButtonText, { color: colors.title }]}>
                    {formatReadableDate(happenedAt)}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={17}
                  color={colors.muted}
                />
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
                      style={[
                        styles.donePickerButton,
                        { backgroundColor: colors.button },
                      ]}
                      onPress={() => setShowDatePicker(false)}
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
            </View>

            <QuickNoteBlock
              enabled={saveInteraction}
              setEnabled={setSaveInteraction}
              icon="heart-outline"
              color={colors.danger}
              title="Interaction history"
              subtitle="Save what happened today."
              placeholder="Example: Met today at coffee. She said she is moving to Lyon."
              value={interactionNote}
              setValue={setInteractionNote}
              colors={colors}
            />

            <QuickNoteBlock
              enabled={saveImportant}
              setEnabled={setSaveImportant}
              icon="sparkles-outline"
              color={colors.purple}
              title="Important memory"
              subtitle="Something meaningful to remember."
              placeholder="Example: She likes Italian food."
              value={importantMemory}
              setValue={setImportantMemory}
              colors={colors}
            />

            <QuickNoteBlock
              enabled={saveAskNext}
              setEnabled={setSaveAskNext}
              icon="chatbubble-ellipses-outline"
              color={colors.orange}
              title="Ask next time"
              subtitle="A thoughtful question for the next conversation."
              placeholder="Example: Ask if she found her new apartment."
              value={askNextTime}
              setValue={setAskNextTime}
              colors={colors}
            />

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
                  {
                    backgroundColor: colors.button,
                  },
                  saving && styles.saveButtonDisabled,
                ]}
                onPress={saveQuickNote}
                disabled={saving}
                activeOpacity={0.9}
              >
                {saving ? (
                  <ActivityIndicator color={colors.buttonText} />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={19}
                      color={colors.buttonText}
                    />

                    <Text
                      style={[
                        styles.saveButtonText,
                        { color: colors.buttonText },
                      ]}
                    >
                      Save note
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

function CompactQuickNoteHeader({
  colors,
  contact,
  name,
  initials,
  onBack,
}: {
  colors: QuickNoteColors;
  contact: Contact | null;
  name: string;
  initials: string;
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
          <Ionicons name="flash-outline" size={14} color="#FFFFFF" />
          <Text style={styles.headerPillText}>Quick note</Text>
        </View>
      </View>

      <View style={styles.headerMainRow}>
        {contact?.photo ? (
          <Image source={{ uri: contact.photo }} style={styles.headerAvatarImage} />
        ) : (
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{initials || "?"}</Text>
          </View>
        )}

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>AFTER MEETING</Text>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {name}
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={2}>
            Capture what happened, what matters, and what to ask next.
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
  colors: QuickNoteColors;
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
  colors,
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
  colors: QuickNoteColors;
}) {
  return (
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
      <TouchableOpacity
        style={styles.blockHeader}
        onPress={() => setEnabled(!enabled)}
        activeOpacity={0.85}
      >
        <View
          style={[
            styles.blockIcon,
            { backgroundColor: withOpacity(color, "18") },
          ]}
        >
          <Ionicons name={icon} size={19} color={color} />
        </View>

        <View style={styles.blockTitleWrap}>
          <Text style={[styles.blockTitle, { color: colors.title }]}>
            {title}
          </Text>

          <Text
            style={[styles.blockSubtitle, { color: colors.text }]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        </View>

        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: enabled ? color : "transparent",
              borderColor: enabled ? color : colors.border,
            },
          ]}
        >
          {enabled ? (
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          ) : null}
        </View>
      </TouchableOpacity>

      {enabled ? (
        <ThemedInput
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          multiline
          textAlignVertical="top"
          style={styles.noteInput}
          colors={colors}
        />
      ) : null}
    </View>
  );
}

function ThemedInput({
  colors,
  style,
  ...props
}: TextInputProps & {
  colors: QuickNoteColors;
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

/* helpers */

function makeQuickNoteColors(settings: any): QuickNoteColors {
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
    orange: "#EBA55B",
    purple: "#8A6BD8",
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

function getInitials(contact?: Contact | null) {
  return `${contact?.first_name?.[0] || ""}${
    contact?.last_name?.[0] || ""
  }`.toUpperCase() || "?";
}

/* styles */

const styles = StyleSheet.create({
  keyboard: {
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
    gap: 10,
  },

  loadingText: {
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

  headerAvatarImage: {
    width: 54,
    height: 54,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },

  headerAvatar: {
    width: 54,
    height: 54,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerAvatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
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

  dateButton: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  dateIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  dateTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  dateLabel: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    opacity: 0.68,
  },

  dateButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    marginTop: 1,
  },

  pickerWrap: {
    marginTop: 12,
  },

  donePickerButton: {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  donePickerText: {
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
    minWidth: 0,
  },

  blockTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  blockSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
  },

  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },

  input: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    fontSize: 14,
    fontWeight: "700",
  },

  noteInput: {
    minHeight: 96,
    marginTop: 14,
    lineHeight: 21,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
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