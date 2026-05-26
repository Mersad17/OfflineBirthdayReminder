// src/screens/Settings/SettingsScreen.tsx
import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { SettingsStackParamsList } from "../../navigation/SettingsStack";
import { useAppearance } from "../../appearance/AppearanceContext";
import { Screen } from "../../components/Screen";

type Props = NativeStackScreenProps<SettingsStackParamsList, "SettingsHome">;

type SettingsColors = {
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

type SettingsRowProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  customIcon?: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  onPress: () => void;
  colors: SettingsColors;
};

export default function SettingsScreen({ navigation }: Props) {
  const { settings } = useAppearance();
  const colors = useMemo(() => makeSettingsColors(settings), [settings]);

  React.useEffect(() => {
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
          <SettingsHeader colors={colors} />

          <SettingsSection
            title="Appearance"
            icon="color-palette-outline"
            colors={colors}
          >
            <SettingsRow
              icon="color-palette-outline"
              title="Theme, colors & background"
              subtitle="Customize how your app feels"
              onPress={() => navigation.navigate("Appearance")}
              colors={colors}
            />

            <SettingsRow
              icon="language-outline"
              title="Language"
              subtitle="Choose your preferred language"
              onPress={() => navigation.navigate("Language")}
              colors={colors}
            />
          </SettingsSection>

          <SettingsSection
            title="Organization"
            icon="pricetags-outline"
            colors={colors}
          >
            <SettingsRow
              icon="pricetags-outline"
              title="Groups & Tags"
              subtitle="Manage custom groups, colors, and tags"
              onPress={() => navigation.navigate("ManageGroupsTags")}
              colors={colors}
            />
          </SettingsSection>

          <SettingsSection
            title="Notifications"
            icon="notifications-outline"
            colors={colors}
          >
            <SettingsRow
              icon="notifications-outline"
              title="Notification settings"
              subtitle="Permissions and test notifications"
              onPress={() => navigation.navigate("Notifications")}
              colors={colors}
            />
          </SettingsSection>

          <SettingsSection
            title="Privacy & data"
            icon="shield-checkmark-outline"
            colors={colors}
          >
            <SettingsRow
              icon="cloud-upload-outline"
              title="Backup & restore"
              subtitle="Export or import your local data"
              onPress={() => navigation.navigate("Backup")}
              colors={colors}
            />

            <SettingsRow
              icon="phone-portrait-outline"
              title="Local-first mode"
              subtitle="Your data is stored on this device"
              badge="Private"
              onPress={() => navigation.navigate("AppInfo")}
              colors={colors}
            />
          </SettingsSection>

          <SettingsSection
            title="Support"
            icon="help-buoy-outline"
            colors={colors}
          >
            <SettingsRow
              customIcon={
                <MaterialCommunityIcons
                  name="bug-outline"
                  size={20}
                  color={colors.primary}
                />
              }
              title="Report a bug"
              subtitle="Tell us what went wrong"
              onPress={() => navigation.navigate("ReportBug")}
              colors={colors}
            />

            <SettingsRow
              icon="chatbubble-ellipses-outline"
              title="Send feedback"
              subtitle="Share ideas to improve the app"
              onPress={() => navigation.navigate("Feedback")}
              colors={colors}
            />
          </SettingsSection>

          <SettingsSection
            title="App"
            icon="information-circle-outline"
            colors={colors}
          >
            <SettingsRow
              icon="information-circle-outline"
              title="About / Version"
              subtitle="App info and local-first details"
              onPress={() => navigation.navigate("AppInfo")}
              colors={colors}
            />
          </SettingsSection>
        </ScrollView>
      </View>
    </Screen>
  );
}

function SettingsHeader({ colors }: { colors: SettingsColors }) {
  return (
    <LinearGradient
      colors={[colors.primary, colors.button] as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.compactHeader}
    >
      <View style={styles.headerGlowOne} />
      <View style={styles.headerGlowTwo} />

      <View style={styles.headerRow}>
        <View style={styles.headerIconBubble}>
          <Ionicons name="settings-outline" size={23} color="#FFFFFF" />
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>SETTINGS</Text>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Settings
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={2}>
            Customize your app, privacy, reminders, and local data.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function SettingsSection({
  title,
  icon,
  colors,
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: SettingsColors;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View
          style={[
            styles.sectionIcon,
            { backgroundColor: colors.softPrimary },
          ]}
        >
          <Ionicons name={icon} size={14} color={colors.primary} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.title }]}>
          {title}
        </Text>
      </View>

      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function SettingsRow({
  icon,
  customIcon,
  title,
  subtitle,
  badge,
  onPress,
  colors,
}: SettingsRowProps) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={styles.rowLeft}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: colors.softPrimary },
          ]}
        >
          {customIcon ? (
            customIcon
          ) : (
            <Ionicons
              name={icon || "ellipse-outline"}
              size={20}
              color={colors.primary}
            />
          )}
        </View>

        <View style={styles.rowTextBox}>
          <View style={styles.rowTitleLine}>
            <Text
              style={[styles.rowTitle, { color: colors.title }]}
              numberOfLines={1}
            >
              {title}
            </Text>

            {badge ? (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: withOpacity(colors.success, "16"),
                    borderColor: withOpacity(colors.success, "35"),
                  },
                ]}
              >
                <Text style={[styles.badgeText, { color: colors.success }]}>
                  {badge}
                </Text>
              </View>
            ) : null}
          </View>

          {subtitle ? (
            <Text
              style={[styles.rowSubtitle, { color: colors.text }]}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={[
          styles.chevronCircle,
          { backgroundColor: colors.softCard },
        ]}
      >
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </View>
    </TouchableOpacity>
  );
}

/* helpers */

function makeSettingsColors(settings: any): SettingsColors {
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
    paddingBottom: 34,
  },

  compactHeader: {
    minHeight: 122,
    borderRadius: 28,
    padding: 16,
    marginBottom: 12,
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

  headerRow: {
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
    fontSize: 28,
    lineHeight: 33,
    fontWeight: "900",
    marginTop: 3,
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 2,
  },

  section: {
    marginTop: 12,
  },

  sectionHeader: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 2,
  },

  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },

  sectionCard: {
    borderRadius: 26,
    borderWidth: 1,
    paddingVertical: 4,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  row: {
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  rowLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  rowTextBox: {
    flex: 1,
    minWidth: 0,
  },

  rowTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  rowTitle: {
    flexShrink: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
  },

  rowSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
  },

  badge: {
    minHeight: 22,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  badgeText: {
    fontSize: 10,
    fontWeight: "900",
  },

  chevronCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});