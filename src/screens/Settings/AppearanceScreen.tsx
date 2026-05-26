// src/screens/Settings/AppearanceScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
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
import {
  copyAppearanceBackgroundImage,
  deleteAppearanceBackgroundImage,
} from "../../appearance/appearanceImageStorage";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";

import { SettingsStackParamsList } from "../../navigation/SettingsStack";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import type { ThemeMode } from "../../appearance/AppearanceContext";

type Props = NativeStackScreenProps<SettingsStackParamsList, "Appearance">;

type ActivePicker =
  | "primary"
  | "background"
  | "card"
  | "title"
  | "text"
  | "buttonBg"
  | "buttonText"
  | null;

type BackgroundResizeMode = "cover" | "contain" | "center" | "repeat";

type AppearanceColors = {
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

const BASE_PALETTE = [
  "#4F46E5",
  "#10B981",
  "#F97316",
  "#EC4899",
  "#3B82F6",
  "#F59E0B",
];

const BIG_PALETTE = [
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
  "#374151",
  "#6B7280",
  "#9CA3AF",
  "#D1D5DB",
  "#E5E7EB",
  "#F9FAFB",
  "#FFFFFF",
];

const THEME_OPTIONS: {
  mode: ThemeMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { mode: "light" as ThemeMode, label: "Light", icon: "sunny-outline" },
  { mode: "dark" as ThemeMode, label: "Dark", icon: "moon-outline" },
  { mode: "system" as ThemeMode, label: "System", icon: "phone-portrait-outline" },
  { mode: "custom" as ThemeMode, label: "Custom", icon: "sparkles-outline" },
];

const FIT_OPTIONS: {
  mode: BackgroundResizeMode;
  label: string;
}[] = [
  { mode: "cover", label: "Cover" },
  { mode: "contain", label: "Contain" },
  { mode: "center", label: "Center" },
  { mode: "repeat", label: "Repeat" },
];

export default function AppearanceScreen({ navigation }: Props) {
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
    setCardColor,
  } = useAppearance();

  const colors = useMemo(() => makeAppearanceColors(settings), [settings]);

  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [customHex, setCustomHex] = useState(settings.primaryColor);

  useEffect(() => {
    navigation.setOptions?.({
      headerShown: false,
    });
  }, [navigation]);

  function openColorPicker(kind: Exclude<ActivePicker, null>, current: string) {
    setCustomHex(normalizeHexInput(current));
    setActivePicker(kind);
  }

  function handlePickFromModal(color: string) {
    switch (activePicker) {
      case "primary":
        setPrimaryColor(color);
        break;
      case "background":
        setBackgroundColor(color);
        break;
      case "card":
        setCardColor(color);
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
      case "card":
        return "Card color";
      case "title":
        return "Title color";
      case "text":
        return "Text color";
      case "buttonBg":
        return "Button background";
      case "buttonText":
        return "Button text";
      default:
        return "Color";
    }
  }

  function getActiveCurrentColor() {
    switch (activePicker) {
      case "primary":
        return settings.primaryColor;
      case "background":
        return settings.backgroundColor;
      case "card":
        return settings.cardColor;
      case "title":
        return settings.titleColor;
      case "text":
        return settings.textColor;
      case "buttonBg":
        return settings.buttonColor;
      case "buttonText":
        return settings.buttonTextColor;
      default:
        return settings.primaryColor;
    }
  }

  function validateAndUseCustomHex() {
    const value = normalizeHexInput(customHex);

    if (!/^#[0-9A-F]{6}$/i.test(value)) {
      Alert.alert("Invalid color", "Please enter a valid HEX color like #4F46E5.");
      return;
    }

    handlePickFromModal(value);
  }

 async function onUploadBackground() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    Alert.alert(
      "Permission required",
      "Please allow photo access to pick a background image."
    );
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
  });

  if (result.canceled || result.assets.length === 0) return;

  try {
    const pickedUri = result.assets[0].uri;
    const copiedUri = await copyAppearanceBackgroundImage(pickedUri);

    if (settings.backgroundImageUri) {
      await deleteAppearanceBackgroundImage(settings.backgroundImageUri);
    }

    setBackgroundImageUri(copiedUri);
  } catch (error) {
    console.log("Background image copy failed:", error);

    Alert.alert(
      "Background image",
      "Could not save this image as your app background."
    );
  }
}

