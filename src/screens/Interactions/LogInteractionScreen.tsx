import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { createInteraction } from "../../interactions/api";

type Props = {
  route: {
    params: {
      contactId: number;
    };
  };
  navigation: any;
};

function nowLocalString() {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toISOFromLocal(value: string) {
  // expects: YYYY-MM-DD HH:mm
  const [date, time] = value.split(" ");
  if (!date || !time) return null;

  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);

  if (!y || !m || !d || hh === undefined || mm === undefined) {
    return null;
  }

  return new Date(y, m - 1, d, hh, mm).toISOString();
}

export default function LogInteractionScreen({ route, navigation }: Props) {
  const { contactId } = route.params;
  const { settings } = useAppearance();

  const [note, setNote] = useState("");
  const [duration, setDuration] = useState("");
  const [happenedAt, setHappenedAt] = useState(nowLocalString());
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (saving) return;

    const iso = toISOFromLocal(happenedAt);
    if (!iso) {
      alert("Please enter a valid date and time.");
      return;
    }

    setSaving(true);
    try {
      await createInteraction({
        contact_id: contactId,
        happened_at: iso,
        duration_minutes: duration ? Number(duration) : null,
        note: note || null,
      });

      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={[styles.title, { color: settings.titleColor }]}>
          Log interaction
        </Text>

        {/* WHEN */}
        <TextInput
          placeholder="When (YYYY-MM-DD HH:mm)"
          placeholderTextColor={settings.textColor + "80"}
          value={happenedAt}
          onChangeText={setHappenedAt}
          style={[
            styles.input,
            { backgroundColor: settings.cardColor, color: settings.textColor },
          ]}
        />

        {/* NOTE */}
        <TextInput
          placeholder="What was it about? (optional)"
          placeholderTextColor={settings.textColor + "80"}
          value={note}
          onChangeText={setNote}
          multiline
          style={[
            styles.input,
            { backgroundColor: settings.cardColor, color: settings.textColor },
          ]}
        />

        {/* DURATION */}
        <TextInput
          placeholder="Duration in minutes (optional)"
          placeholderTextColor={settings.textColor + "80"}
          value={duration}
          onChangeText={setDuration}
          keyboardType="numeric"
          style={[
            styles.input,
            { backgroundColor: settings.cardColor, color: settings.textColor },
          ]}
        />

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
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 16 },
  input: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: { fontSize: 16, fontWeight: "800" },
});
