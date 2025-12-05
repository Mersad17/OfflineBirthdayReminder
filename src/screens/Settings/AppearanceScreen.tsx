import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Image,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SettingsStackParamsList } from "../../navigation/SettingsStack";
import { useAppearance, ThemeMode } from "../../appearance/AppearanceContext";
import * as ImagePicker from 'expo-image-picker';
import { Screen } from "../../components/Screen";

type Props = NativeStackScreenProps<SettingsStackParamsList, "Appearance">;

// basic swatches shown inline under each label
const basePalette = [
  "#4F46E5", // indigo
  "#10B981", // green
  "#F97316", // orange
  "#EC4899", // pink
  "#3B82F6", // blue
  "#F59E0B", // amber
];

// bigger palette for the modal
const bigPalette = [
  "#4F46E5",
  "#10B981",
  "#F97316",
  "#EC4899",
  "#3B82F6",
  "#A855F7",
  "#F59E0B",
  "#EF4444",
  "#22C55E",
  "#0EA5E9",
  "#111827",
  "#1F2933",
  "#6B7280",
  "#9CA3AF",
  "#D1D5DB",
  "#E5E7EB",
  "#F9FAFB",
];

type ActivePicker =
  | "primary"
  | "background"
  | "title"
  | "text"
  | "buttonBg"
  | "buttonText"
  | null;

export default function AppearanceScreen({}: Props) {
  const {
    settings,
    setThemeMode,
    setPrimaryColor,
    setBackgroundColor,
    setTitleColor,
    setTextColor,
    setButtonColor,
    setButtonTextColor,
    setBackgroundImageUri,
    setBackgroundResizeMode,
  } = useAppearance();

  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  function renderThemeButton(mode: ThemeMode, label: string) {
    const selected = settings.themeMode === mode;
    return (
      <TouchableOpacity
        key={mode}
        style={[styles.themeButton, selected && styles.themeButtonSelected]}
        onPress={() => setThemeMode(mode)}
      >
        <Text style={selected ? styles.themeButtonTextSelected : styles.themeButtonText}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  function renderColorOption(
    color: string,
    current: string,
    onSelect: (c: string) => void
  ) {
    const selected = color === current;
    return (
      <TouchableOpacity
        key={color}
        onPress={() => onSelect(color)}
        style={[
          styles.colorCircle,
          { backgroundColor: color },
          selected && styles.colorCircleSelected,
        ]}
      />
    );
  }
  function renderBgFitButton(mode: "cover" | "contain" | "center"|"repeat", label: string) {
    const selected = (settings.backgroundResizeMode || "cover") === mode;
    return (
      <TouchableOpacity
        key={mode}
        style={[
          styles.themeButton,
          selected && styles.themeButtonSelected,
        ]}
        onPress={() => setBackgroundResizeMode(mode)}
      >
        <Text style={selected ? styles.themeButtonTextSelected : styles.themeButtonText}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }
  
  // block (label + small swatches + "More colors" button)
  function renderColorPickerSection(
    label: string,
    current: string,
    onSelect: (c: string) => void,
    kind: ActivePicker
  ) {
    // always show the current color as the first dot
    const palette = [current, ...basePalette.filter((c) => c !== current)];

    return (

      <View style={{ marginTop: 16 }}>
        <Text style={styles.sectionTitle}>{label}</Text>
        <View style={styles.row}>
          {palette.map((c) => renderColorOption(c, current, onSelect))}
        </View>
        <TouchableOpacity
          style={styles.moreColorsButton}
          onPress={() => setActivePicker(kind)}
        >
          <Text style={styles.moreColorsText}>More colors</Text>
        </TouchableOpacity>
      </View>
    );
  }

    async function onUploadBackground() {
        // ask permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          alert("Permission required to pick an image.");
          return;
        }
      
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
          quality: 0.8,
        });
      
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const uri = result.assets[0].uri;
          setBackgroundImageUri(uri);
        }
      }
      
  function onClearBackgroundImage() {
    setBackgroundImageUri(null);
  }

  function handlePickFromModal(color: string) {
    switch (activePicker) {
      case "primary":
        setPrimaryColor(color);
        break;
      case "background":
        setBackgroundColor(color);
        break;
      case "title":
        setTitleColor(color);
        break;
      case "text":
        setTextColor(color);
        break;
      case "buttonBg":
        setButtonColor(color);
        break;
      case "buttonText":
        setButtonTextColor(color);
        break;
      default:
        break;
    }
    setActivePicker(null);
  }

  function getActiveLabel() {
    switch (activePicker) {
      case "primary":
        return "Primary color";
      case "background":
        return "Background color";
      case "title":
        return "Title color";
      case "text":
        return "Text color";
      case "buttonBg":
        return "Button background color";
      case "buttonText":
        return "Button text color";
      default:
        return "";
    }
  }

  return (
    <>
      <Screen scroll>

      <ScrollView contentContainerStyle={{paddingBlockEnd:25}}>
        <View style={styles.container}>
          <Text style={styles.title}>Appearance</Text>

          {/* Theme */}
          <Text style={styles.sectionTitle}>Theme</Text>
          <View style={styles.row}>
            {renderThemeButton("light", "Light")}
            {renderThemeButton("dark", "Dark")}
            {renderThemeButton("system", "System")}
          </View>

          {/* Colors */}
          {renderColorPickerSection(
            "Primary color",
            settings.primaryColor,
            setPrimaryColor,
            "primary"
          )}

          {renderColorPickerSection(
            "Background color",
            settings.backgroundColor,
            setBackgroundColor,
            "background"
          )}

          {renderColorPickerSection(
            "Title color",
            settings.titleColor,
            setTitleColor,
            "title"
          )}

          {renderColorPickerSection(
            "Text color",
            settings.textColor,
            setTextColor,
            "text"
          )}

          {renderColorPickerSection(
            "Button background color",
            settings.buttonColor,
            setButtonColor,
            "buttonBg"
          )}

          {renderColorPickerSection(
            "Button text color",
            settings.buttonTextColor,
            setButtonTextColor,
            "buttonText"
          )}

          {/* Background image */}
         {/* Background image */}
<Text style={styles.sectionTitle}>Background image</Text>
<View style={{ gap: 8 }}>
  <TouchableOpacity style={styles.actionButton} onPress={onUploadBackground}>
    <Text style={styles.actionButtonText}>
      Upload background image
    </Text>
  </TouchableOpacity>

  {settings.backgroundImageUri && (
    <>
      <View style={{ marginTop: 8 }}>
        <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 4 }}>
          Current background
        </Text>
        <Image
          source={{ uri: settings.backgroundImageUri }}
          style={{ width: "100%", height: 120, borderRadius: 8 }}
          resizeMode="cover"
        />
      </View>

      <TouchableOpacity
        style={styles.actionButtonSecondary}
        onPress={onClearBackgroundImage}
      >
        <Text style={styles.actionButtonSecondaryText}>
          Remove background image
        </Text>
      </TouchableOpacity>
    </>
  )}