async function onClearBackgroundImage() {
  const currentUri = settings.backgroundImageUri;

  setBackgroundImageUri(null);

  await deleteAppearanceBackgroundImage(currentUri);
}
  return (
    <Screen>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <CompactHeader colors={colors} onBack={() => navigation.goBack()} />

          <LivePreview colors={colors} settings={settings} />

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
            <SectionTitle icon="contrast-outline" title="Theme" colors={colors} />

            <View style={styles.themeGrid}>
              {THEME_OPTIONS.map((option) => (
                <ThemeOption
                  key={String(option.mode)}
                  label={option.label}
                  icon={option.icon}
                  selected={settings.themeMode === option.mode}
                  colors={colors}
                  onPress={() => setThemeMode(option.mode)}
                />
              ))}
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
            <SectionTitle
              icon="color-palette-outline"
              title="Colors"
              colors={colors}
            />

            <ColorSettingRow
              label="Primary color"
              current={settings.primaryColor}
              kind="primary"
              colors={colors}
              onSelect={setPrimaryColor}
              onMore={openColorPicker}
            />

            <ColorSettingRow
              label="Background color"
              current={settings.backgroundColor}
              kind="background"
              colors={colors}
              onSelect={setBackgroundColor}
              onMore={openColorPicker}
            />

            <ColorSettingRow
              label="Card color"
              current={settings.cardColor}
              kind="card"
              colors={colors}
              onSelect={setCardColor}
              onMore={openColorPicker}
            />

            <ColorSettingRow
              label="Title color"
              current={settings.titleColor}
              kind="title"
              colors={colors}
              onSelect={setTitleColor}
              onMore={openColorPicker}
            />

            <ColorSettingRow
              label="Text color"
              current={settings.textColor}
              kind="text"
              colors={colors}
              onSelect={setTextColor}
              onMore={openColorPicker}
            />

            <ColorSettingRow
              label="Button background"
              current={settings.buttonColor}
              kind="buttonBg"
              colors={colors}
              onSelect={setButtonColor}
              onMore={openColorPicker}
            />

            <ColorSettingRow
              label="Button text"
              current={settings.buttonTextColor}
              kind="buttonText"
              colors={colors}
              onSelect={setButtonTextColor}
              onMore={openColorPicker}
              isLast
            />
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
            <SectionTitle icon="image-outline" title="Background image" colors={colors} />

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.button }]}
              onPress={onUploadBackground}
              activeOpacity={0.88}
            >
              <Ionicons name="image-outline" size={18} color={colors.buttonText} />

              <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>
                Upload background image
              </Text>
            </TouchableOpacity>

            {settings.backgroundImageUri ? (
              <View style={styles.backgroundPreviewWrap}>
                <Text style={[styles.smallLabel, { color: colors.text }]}>
                  Current background
                </Text>

                <Image
                  source={{ uri: settings.backgroundImageUri }}
                  style={styles.backgroundPreview}
                  resizeMode="cover"
                />

                <TouchableOpacity
                  style={[
                    styles.dangerButton,
                    {
                      backgroundColor: withOpacity(colors.danger, "14"),
                      borderColor: withOpacity(colors.danger, "35"),
                    },
                  ]}
                  onPress={onClearBackgroundImage}
                  activeOpacity={0.85}
                >
                  <Ionicons name="trash-outline" size={17} color={colors.danger} />

                  <Text style={[styles.dangerButtonText, { color: colors.danger }]}>
                    Remove background image
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={[
                  styles.emptyImageBox,
                  {
                    backgroundColor: colors.softCard,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="images-outline" size={21} color={colors.muted} />

                <Text style={[styles.emptyImageText, { color: colors.text }]}>
                  No background image selected.
                </Text>
              </View>
            )}
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
            <SectionTitle icon="resize-outline" title="Background fit" colors={colors} />

            <View style={styles.fitGrid}>
              {FIT_OPTIONS.map((option) => (
                <FitOption
                  key={option.mode}
                  label={option.label}
                  selected={(settings.backgroundResizeMode || "cover") === option.mode}
                  colors={colors}
                  onPress={() => setBackgroundResizeMode(option.mode)}
                />
              ))}
            </View>
          </View>
        </ScrollView>

        <ColorPickerModal
          visible={activePicker !== null}
          title={getActiveLabel()}
          currentColor={getActiveCurrentColor()}
          customHex={customHex}
          colors={colors}
          onChangeCustomHex={setCustomHex}
          onPick={handlePickFromModal}
          onUseCustom={validateAndUseCustomHex}
          onClose={() => setActivePicker(null)}
        />
      </View>
    </Screen>
  );
}

function CompactHeader({
  colors,
  onBack,
}: {
  colors: AppearanceColors;
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
          <Ionicons name="color-palette-outline" size={14} color="#FFFFFF" />
          <Text style={styles.headerPillText}>Appearance</Text>
        </View>
      </View>

      <View style={styles.headerMainRow}>
        <View style={styles.headerIconBubble}>
          <Ionicons name="brush-outline" size={24} color="#FFFFFF" />
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>CUSTOMIZE</Text>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Appearance
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={2}>
            Tune colors, theme, background, and the overall vibe of your app.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function LivePreview({
  colors,
  settings,
}: {
  colors: AppearanceColors;
  settings: any;
}) {
  return (
    <View
      style={[
        styles.previewOuter,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.previewHeader}>
        <View
          style={[
            styles.sectionIcon,
            { backgroundColor: colors.softPrimary },
          ]}
        >
          <Ionicons name="eye-outline" size={17} color={colors.primary} />
        </View>

        <View style={styles.previewHeaderText}>
          <Text style={[styles.previewLabel, { color: colors.title }]}>
            Live preview
          </Text>

          <Text style={[styles.previewSubtitle, { color: colors.text }]}>
            See your colors before leaving this screen.
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.previewCard,
          {
            backgroundColor: settings.cardColor,
            borderColor: withOpacity(settings.textColor, "16"),
          },
        ]}
      >
        <Text style={[styles.previewTitle, { color: settings.titleColor }]}>
          Friendly reminder
        </Text>

        <Text style={[styles.previewText, { color: settings.textColor }]}>
          A private place to remember people, moments, and thoughtful follow-ups.
        </Text>

        <View style={[styles.previewButton, { backgroundColor: settings.buttonColor }]}>
          <Text
            style={[
              styles.previewButtonText,
              { color: settings.buttonTextColor },
            ]}
          >
            Primary button
          </Text>
        </View>
      </View>
    </View>
  );
}

function SectionTitle({
  icon,
  title,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  colors: AppearanceColors;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <View
        style={[
          styles.sectionIcon,
          { backgroundColor: colors.softPrimary },
        ]}
      >
        <Ionicons name={icon} size={17} color={colors.primary} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.title }]}>
        {title}
      </Text>
    </View>
  );
}

