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

import { SettingsStackParamsList } from "../../navigation/SettingsStack";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";

type Props = NativeStackScreenProps<SettingsStackParamsList>;

type LocalFirstColors = {
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

export default function LocalFirstScreen({ navigation }: Props) {
  const { settings } = useAppearance();
  const colors = useMemo(() => makeLocalFirstColors(settings), [settings]);

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
              icon="phone-portrait-outline"
              title="Local-first by design"
              colors={colors}
            />

            <PrivacyRow
              icon="phone-portrait-outline"
              title="Your data stays on your device"
              text="Your contacts, memories, notes, birthdays, reminders, interaction history, and personal details are stored locally on your phone."
              color={colors.primary}
              colors={colors}
            />

            <PrivacyRow
              icon="eye-off-outline"
              title="We do not read your private notes"
              text="We do not look inside your relationship profiles, memories, personal notes, or reminders."
              color={colors.purple}
              colors={colors}
            />

            <PrivacyRow
              icon="server-outline"
              title="No personal memory cloud"
              text="This app is not designed to upload your relationship data to our servers. Your private memory profiles are yours."
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
              icon="card-outline"
              title="What uses the internet"
              colors={colors}
            />

            <InfoBox
              icon="card-outline"
              title="Subscription checks only"
              text="The online part is used for subscription purchase and subscription verification, so the app can know which premium features are active."
              colors={colors}
            />

            <PrivacyRow
              icon="checkmark-circle-outline"
              title="Your private content is separate"
              text="Subscription status is different from your personal app data. Your notes, memories, and reminders are not needed for subscription verification."
              color={colors.success}
              colors={colors}
            />

            <PrivacyRow
              icon="wifi-outline"
              title="Offline-first experience"
              text="The app is designed so your important relationship information can still be available locally, even without constant internet access."
              color={colors.primary}
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
              icon="archive-outline"
              title="Backups are important"
              colors={colors}
            />

            <WarningBox
              colors={colors}
              title="Be careful: local data needs backup"
              text="Because your data is local-first, losing your phone, deleting the app, or resetting your device can remove your data if you do not have a backup saved somewhere safe."
            />

            <PrivacyRow
              icon="download-outline"
              title="Create backup files"
              text="Use Backup & restore to export your data and keep a copy outside the app, such as in your phone files, cloud drive, or another safe place."
              color={colors.primary}
              colors={colors}
            />

            <PrivacyRow
              icon="refresh-outline"
              title="Backup regularly"
              text="If you add important contacts, memories, photos, or reminders, create a new backup so your saved copy stays up to date."
              color={colors.warning}
              colors={colors}
              isLast
            />

            <PrimaryButton
              title="Open Backup & Restore"
              icon="archive-outline"
              colors={colors}
              onPress={() => navigation.navigate("Backup")}
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
              icon="lock-closed-outline"
              title="Password & encrypted backups"
              colors={colors}
            />

            <PrivacyRow
              icon="lock-closed-outline"
              title="Password protection"
              text="When creating a backup, password protection is recommended because the file can contain names, birthdays, notes, memories, reminders, and relationship history."
              color={colors.success}
              colors={colors}
            />

            <PrivacyRow
              icon="key-outline"
              title="Encrypted backup data"
              text="Protected backups are meant to keep your exported data safer if the backup file is shared, saved online, or stored outside your phone."
              color={colors.primary}
              colors={colors}
            />

            <PrivacyRow
              icon="warning-outline"
              title="Do not forget the password"
              text="If you forget the backup password, the encrypted backup may not be recoverable. Save the password somewhere safe."
              color={colors.warning}
              colors={colors}
              isLast
            />
          </View>

          <View
            style={[
              styles.finalCard,
              {
                backgroundColor: colors.softCard,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color={colors.primary}
            />

            <Text style={[styles.finalTitle, { color: colors.title }]}>
              Simple promise
            </Text>

            <Text style={[styles.finalText, { color: colors.text }]}>
              Your relationship data should belong to you. We focus on helping
              you remember people better — not collecting your private life.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

function CompactHeader({
  colors,
  onBack,
}: {
  colors: LocalFirstColors;
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
          <Ionicons name="shield-checkmark-outline" size={14} color="#FFFFFF" />
          <Text style={styles.headerPillText}>Local-first</Text>
        </View>
      </View>

      <View style={styles.headerMainRow}>
        <View style={styles.headerIconBubble}>
          <Ionicons name="lock-closed-outline" size={24} color="#FFFFFF" />
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>PRIVACY PROMISE</Text>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Your data is yours
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={2}>
            We do not build this app to collect your personal memories. Your
            data lives locally, with backup tools under your control.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function PromiseCard({ colors }: { colors: LocalFirstColors }) {
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
          Private, local, under your control
        </Text>

        <Text style={[styles.promiseText, { color: colors.text }]}>
          This app is made for personal relationship memories. We do not need
          your private notes, moments, or history to run the app.
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
  colors: LocalFirstColors;
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

function PrivacyRow({
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
  colors: LocalFirstColors;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.privacyRow,
        !isLast && { borderBottomColor: colors.border, borderBottomWidth: 1 },
      ]}
    >
      <View style={[styles.privacyIcon, { backgroundColor: withOpacity(color, "16") }]}>
        <Ionicons name={icon} size={18} color={color} />
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

function InfoBox({
  icon,
  title,
  text,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  colors: LocalFirstColors;
}) {
  return (
    <View
      style={[
        styles.infoBox,
        {
          backgroundColor: colors.softCard,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.infoIcon, { backgroundColor: colors.softPrimary }]}>
        <Ionicons name={icon} size={20} color={colors.primary} />
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

function WarningBox({
  title,
  text,
  colors,
}: {
  title: string;
  text: string;
  colors: LocalFirstColors;
}) {
  return (
    <View
      style={[
        styles.warningBox,
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
          {title}
        </Text>

        <Text style={[styles.warningText, { color: colors.warning }]}>
          {text}
        </Text>
      </View>
    </View>
  );
}

function PrimaryButton({
  title,
  icon,
  onPress,
  colors,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  colors: LocalFirstColors;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[styles.primaryButton, { backgroundColor: colors.button }]}
    >
      <Ionicons name={icon} size={18} color={colors.buttonText} />

      <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>
        {title}
      </Text>

      <Ionicons name="chevron-forward" size={17} color={colors.buttonText} />
    </TouchableOpacity>
  );
}

/* helpers */

function makeLocalFirstColors(settings: any): LocalFirstColors {
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

  promiseCard: {
    minHeight: 116,
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

  privacyRow: {
    flexDirection: "row",
    gap: 11,
    paddingVertical: 13,
  },

  privacyIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  privacyTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  privacyTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  privacyText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 3,
  },

  infoBox: {
    minHeight: 88,
    borderRadius: 22,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 4,
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
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 3,
  },

  warningBox: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    marginBottom: 4,
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

  finalCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
    alignItems: "center",
  },

  finalTitle: {
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 8,
  },

  finalText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    opacity: 0.74,
    textAlign: "center",
    marginTop: 5,
  },
});