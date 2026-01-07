import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { createInteraction, updateInteraction } from "../../interactions/api";
import { InteractionType } from "../../interactions/types";

import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { formatDateEU } from "../../lib/date";
import { ContactsStackParamList } from "../../navigation/ContactsStack";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
type Props = NativeStackScreenProps<ContactsStackParamList, "LogInteraction">;



/* ---------- interaction types ---------- */

const INTERACTION_TYPES = [
  { id: InteractionType.CALL, label: "Call" },
  { id: InteractionType.IN_PERSON, label: "In person" },
  { id: InteractionType.MESSAGE, label: "Message" },
  { id: InteractionType.VIDEO, label: "Video" },
  { id: InteractionType.OTHER, label: "Other" },
];

/* ---------- screen ---------- */

export default function LogInteractionScreen({ route, navigation }: Props) {
  const { contactId } = route.params;
  const { settings } = useAppearance();
  const interaction = route.params?.interaction;
  const isEdit = !!interaction;
  
  const [type, setType] = useState(
    interaction?.type ?? InteractionType.OTHER
  );
  
  const [note, setNote] = useState(interaction?.note ?? "");
  
  const [duration, setDuration] = useState(
    interaction?.duration_minutes?.toString() ?? ""
  );
  
  const [happenedAtDate, setHappenedAtDate] = useState(
    interaction ? new Date(interaction.happened_at) : new Date()
  );
  
  const [showHappenedAtPicker, setShowHappenedAtPicker] =
    useState(false);
  
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (saving) return;
  
    const iso = happenedAtDate.toISOString();
    if (!iso) {
      alert("Please enter a valid date and time.");
      return;
    }
  
    setSaving(true);
    try {
      const payload = {
        happened_at: iso,
        duration_minutes: duration ? Number(duration) : null,
        note: note || null,
        type,
      };
  
      if (isEdit && interaction) {
        // ✅ EDIT
        await updateInteraction(interaction.id, payload);
      } else {
        // ✅ CREATE
        await createInteraction({
          contact_id: contactId,
          ...payload,
        });
      }
  
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }
  
  
  function openHappenedAtPicker() {
    setShowHappenedAtPicker(true);
  }
  
  function onHappenedAtChange(
    event: DateTimePickerEvent,
    date?: Date
  ) {
    if (event.type === "dismissed") {
      setShowHappenedAtPicker(false);
      return;
    }
  
    if (date) {
      setHappenedAtDate(date);
    }
  
    setShowHappenedAtPicker(false);
  }
  

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={[styles.title, { color: settings.titleColor }]}>
          Log interaction
        </Text>

        {/* TYPE */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: settings.textColor }]}>
            Type
          </Text>

          <View style={styles.typeRow}>
            {INTERACTION_TYPES.map((t) => {
              const selected = type === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setType(t.id)}
                  style={[
                    styles.typeChip,
                    {
                      backgroundColor: selected
                        ? settings.primaryColor + "22"
                        : settings.cardColor,
                      borderColor: selected
                        ? settings.primaryColor
                        : settings.cardColor + "55",
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontWeight: "700",
                      color: selected
                        ? settings.primaryColor
                        : settings.textColor,
                    }}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* WHEN */}
      <View style={styles.section}>
        <Text style={[styles.label, { color: settings.textColor }]}>
          When
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={openHappenedAtPicker}
          style={[
            styles.input,
            styles.dateInput,
            { backgroundColor: settings.cardColor },
          ]}
        >
          <Text style={{ color: settings.textColor }}>
            {formatDateEU(happenedAtDate)} ·{" "}
            {happenedAtDate.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </TouchableOpacity>

        {showHappenedAtPicker && Platform.OS === "ios" && (
            <DateTimePicker
              value={happenedAtDate}
              mode="datetime"
              display="spinner"
              onChange={onHappenedAtChange}
              maximumDate={new Date()}
            />
          )}

          {showHappenedAtPicker && Platform.OS === "android" && (
            <DateTimePicker
              value={happenedAtDate}
              mode="date"
              onChange={onHappenedAtChange}
              maximumDate={new Date()}
            />
          )}

      </View>


        {/* NOTE */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: settings.textColor }]}>
            Note (optional)
          </Text>

          <TextInput
            placeholder="What was it about?"
            placeholderTextColor={settings.textColor + "80"}
            value={note}
            onChangeText={setNote}
            multiline
            style={[
              styles.input,
              {
                backgroundColor: settings.cardColor,
                color: settings.textColor,
                minHeight: 80,
              },
            ]}
          />
        </View>

        {/* DURATION */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: settings.textColor }]}>
            Duration (minutes)
          </Text>

          <TextInput
            placeholder="Optional"
            placeholderTextColor={settings.textColor + "80"}
            value={duration}
            onChangeText={setDuration}
            keyboardType="numeric"
            style={[
              styles.input,
              {
                backgroundColor: settings.cardColor,
                color: settings.textColor,
              },
            ]}
          />
        </View>

        {/* SAVE */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: settings.buttonColor },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={settings.buttonTextColor} />
          ) : (
            <Text
              style={[
                styles.saveButtonText,
                { color: settings.buttonTextColor },
              ]}
            >
              {isEdit ? "Update interaction" : "Save interaction"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

/* ---------- styles ---------- */

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 24,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 16,
  },

  section: {
    marginBottom: 14,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },

  input: {
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },

  typeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },

  saveButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 12,
  },

  saveButtonText: {
    fontSize: 16,
    fontWeight: "800",
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateText: {
    fontSize: 14,
    color: "#333",
  },
  datePlaceholder: {
    fontSize: 14,
    color: "#999",
  },
  dateIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
});
