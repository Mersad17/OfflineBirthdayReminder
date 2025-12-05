import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { EventsStackParamList } from "../../navigation/EventsStack";
import { fetchEventById, updateEvent } from "../../events/api";
import { EventDTO } from "../../events/types";
import { Screen } from "../../components/Screen";

type Props = NativeStackScreenProps<EventsStackParamList, "EditEvent">;

export default function EditEventScreen({ route, navigation }: Props) {
  const { eventId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState<EventDTO | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [dateObj, setDateObj] = useState(new Date());
  const [type, setType] = useState(1);
  const [isRecurring, setIsRecurring] = useState(true);
  const [isActive, setIsActive] = useState(true);

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const e = await fetchEventById(eventId);
        setEvent(e);

        setTitle(e.title || "");
        setDate(e.date);
        setDateObj(new Date(e.date));
        setType(e.type);
        setIsRecurring(e.is_recurring);
        setIsActive(e.is_active);
      } catch {
        Alert.alert("Error", "Could not load event.");
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  function iconForType(t: number) {
    if (t === 1) return "🎂";
    if (t === 2) return "💍";
    return "🎉";
  }

  function typeLabel(t: number) {
    if (t === 1) return "Birthday";
    if (t === 2) return "Anniversary";
    return "Custom Event";
  }

  function onDateChange(_: any, selectedDate?: Date) {
    if (!selectedDate) {
      setShowDatePicker(false);
      return;
    }
    setShowDatePicker(false);
    setDateObj(selectedDate);

    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    setDate(`${y}-${m}-${d}`);
  }

  async function onSave() {
    setError(null);

    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setError("Date must be in YYYY-MM-DD format.");
      return;
    }
    if (type === 3 && !title.trim()) {
      setError("Custom events must have a title.");
      return;
    }

    setSaving(true);
    try {
      await updateEvent(eventId, {
        title,
        date,
        type,
        is_recurring: isRecurring,
        is_active: isActive,
      });
          navigation.goBack();
    } catch {
      Alert.alert("Error", "Could not update event.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !event) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading…</Text>
      </View>
    );
  }

  return (
    <Screen scroll>

    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.page}>
        {/* 🎈 Fun header / live preview */}
        <View style={styles.headerCard}>
          <Text style={styles.headerEmoji}>{iconForType(type)}</Text>
          <Text style={styles.headerContact}>{event.contact_name}</Text>
          <Text style={styles.headerTitleText}>{title || "Untitled Event"}</Text>
          <Text style={styles.headerMeta}>
            {typeLabel(type)} • {date || "No date"}
          </Text>
        </View>

        {/* Basics card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Basics</Text>

          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Title (optional)</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={
                type === 1
                  ? "Birthday party at home"
                  : type === 2
                  ? "Anniversary dinner"
                  : "Event title…"
              }
            />
          </View>

          {/* Date */}
          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {date || "Pick a date"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Type */}
          <View style={styles.field}>
            <Text style={styles.label}>Type</Text>
            <TouchableOpacity
              style={styles.typeSelector}
              onPress={() => setShowTypePicker(true)}
            >
              <Text style={styles.typeSelectorText}>
                {iconForType(type)} {typeLabel(type)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Behavior card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Behavior</Text>

          <ToggleRow
            label="Recurring every year"
            value={isRecurring}
            onValueChange={setIsRecurring}
          />

          <ToggleRow
            label="Active"
            value={isActive}
            onValueChange={setIsActive}
          />
        </View>

        {/* Error message */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={onSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving…" : "Save Changes"}
          </Text>
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date picker modal (native) */}
      {showDatePicker && (
        <DateTimePicker
          mode="date"
          value={dateObj}
          onChange={onDateChange}
          display={Platform.OS === "ios" ? "spinner" : "default"}
        />
      )}

      {/* Type picker bottom sheet */}
      <Modal visible={showTypePicker} transparent animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={() => setShowTypePicker(false)} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Select event type</Text>

          <TypePickerItem
            label="🎂 Birthday"
            isSelected={type === 1}
            onPress={() => {
              setType(1);
              setShowTypePicker(false);
            }}
          />
          <TypePickerItem
            label="💍 Anniversary"
            isSelected={type === 2}
            onPress={() => {
              setType(2);
              setShowTypePicker(false);
            }}
          />
          <TypePickerItem
            label="🎉 Custom Event"
            isSelected={type === 3}
            onPress={() => {
              setType(3);
              setShowTypePicker(false);
            }}
          />
        </View>
      </Modal>
    </View>
    </Screen>

  );
}

// Small subcomponents

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.label}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function TypePickerItem({
  label,
  isSelected,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.typeOption,
        isSelected && styles.typeOptionSelected,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.typeOptionText,
          isSelected && styles.typeOptionTextSelected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 18,
    gap: 22,
    paddingBottom: 30,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // HEADER
  headerCard: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: "#E5F0FF",
    borderWidth: 2,
    borderColor: "#C3D9FF",
    alignItems: "center",
  },
  headerEmoji: { fontSize: 52 },
  headerContact: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: "800",
    color: "#1D4ED8",
  },
  headerTitleText: {
    marginTop: 4,
    fontSize: 16,
    color: "#4B5563",
  },
  headerMeta: {
    marginTop: 6,
    fontSize: 14,
    color: "#6B7280",
  },

  // CARDS
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 14,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  field: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
    fontSize: 16,
  },

  dateButton: {
    marginTop: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    backgroundColor: "#EEF2FF",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dateButtonText: {
    color: "#1D4ED8",
    fontWeight: "600",
  },

  typeSelector: {
    marginTop: 2,
    borderRadius: 10,
    backgroundColor: "#DBEAFE",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  typeSelectorText: {
    fontWeight: "600",
    color: "#1E3A8A",
  },

  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },

  // ERROR BOX
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: {
    color: "#B91C1C",
    fontWeight: "600",
  },

  // SAVE BUTTON
  saveButton: {
    marginTop: 8,
    backgroundColor: "#1D4ED8",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#1D4ED8",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 17,
  },
  cancelText: {
    marginTop: 8,
    textAlign: "center",
    color: "#6B7280",
  },

  // MODAL
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  modalCard: {
    backgroundColor: "white",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  typeOption: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#F3F4FF",
  },
  typeOptionSelected: {
    backgroundColor: "#2563EB",
  },
  typeOptionText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
  typeOptionTextSelected: {
    color: "#FFFFFF",
  },
});
