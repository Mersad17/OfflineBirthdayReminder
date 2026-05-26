// src/screens/settings/ReportBugScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import Constants from "expo-constants";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { SettingsStackParamsList } from "../../navigation/SettingsStack";
import { useAppearance } from "../../appearance/AppearanceContext";
import { Screen } from "../../components/Screen";

type Props = NativeStackScreenProps<SettingsStackParamsList, "ReportBug">;

type ReportBugColors = {
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
  blue: string;
  purple: string;
  shadow: string;
};

export default function ReportBugScreen({ navigation }: Props) {
  const { settings } = useAppearance();
  const colors = useMemo(() => makeReportBugColors(settings), [settings]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const appVersion =
    Constants.expoConfig?.version ??
    Constants.nativeApplicationVersion ??
    "unknown";

  const platform = Platform.OS;

  const bugReportUrl =
    (Constants.expoConfig?.extra?.bugReportUrl as string | undefined) ??
    "https://example.com/report-bug";

  useEffect(() => {
    navigation.setOptions?.({
      headerShown: false,
    });
  }, [navigation]);

  async function onSubmit() {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (!cleanTitle || !cleanDescription) {
      Alert.alert("Report a bug", "Please fill in both fields.");
      return;
    }

    try {
      setSubmitting(true);

      const url = buildBugReportUrl({
        baseUrl: bugReportUrl,
        title: cleanTitle,
        description: cleanDescription,
        appVersion,
        platform,
      });

      await Linking.openURL(url);

      Alert.alert(
        "Report a bug",
        "Your bug report page has been opened. Thank you for helping improve the app.",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );

      setTitle("");
      setDescription("");
    } catch (error) {
      console.log("Bug report link error", error);

      Alert.alert(
        "Report a bug",
        "Could not open the bug report page. Please try again later."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.keyboardRoot, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <Screen>
        <View style={[styles.root, { backgroundColor: colors.background }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            <CompactHeader colors={colors} onBack={() => navigation.goBack()} />

            <PromiseCard colors={colors} />

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
                icon="bug-outline"
                title="Bug details"
                colors={colors}
              />

              <Text style={[styles.sectionText, { color: colors.text }]}>
                Tell us what broke, what screen you were on, and what you
                expected to happen instead.
              </Text>

              <FieldLabel title="Short title" colors={colors} />

              <ThemedInput
                value={title}
                onChangeText={setTitle}
                placeholder="Example: Crash when adding a birthday"
                colors={colors}
                editable={!submitting}
              />

              <FieldLabel title="What happened?" colors={colors} />

              <ThemedInput
                value={description}
                onChangeText={setDescription}
                placeholder="Steps to reproduce, what you expected, what actually happened..."
                colors={colors}
                editable={!submitting}
                multiline
                textAlignVertical="top"
                style={styles.textArea}
              />

              <Text style={[styles.helperText, { color: colors.text }]}>
                Add clear steps if possible. Example: 1. Open contact. 2. Add
                reminder. 3. App closes.
              </Text>

              <PrimaryButton
                title={submitting ? "Opening..." : "Open bug report page"}
                icon="open-outline"
                loading={submitting}
                disabled={submitting}
                colors={colors}
                onPress={onSubmit}
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
              <SectionTitle
                icon="clipboard-outline"
                title="Helpful information"
                colors={colors}
              />

              <InfoRow
                icon="list-outline"
                title="Steps help the most"
                text="The best bug reports explain exactly how to reproduce the problem."
                color={colors.primary}
                colors={colors}
              />

              <InfoRow
                icon="phone-portrait-outline"
                title="App context is included"
                text="The bug report link includes your app version and platform so debugging is easier."
                color={colors.blue}
                colors={colors}
              />

              <InfoRow
                icon="shield-checkmark-outline"
                title="You control the report"
                text="Only the title, description, app version, and platform are prepared for the report page."
                color={colors.success}
                colors={colors}
                isLast
              />
            </View>

            <View
              style={[
                styles.warningCard,
                {
                  backgroundColor: withOpacity(colors.warning, "14"),
                  borderColor: withOpacity(colors.warning, "35"),
                },
              ]}
            >
              <View
                style={[
                  styles.warningIcon,
                  { backgroundColor: withOpacity(colors.warning, "18") },
                ]}
              >
                <Ionicons name="warning-outline" size={19} color={colors.warning} />
              </View>

              <View style={styles.warningTextWrap}>
                <Text style={[styles.warningTitle, { color: colors.warning }]}>
                  Avoid private details
                </Text>

                <Text style={[styles.warningText, { color: colors.warning }]}>
                  Do not include personal notes, private contact details, or
                  sensitive information unless it is necessary for the bug report.
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.metaCard,
                {
                  backgroundColor: colors.softCard,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={[styles.metaIcon, { backgroundColor: colors.softPrimary }]}>
                <Ionicons name="construct-outline" size={18} color={colors.primary} />
              </View>

              <View style={styles.metaTextWrap}>
                <Text style={[styles.metaTitle, { color: colors.title }]}>
                  Debug context
                </Text>

                <Text style={[styles.metaText, { color: colors.text }]}>
                  Version {appVersion} · {platform}
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function CompactHeader({
  colors,
  onBack,
}: {
  colors: ReportBugColors;
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
          <Ionicons name="bug-outline" size={14} color="#FFFFFF" />
          <Text style={styles.headerPillText}>Bug report</Text>
        </View>
      </View>

      <View style={styles.headerMainRow}>
        <View style={styles.headerIconBubble}>
          <Ionicons name="construct-outline" size={24} color="#FFFFFF" />
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>HELP US FIX IT</Text>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Report a bug
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={2}>
            Found something broken? Send clear details so the problem can be
            understood and fixed faster.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function PromiseCard({ colors }: { colors: ReportBugColors }) {
  return (
    <LinearGradient
      colors={[
        withOpacity(colors.danger, "16"),
        withOpacity(colors.primary, "10"),
      ] as [string, string]}
      style={[
        styles.promiseCard,
        {
          borderColor: withOpacity(colors.danger, "25"),
        },
      ]}
    >
      <View
        style={[
          styles.promiseIcon,
          { backgroundColor: withOpacity(colors.danger, "16") },
        ]}
      >
        <Ionicons name="bug-outline" size={24} color={colors.danger} />
      </View>

      <View style={styles.promiseTextWrap}>
        <Text style={[styles.promiseTitle, { color: colors.title }]}>
          Small reports make the app better
        </Text>

        <Text style={[styles.promiseText, { color: colors.text }]}>
          A good bug report helps find crashes, confusing behavior, broken
          buttons, and design problems faster.
        </Text>
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
  colors: ReportBugColors;
}) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionIcon, { backgroundColor: colors.softPrimary }]}>
        <Ionicons name={icon} size={17} color={colors.primary} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.title }]}>
        {title}
      </Text>
    </View>
  );
}

function FieldLabel({
  title,
  colors,
}: {
  title: string;
  colors: ReportBugColors;
}) {
  return (
    <Text style={[styles.label, { color: colors.title }]}>
      {title}
    </Text>
  );
}

function ThemedInput({
  colors,
  style,
  ...props
}: TextInputProps & {
  colors: ReportBugColors;
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

function InfoRow({
  icon,
  title,
  text,
  color,
  colors,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  color: string;
  colors: ReportBugColors;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        !isLast && { borderBottomColor: colors.border, borderBottomWidth: 1 },
      ]}
    >
      <View style={[styles.infoIcon, { backgroundColor: withOpacity(color, "16") }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>

      <View style={styles.infoTextWrap}>
        <Text style={[styles.infoTitle, { color: colors.title }]}>
          {title}
        </Text>

        <Text style={[styles.infoText, { color: colors.text }]}>
          {text}
        </Text>
      </View>
    </View>
  );
}

function PrimaryButton({
  title,
  icon,
  loading,
  disabled,
  colors,
  onPress,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  colors: ReportBugColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.88}
      style={[
        styles.primaryButton,
        { backgroundColor: colors.button },
        disabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.buttonText} />
      ) : (
        <Ionicons name={icon} size={18} color={colors.buttonText} />
      )}

      <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

/* helpers */

function buildBugReportUrl({
  baseUrl,
  title,
  description,
  appVersion,
  platform,
}: {
  baseUrl: string;
  title: string;
  description: string;
  appVersion: string;
  platform: string;
}) {
  const separator = baseUrl.includes("?") ? "&" : "?";

  return (
    `${baseUrl}${separator}` +
    `title=${encodeURIComponent(title)}` +
    `&description=${encodeURIComponent(description)}` +
    `&app_version=${encodeURIComponent(appVersion)}` +
    `&platform=${encodeURIComponent(platform)}`
  );
}

function makeReportBugColors(settings: any): ReportBugColors {
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
    blue: "#4D82D8",
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

/* styles */

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },

  root: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 44,
    gap: 12,
  },

  compactHeader: {
    minHeight: 168,
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

  sectionText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    opacity: 0.76,
    marginBottom: 12,
  },

  label: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 7,
    marginTop: 6,
  },

  input: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },

  textArea: {
    minHeight: 150,
    paddingTop: 12,
  },

  helperText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.62,
    marginTop: 9,
  },

  promiseCard: {
    minHeight: 106,
    borderRadius: 28,
    borderWidth: 1,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  promiseIcon: {
    width: 52,
    height: 52,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  promiseTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  promiseTitle: {
    fontSize: 17,
    fontWeight: "900",
  },

  promiseText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    opacity: 0.76,
    marginTop: 4,
  },

  primaryButton: {
    minHeight: 52,
    borderRadius: 20,
    paddingHorizontal: 14,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  primaryButtonText: {
    fontSize: 14,
    fontWeight: "900",
  },

  infoRow: {
    flexDirection: "row",
    gap: 11,
    paddingVertical: 13,
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
    fontSize: 15,
    fontWeight: "900",
  },

  infoText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 3,
  },

  warningCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },

  warningIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  warningTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  warningTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  warningText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    opacity: 0.9,
    marginTop: 3,
  },

  metaCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  metaIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  metaTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  metaTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  metaText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
    textTransform: "capitalize",
  },

  disabled: {
    opacity: 0.6,
  },
});