function ThemeOption({
  label,
  icon,
  selected,
  colors,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  colors: AppearanceColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.themeOption,
        {
          backgroundColor: selected ? colors.primary : colors.softCard,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons
        name={icon}
        size={17}
        color={selected ? colors.buttonText : colors.primary}
      />

      <Text
        style={[
          styles.themeOptionText,
          { color: selected ? colors.buttonText : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ColorSettingRow({
  label,
  current,
  kind,
  colors,
  onSelect,
  onMore,
  isLast,
}: {
  label: string;
  current: string;
  kind: Exclude<ActivePicker, null>;
  colors: AppearanceColors;
  onSelect: (color: string) => void;
  onMore: (kind: Exclude<ActivePicker, null>, current: string) => void;
  isLast?: boolean;
}) {
  const palette = uniquePalette([current, ...BASE_PALETTE]);

  return (
    <View style={[styles.colorSetting, isLast && { marginBottom: 0 }]}>
      <View style={styles.colorSettingHeader}>
        <View style={styles.colorLabelRow}>
          <View
            style={[
              styles.currentColorDot,
              {
                backgroundColor: current,
                borderColor: colors.border,
              },
            ]}
          />

          <View>
            <Text style={[styles.colorLabel, { color: colors.title }]}>
              {label}
            </Text>

            <Text style={[styles.colorValue, { color: colors.text }]}>
              {current}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.moreButton,
            {
              backgroundColor: colors.softPrimary,
              borderColor: withOpacity(colors.primary, "28"),
            },
          ]}
          onPress={() => onMore(kind, current)}
          activeOpacity={0.85}
        >
          <Text style={[styles.moreButtonText, { color: colors.primary }]}>
            More
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.swatchRow}>
        {palette.map((color) => (
          <ColorSwatch
            key={`${kind}-${color}`}
            color={color}
            selected={color.toLowerCase() === current.toLowerCase()}
            colors={colors}
            onPress={() => onSelect(color)}
          />
        ))}
      </View>
    </View>
  );
}

function ColorSwatch({
  color,
  selected,
  colors,
  onPress,
}: {
  color: string;
  selected: boolean;
  colors: AppearanceColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.swatch,
        {
          backgroundColor: color,
          borderColor: selected ? colors.title : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {selected ? (
        <Ionicons name="checkmark" size={13} color={readableCheckColor(color)} />
      ) : null}
    </TouchableOpacity>
  );
}

function FitOption({
  label,
  selected,
  colors,
  onPress,
}: {
  label: string;
  selected: boolean;
  colors: AppearanceColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.fitOption,
        {
          backgroundColor: selected ? colors.primary : colors.softCard,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text
        style={[
          styles.fitOptionText,
          { color: selected ? colors.buttonText : colors.text },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ColorPickerModal({
  visible,
  title,
  currentColor,
  customHex,
  colors,
  onChangeCustomHex,
  onPick,
  onUseCustom,
  onClose,
}: {
  visible: boolean;
  title: string;
  currentColor: string;
  customHex: string;
  colors: AppearanceColors;
  onChangeCustomHex: (value: string) => void;
  onPick: (color: string) => void;
  onUseCustom: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <View
              style={[
                styles.modalIcon,
                { backgroundColor: colors.softPrimary },
              ]}
            >
              <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
            </View>

            <View style={styles.modalHeaderText}>
              <Text style={[styles.modalEyebrow, { color: colors.primary }]}>
                COLOR PICKER
              </Text>

              <Text style={[styles.modalTitle, { color: colors.title }]}>
                {title}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: colors.softCard }]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.currentColorBox,
              {
                backgroundColor: colors.softCard,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.currentColorLarge,
                {
                  backgroundColor: currentColor,
                  borderColor: colors.border,
                },
              ]}
            />

            <View style={styles.currentColorTextWrap}>
              <Text style={[styles.currentColorLabel, { color: colors.text }]}>
                Current color
              </Text>

              <Text style={[styles.currentColorValue, { color: colors.title }]}>
                {currentColor}
              </Text>
            </View>
          </View>

          <View style={styles.modalPalette}>
            {BIG_PALETTE.map((color) => (
              <TouchableOpacity
                key={`modal-${color}`}
                style={[
                  styles.modalSwatch,
                  {
                    backgroundColor: color,
                    borderColor:
                      color.toLowerCase() === currentColor.toLowerCase()
                        ? colors.title
                        : colors.border,
                  },
                ]}
                onPress={() => onPick(color)}
                activeOpacity={0.85}
              />
            ))}
          </View>

          <Text style={[styles.hexLabel, { color: colors.title }]}>
            Custom HEX
          </Text>

          <View style={styles.hexRow}>
            <ThemedInput
              value={customHex}
              onChangeText={onChangeCustomHex}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="#4F46E5"
              maxLength={7}
              colors={colors}
              style={styles.hexInput}
            />

            <TouchableOpacity
              style={[styles.hexButton, { backgroundColor: colors.button }]}
              onPress={onUseCustom}
              activeOpacity={0.88}
            >
              <Text style={[styles.hexButtonText, { color: colors.buttonText }]}>
                Use
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ThemedInput({
  colors,
  style,
  ...props
}: TextInputProps & {
  colors: AppearanceColors;
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

function makeAppearanceColors(settings: any): AppearanceColors {
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

function uniquePalette(colors: string[]) {
  const seen = new Set<string>();

  return colors.filter((color) => {
    const key = color.toLowerCase();

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function normalizeHexInput(value: string) {
  const clean = value.trim().toUpperCase();

  if (!clean) return "#4F46E5";

  return clean.startsWith("#") ? clean : `#${clean}`;
}

function readableCheckColor(color: string) {
  const normalized = color.trim();

  if (!/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
    return "#FFFFFF";
  }

  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.7 ? "#111827" : "#FFFFFF";
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

  content: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 40,
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
    backgroundColor: "rgba(255,255,255,0.16)",
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

  previewOuter: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 15,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 13,
  },

  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  previewHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  previewLabel: {
    fontSize: 15,
    fontWeight: "900",
  },

  previewSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
  },

  previewCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
  },

  previewTitle: {
    fontSize: 17,
    fontWeight: "900",
  },

  previewText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    opacity: 0.78,
    marginTop: 5,
  },

  previewButton: {
    alignSelf: "flex-start",
    minHeight: 38,
    borderRadius: 999,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 13,
  },

  previewButtonText: {
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

  sectionTitleRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 13,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
  },

  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  themeOption: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  themeOptionText: {
    fontSize: 12,
    fontWeight: "900",
  },

  colorSetting: {
    marginBottom: 18,
  },

  colorSettingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },

  colorLabelRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  currentColorDot: {
    width: 34,
    height: 34,
    borderRadius: 15,
    borderWidth: 1,
  },

  colorLabel: {
    fontSize: 14,
    fontWeight: "900",
  },

  colorValue: {
    fontSize: 11,
    fontWeight: "800",
    opacity: 0.68,
    marginTop: 1,
  },

  moreButton: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  moreButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },

  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButton: {
    minHeight: 50,
    borderRadius: 20,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  primaryButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },

  backgroundPreviewWrap: {
    marginTop: 14,
  },

  smallLabel: {
    fontSize: 12,
    fontWeight: "900",
    opacity: 0.72,
    marginBottom: 7,
  },

  backgroundPreview: {
    width: "100%",
    height: 132,
    borderRadius: 22,
  },

  dangerButton: {
    minHeight: 46,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 13,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  dangerButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },

  emptyImageBox: {
    minHeight: 68,
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },

  emptyImageText: {
    fontSize: 12,
    fontWeight: "800",
    opacity: 0.72,
  },

  fitGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  fitOption: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  fitOptionText: {
    fontSize: 12,
    fontWeight: "900",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20, 14, 10, 0.52)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },

  modalCard: {
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

  modalHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  modalEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  modalTitle: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
    marginTop: 2,
  },

  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  currentColorBox: {
    minHeight: 64,
    borderRadius: 22,
    borderWidth: 1,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  currentColorLarge: {
    width: 42,
    height: 42,
    borderRadius: 17,
    borderWidth: 1,
  },

  currentColorTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  currentColorLabel: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    opacity: 0.68,
  },

  currentColorValue: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
  },

  modalPalette: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
    marginBottom: 16,
  },

  modalSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
  },

  hexLabel: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 7,
  },

  hexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  input: {
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
  },

  hexInput: {
    flex: 1,
  },

  hexButton: {
    minHeight: 48,
    borderRadius: 18,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  hexButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },
});