</View>

{/* NEW: background fit / position */}
<Text style={styles.sectionTitle}>Background fit</Text>
<View style={styles.row}>
  {renderBgFitButton("cover", "Cover")}
  {renderBgFitButton("contain", "Contain")}
  {renderBgFitButton("center", "Center")}
  {renderBgFitButton("repeat", "Repeat")}
</View>


        </View>
      </ScrollView>
      </Screen>

      {/* Modal color picker */}
      <Modal
        visible={activePicker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActivePicker(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose {getActiveLabel()}</Text>
            <View style={styles.modalPalette}>
              {bigPalette.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.modalColorCircle, { backgroundColor: c }]}
                  onPress={() => handlePickFromModal(c)}
                />
              ))}
            </View>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setActivePicker(null)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

        </View>

      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  themeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  themeButtonSelected: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  themeButtonText: {
    fontSize: 14,
    color: "#111827",
  },
  themeButtonTextSelected: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  colorCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorCircleSelected: {
    borderColor: "#111827",
  },
  moreColorsButton: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  moreColorsText: {
    fontSize: 12,
    color: "#4B5563",
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    marginTop: 16,
  },
  actionButtonText: {
    fontSize: 14,
    color: "#111827",
  },
  actionButtonSecondary: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },
  actionButtonSecondaryText: {
    fontSize: 14,
    color: "#B91C1C",
  },
  // modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  modalPalette: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginBottom: 16,
  },
  modalColorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  modalCancelButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modalCancelText: {
    fontSize: 14,
    color: "#4B5563",
  },
});
