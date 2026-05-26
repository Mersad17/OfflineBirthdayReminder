// src/screens/Settings/LanguageScreen.tsx
import React, { useEffect, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { SettingsStackParamsList } from "../../navigation/SettingsStack";
import { LanguagePreference } from "../../i18n/languageStorage";
import { useLanguage } from "../../i18n/LanguageContext";

type Props = NativeStackScreenProps<SettingsStackParamsList, "Language">;

type LanguageOption = {
  labelKey: string;
  subtitleKey: string;
  value: LanguagePreference;
  icon: keyof typeof Ionicons.glyphMap;
};

type LanguageColors = {
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

const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    labelKey: "language.options.system.label",
    subtitleKey: "language.options.system.subtitle",
    value: "system",
    icon: "phone-portrait-outline",
  },
  {
    labelKey: "language.options.en.label",
    subtitleKey: "language.options.en.subtitle",
    value: "en",
    icon: "flag-outline",
  },
  {
    labelKey: "language.options.fr.label",
    subtitleKey: "language.options.fr.subtitle",
    value: "fr",
    icon: "flag-outline",
  },
  {
    labelKey: "language.options.sq.label",
    subtitleKey: "language.options.sq.subtitle",
    value: "sq",
    icon: "flag-outline",
  },
];

export default function LanguageScreen({ navigation }: Props) {
  const { settings } = useAppearance();
  const { languagePreference, setLanguagePreference } = useLanguage();
  const { t } = useTranslation("settings");

  const colors = useMemo(() => makeLanguageColors(settings), [settings]);

  useEffect(() => {
    navigation.setOptions?.({
      headerShown: false,
    });
  }, [navigation]);

  return (
    <Screen>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <CompactHeader
            colors={colors}
            title={String(t("language.title"))}
            subtitle={String(t("language.subtitle"))}
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
              icon="language-outline"
              title={String(t("language.title"))}
              colors={colors}
            />

            <View style={styles.list}>
              {LANGUAGE_OPTIONS.map((option) => {
                const selected = languagePreference === option.value;

                return (
                  <LanguageRow
                    key={option.value}
                    label={String(t(option.labelKey))}
                    subtitle={String(t(option.subtitleKey))}
                    icon={option.icon}
                    selected={selected}
                    colors={colors}
                    onPress={() => setLanguagePreference(option.value)}
                  />
                );
              })}
            </View>
          </View>

          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <View
              style={[
                styles.infoIcon,
                { backgroundColor: colors.softPrimary },
              ]}
            >
              <Ionicons
                name="sparkles-outline"
                size={18}
                color={colors.primary}
              />
            </View>

            <View style={styles.infoTextWrap}>
              <Text style={[styles.infoTitle, { color: colors.title }]}>
                {String(t("language.title"))}
              </Text>

              <Text style={[styles.infoText, { color: colors.text }]}>
                Your language preference is saved on this device and applied across the app.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

function CompactHeader({
  colors,
  title,
  subtitle,
  onBack,
}: {
  colors: LanguageColors;
  title: string;
  subtitle: string;
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
          <Ionicons name="language-outline" size={14} color="#FFFFFF" />
          <Text style={styles.headerPillText}>Language</Text>
        </View>
      </View>

      <View style={styles.headerMainRow}>
        <View style={styles.headerIconBubble}>
          <Ionicons name="globe-outline" size={24} color="#FFFFFF" />
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>LANGUAGE</Text>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={2}>
            {subtitle}
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
  colors: LanguageColors;
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

function LanguageRow({
  label,
  subtitle,
  icon,
  selected,
  colors,
  onPress,
}: {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  colors: LanguageColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.row,
        {
          backgroundColor: selected ? colors.softPrimary : colors.softCard,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.rowIcon,
          {
            backgroundColor: selected ? colors.primary : colors.softPrimary,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={selected ? colors.buttonText : colors.primary}
        />
      </View>

      <View style={styles.rowTextWrap}>
        <Text
          style={[styles.label, { color: colors.title }]}
          numberOfLines={1}
        >
          {label}
        </Text>

        <Text
          style={[styles.rowSubtitle, { color: colors.text }]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      </View>

      <View
        style={[
          styles.checkCircle,
          {
            backgroundColor: selected ? colors.primary : "transparent",
            borderColor: selected ? colors.primary : colors.border,
          },
        ]}
      >
        {selected ? (
          <Ionicons name="checkmark" size={15} color={colors.buttonText} />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

/* helpers */

function makeLanguageColors(settings: any): LanguageColors {
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

  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
  },

  list: {
    gap: 8,
  },

  row: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 22,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  rowTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  label: {
    fontSize: 15,
    fontWeight: "900",
  },

  rowSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 2,
  },

  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },

  infoCard: {
    minHeight: 78,
    borderRadius: 24,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  infoTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  infoText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 2,
  },
});