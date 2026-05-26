// src/screens/Settings/AppInfoScreen.tsx
import React, { useEffect, useMemo } from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";

import { SettingsStackParamsList } from "../../navigation/SettingsStack";
import { useAppearance } from "../../appearance/AppearanceContext";
import { Screen } from "../../components/Screen";

type Props = NativeStackScreenProps<SettingsStackParamsList, "AppInfo">;

type AppInfoColors = {
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
  purple: string;
  blue: string;
  shadow: string;
};

export default function AppInfoScreen({ navigation }: Props) {
  const { settings } = useAppearance();
  const colors = useMemo(() => makeAppInfoColors(settings), [settings]);

  const appName = Constants.expoConfig?.name ?? "Friendly Reminder";
  const version =
    Constants.expoConfig?.version ?? Constants.nativeApplicationVersion ?? "–";
  const buildNumber =
    Constants.nativeBuildVersion ??
    String(Constants.expoConfig?.runtimeVersion ?? "–");

  const environment = __DEV__ ? "Development" : "Production";
  const platformLabel = Platform.OS === "ios" ? "iOS" : "Android";

  const privacyUrl =
    (Constants.expoConfig?.extra?.privacyUrl as string | undefined) ??
    "https://example.com/privacy";

  const termsUrl =
    (Constants.expoConfig?.extra?.termsUrl as string | undefined) ??
    "https://example.com/terms";

  useEffect(() => {
    navigation.setOptions?.({
      headerShown: false,
    });
  }, [navigation]);

  async function openLink(url: string) {
    try {
      const canOpen = await Linking.canOpenURL(url);

      if (!canOpen) {
        Alert.alert("Cannot open link", "This link could not be opened.");
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.log("Failed to open URL", error);
      Alert.alert("Cannot open link", "Something went wrong opening this link.");
    }
  }

  return (
    <Screen>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <CompactHeader
            colors={colors}
            appName={appName}
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
              icon="phone-portrait-outline"
              title="App details"
              colors={colors}
            />

            <InfoRow
              icon="apps-outline"
              label="App name"
              value={appName}
              colors={colors}
            />

            <InfoRow
              icon="pricetag-outline"
              label="Version"
              value={version}
              colors={colors}
            />

            <InfoRow
              icon="construct-outline"
              label="Build"
              value={buildNumber}
              colors={colors}
            />

            <InfoRow
              icon="server-outline"
              label="Environment"
              value={environment}
              colors={colors}
            />

            <InfoRow
              icon="phone-portrait-outline"
              label="Platform"
              value={platformLabel}
              colors={colors}
              isLast
            />
          </View>

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
              icon="sparkles-outline"
              title="What this app helps with"
              colors={colors}
            />

            <FeatureRow
              icon="people-outline"
              title="Remember people better"
              text="Keep birthdays, notes, interests, tags, groups, memories, and personal details in one private profile."
              color={colors.primary}
              colors={colors}
            />

            <FeatureRow
              icon="notifications-outline"
              title="Never forget follow-ups"
              text="Create reminders for birthdays, interviews, promises, check-ins, important dates, and small thoughtful moments."
              color={colors.warning}
              colors={colors}
            />

            <FeatureRow
              icon="heart-outline"
              title="Build stronger relationships"
              text="Track your interaction history, what to ask next time, and the little details that make conversations feel personal."
              color={colors.danger}
              colors={colors}
            />

            <FeatureRow
              icon="images-outline"
              title="Keep memories alive"
              text="Save meaningful memories and photo albums connected to the people you care about."
              color={colors.blue}
              colors={colors}
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
            <SectionTitle
              icon="shield-checkmark-outline"
              title="Privacy & local-first"
              colors={colors}
            />

            <PrivacyPoint
              icon="phone-portrait-outline"
              title="Stored on your device"
              text="Your relationship notes and reminders are designed to work locally on your phone."
              colors={colors}
            />

            <PrivacyPoint
              icon="archive-outline"
              title="Export your data"
              text="Use Backup & restore to create a backup file and keep control of your information."
              colors={colors}
            />

            <PrivacyPoint
              icon="lock-closed-outline"
              title="Password-protected backups"
              text="When exporting, password protection is recommended because your backup can contain personal notes and memories."
              colors={colors}
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
            <SectionTitle
              icon="help-buoy-outline"
              title="Support"
              colors={colors}
            />

            <ActionRow
              icon="chatbubble-ellipses-outline"
              title="Send feedback"
              subtitle="Share ideas, improvements, or things that feel confusing."
              colors={colors}
              onPress={() => navigation.navigate("Feedback")}
            />

            <ActionRow
              icon="bug-outline"
              title="Report a bug"
              subtitle="Tell us what broke, what screen you were on, and what you expected."
              colors={colors}
              onPress={() => navigation.navigate("ReportBug")}
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
            <SectionTitle
              icon="document-text-outline"
              title="Legal"
              colors={colors}
            />

            <ActionRow
              icon="shield-outline"
              title="Privacy Policy"
              subtitle="Read how personal data and local backups should be handled."
              colors={colors}
              onPress={() => openLink(privacyUrl)}
            />

            <ActionRow
              icon="reader-outline"
              title="Terms of Service"
              subtitle="Read the basic terms for using this app."
              colors={colors}
              onPress={() => openLink(termsUrl)}
              isLast
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerTitle, { color: colors.title }]}>
              Built to help you care better.
            </Text>

            <Text style={[styles.footerText, { color: colors.text }]}>
              © {new Date().getFullYear()} {appName}. All rights reserved.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

function CompactHeader({
  colors,
  appName,
  onBack,
}: {
  colors: AppInfoColors;
  appName: string;
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
          <Ionicons name="information-circle-outline" size={14} color="#FFFFFF" />
          <Text style={styles.headerPillText}>About</Text>
        </View>
      </View>

      <View style={styles.headerMainRow}>
        <View style={styles.headerIconBubble}>
          <Ionicons name="heart-outline" size={24} color="#FFFFFF" />
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>APP INFO</Text>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {appName}
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={2}>
            A private relationship memory app for reminders, notes, moments, and people you care about.
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
  colors: AppInfoColors;
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

function InfoRow({
  icon,
  label,
  value,
  colors,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: AppInfoColors;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        !isLast && { borderBottomColor: colors.border, borderBottomWidth: 1 },
      ]}
    >
      <View style={styles.infoLeft}>
        <View style={[styles.smallIcon, { backgroundColor: colors.softPrimary }]}>
          <Ionicons name={icon} size={15} color={colors.primary} />
        </View>

        <Text style={[styles.infoLabel, { color: colors.text }]}>
          {label}
        </Text>
      </View>

      <Text style={[styles.infoValue, { color: colors.title }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function PromiseCard({ colors }: { colors: AppInfoColors }) {
  return (
    <LinearGradient
      colors={[
        withOpacity(colors.primary, "18"),
        withOpacity(colors.button, "10"),
      ] as [string, string]}
      style={[
        styles.promiseCard,
        {
          borderColor: withOpacity(colors.primary, "28"),
        },
      ]}
    >
      <View style={[styles.promiseIcon, { backgroundColor: colors.softPrimary }]}>
        <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
      </View>

      <View style={styles.promiseTextWrap}>
        <Text style={[styles.promiseTitle, { color: colors.title }]}>
          Private by design
        </Text>

        <Text style={[styles.promiseText, { color: colors.text }]}>
          This app is built around a simple idea: personal relationship details
          should feel safe, human, and under your control.
        </Text>
      </View>
    </LinearGradient>
  );
}

function FeatureRow({
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
  colors: AppInfoColors;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.featureRow,
        !isLast && { borderBottomColor: colors.border, borderBottomWidth: 1 },
      ]}
    >
      <View style={[styles.featureIcon, { backgroundColor: withOpacity(color, "16") }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>

      <View style={styles.featureTextWrap}>
        <Text style={[styles.featureTitle, { color: colors.title }]}>
          {title}
        </Text>

        <Text style={[styles.featureText, { color: colors.text }]}>
          {text}
        </Text>
      </View>
    </View>
  );
}

function PrivacyPoint({
  icon,
  title,
  text,
  colors,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  colors: AppInfoColors;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.privacyPoint,
        !isLast && { borderBottomColor: colors.border, borderBottomWidth: 1 },
      ]}
    >
      <View style={[styles.smallIcon, { backgroundColor: colors.softPrimary }]}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>

      <View style={styles.privacyTextWrap}>
        <Text style={[styles.privacyTitle, { color: colors.title }]}>
          {title}
        </Text>

        <Text style={[styles.privacyText, { color: colors.text }]}>
          {text}
        </Text>
      </View>
    </View>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  colors,
  onPress,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  colors: AppInfoColors;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionRow,
        !isLast && { borderBottomColor: colors.border, borderBottomWidth: 1 },
      ]}
      onPress={onPress}
      activeOpacity={0.84}
    >
      <View style={[styles.actionIcon, { backgroundColor: colors.softPrimary }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>

      <View style={styles.actionTextWrap}>
        <Text style={[styles.actionTitle, { color: colors.title }]}>
          {title}
        </Text>

        <Text style={[styles.actionSubtitle, { color: colors.text }]}>
          {subtitle}
        </Text>
      </View>

      <View style={[styles.chevronCircle, { backgroundColor: colors.softCard }]}>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </View>
    </TouchableOpacity>
  );
}

/* helpers */

function makeAppInfoColors(settings: any): AppInfoColors {
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
    purple: "#8A6BD8",
    blue: "#4D82D8",
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
    paddingBottom: 44,
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

  infoRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  smallIcon: {
    width: 32,
    height: 32,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  infoLabel: {
    fontSize: 13,
    fontWeight: "800",
    opacity: 0.76,
  },

  infoValue: {
    flex: 1,
    minWidth: 0,
    textAlign: "right",
    fontSize: 14,
    fontWeight: "900",
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

  featureRow: {
    flexDirection: "row",
    gap: 11,
    paddingVertical: 13,
  },

  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  featureTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  featureTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  featureText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 3,
  },

  privacyPoint: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 13,
  },

  privacyTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  privacyTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  privacyText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 3,
  },

  actionRow: {
    minHeight: 72,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  actionTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  actionTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  actionSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
  },

  chevronCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  footer: {
    alignItems: "center",
    paddingTop: 10,
    paddingHorizontal: 20,
  },

  footerTitle: {
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },

  footerText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.62,
    textAlign: "center",
    marginTop: 4,
  },
});