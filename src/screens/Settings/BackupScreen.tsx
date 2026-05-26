// src/screens/Settings/BackupScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { SettingsStackParamsList } from "../../navigation/SettingsStack";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import {
  exportBackupFile,
  pickAndImportBackupFile,
  shareBackupFile,
  saveBackupToDevice,
} from "../../backup/backupFiles";
import { BackupProgress } from "../../backup/progress";

type Props = NativeStackScreenProps<SettingsStackParamsList, "Backup">;

type ExportedBackup = {
  uri: string;
  filename: string;
  sizeBytes: number;
  passwordProtected: boolean;
};

type BackupColors = {
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

export default function BackupScreen({ navigation }: Props) {
  const { settings } = useAppearance();
  const colors = useMemo(() => makeBackupColors(settings), [settings]);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<BackupProgress | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastBackup, setLastBackup] = useState<ExportedBackup | null>(null);

  const [showLogs, setShowLogs] = useState(false);
  const [passwordProtected, setPasswordProtected] = useState(true);
  const [exportPassword, setExportPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [importPassword, setImportPassword] = useState("");

  const percent = clampPercent(progress?.percent ?? 0);

  useEffect(() => {
    navigation.setOptions?.({
      headerShown: false,
    });
  }, [navigation]);

  function resetProgress() {
    setProgress(null);
    setLogs([]);
  }

  function handleProgress(next: BackupProgress) {
    setProgress(next);

    setLogs((prev) => {
      const line = `${next.percent}% — ${next.message}${
        next.detail ? ` ${next.detail}` : ""
      }`;

      return [line, ...prev].slice(0, 14);
    });
  }

  async function onExport() {
    if (passwordProtected) {
      if (exportPassword.length < 8) {
        Alert.alert("Backup password", "Please use at least 8 characters.");
        return;
      }

      if (exportPassword !== confirmPassword) {
        Alert.alert("Backup password", "Passwords do not match.");
        return;
      }

      await runExport();
      return;
    }

    Alert.alert(
      "Export without password?",
      "This backup may contain names, birthdays, notes, reminders, and relationship history. Anyone with this file can read it.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Export without password",
          style: "destructive",
          onPress: () => {
            void runExport();
          },
        },
      ]
    );
  }

  async function runExport() {
    try {
      setBusy(true);
      setLastBackup(null);
      resetProgress();

      const result = await exportBackupFile(
        {
          passwordProtected,
          password: passwordProtected ? exportPassword : undefined,
        },
        handleProgress
      );

      setLastBackup(result);

      Alert.alert(
        "Backup ready",
        Platform.OS === "android"
          ? "The backup was created. You can now save it to a folder on your phone or share it."
          : "The backup was created. Use Share / Save to Files to save it outside the app."
      );
    } catch (error: any) {
      console.log("Export backup error", error);
      Alert.alert("Export backup", error?.message || "Failed to export backup.");
    } finally {
      setBusy(false);
    }
  }

  async function onShareLastBackup() {
    if (!lastBackup) {
      Alert.alert("Backup", "Create a backup first.");
      return;
    }

    try {
      setBusy(true);

      handleProgress({
        percent: 10,
        message: "Opening share / save sheet...",
        detail: lastBackup.filename,
      });

      await shareBackupFile(lastBackup.uri);

      handleProgress({
        percent: 100,
        message: "Share sheet opened.",
      });
    } catch (error: any) {
      console.log("Share backup error", error);
      Alert.alert("Share backup", error?.message || "Could not share backup.");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveBackupToPhone() {
    if (!lastBackup) {
      Alert.alert("Backup", "Create a backup first.");
      return;
    }

    try {
      setBusy(true);

      const result = await saveBackupToDevice(
        {
          sourceUri: lastBackup.uri,
          filename: lastBackup.filename,
          mimeType: "application/json",
        },
        handleProgress
      );

      Alert.alert(
        "Backup saved",
        result.uri
          ? `Backup saved successfully.\n\n${result.uri}`
          : "Backup saved successfully."
      );
    } catch (error: any) {
      console.log("Save backup error", error);
      Alert.alert(
        "Save backup",
        error?.message || "Could not save backup to phone."
      );
    } finally {
      setBusy(false);
    }
  }

  function chooseImportMode() {
    Alert.alert("Import backup", "Choose how to import the backup.", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Merge",
        onPress: () => {
          void onImport("merge");
        },
      },
      {
        text: "Replace all data",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Replace all local data?",
            "This will delete your current local data and replace it with the backup. Make sure you have another backup first.",
            [
              {
                text: "Cancel",
                style: "cancel",
              },
              {
                text: "Replace",
                style: "destructive",
                onPress: () => {
                  void onImport("replace");
                },
              },
            ]
          );
        },
      },
    ]);
  }

  async function onImport(mode: "merge" | "replace") {
    try {
      setBusy(true);
      resetProgress();

      const result = await pickAndImportBackupFile(
        {
          mode,
          password: importPassword || undefined,
        },
        handleProgress
      );

      if (result.canceled) return;

      const imported = result.imported?.imported;
      const rescheduled = result.rescheduled;
      const restoredPhotos = result.imported?.restoredPhotos;

      Alert.alert(
        "Import complete",
        [
          `Contacts: ${imported?.contacts ?? 0}`,
          `Events: ${imported?.contactEvents ?? 0}`,
          `Reminders imported: ${imported?.reminders ?? 0}`,
          `Memories: ${imported?.contactMemories ?? 0}`,
          `Interactions: ${imported?.interactions ?? 0}`,
          `Contact photos in backup: ${imported?.contactPhotos ?? 0}`,
          `Photos restored: ${restoredPhotos?.restored ?? 0}`,
          `Photo restore failed: ${restoredPhotos?.failed ?? 0}`,
          "",
          rescheduled?.notificationsEnabled
            ? `Notifications scheduled: ${rescheduled.scheduled}`
            : "Notifications are disabled. Imported reminders were saved but not scheduled.",
          `Skipped reminders: ${rescheduled?.skipped ?? 0}`,
          `Failed reminders: ${rescheduled?.failed ?? 0}`,
        ].join("\n"),
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.log("Import backup error", error);

      Alert.alert(
        "Import backup",
        error?.message ||
          "Failed to import backup. If this is encrypted, check the password."
      );
    } finally {
      setBusy(false);
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
                title="Export backup"
                colors={colors}
              />

              <View
                style={[
                  styles.protectionBox,
                  {
                    backgroundColor: colors.softCard,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.protectionIcon,
                    {
                      backgroundColor: passwordProtected
                        ? withOpacity(colors.success, "18")
                        : withOpacity(colors.warning, "18"),
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      passwordProtected
                        ? "shield-checkmark-outline"
                        : "warning-outline"
                    }
                    size={20}
                    color={passwordProtected ? colors.success : colors.warning}
                  />
                </View>

                <View style={styles.protectionTextWrap}>
                  <Text style={[styles.protectionTitle, { color: colors.title }]}>
                    Password protect backup
                  </Text>

                  <Text style={[styles.protectionText, { color: colors.text }]}>
                    Recommended. Protects contacts, notes, birthdays, reminders,
                    memories, and relationship history.
                  </Text>
                </View>

                <Switch
                  value={passwordProtected}
                  onValueChange={setPasswordProtected}
                  disabled={busy}
                  trackColor={{
                    false: withOpacity(colors.text, "24"),
                    true: colors.primary,
                  }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={withOpacity(colors.text, "24")}
                />
              </View>

              {passwordProtected ? (
                <View style={styles.passwordFields}>
                  <ThemedInput
                    value={exportPassword}
                    onChangeText={setExportPassword}
                    placeholder="Backup password"
                    secureTextEntry
                    colors={colors}
                  />

                  <ThemedInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm password"
                    secureTextEntry
                    colors={colors}
                  />

                  <WarningBox
                    colors={colors}
                    text="If you forget this password, the backup cannot be recovered."
                  />
                </View>
              ) : (
                <WarningBox
                  colors={colors}
                  text="Warning: a plain JSON backup can be read by anyone who gets the file."
                />
              )}

              <PrimaryButton
                title="Create backup"
                icon="download-outline"
                onPress={onExport}
                disabled={busy}
                colors={colors}
              />

              {lastBackup ? (
                <BackupReadyCard
                  backup={lastBackup}
                  busy={busy}
                  colors={colors}
                  onSave={onSaveBackupToPhone}
                  onShare={onShareLastBackup}
                />
              ) : null}
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
                icon="cloud-upload-outline"
                title="Import backup"
                colors={colors}
              />

              <Text style={[styles.sectionText, { color: colors.text }]}>
                Select a Birthdayly backup file. If the file is encrypted, enter
                the backup password first.
              </Text>

              <ThemedInput
                value={importPassword}
                onChangeText={setImportPassword}
                placeholder="Backup password if needed"
                secureTextEntry
                colors={colors}
              />

              <PrimaryButton
                title="Import backup"
                icon="cloud-upload-outline"
                onPress={chooseImportMode}
                disabled={busy}
                colors={colors}
              />
            </View>

            {busy || progress ? (
              <ProgressCard
                busy={busy}
                progress={progress}
                percent={percent}
                logs={logs}
                showLogs={showLogs}
                colors={colors}
                onToggleLogs={setShowLogs}
              />
            ) : null}
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
  colors: BackupColors;
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
          <Text style={styles.headerPillText}>Private</Text>
        </View>
      </View>

      <View style={styles.headerMainRow}>
        <View style={styles.headerIconBubble}>
          <Ionicons name="archive-outline" size={24} color="#FFFFFF" />
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerEyebrow}>BACKUP & RESTORE</Text>

          <Text style={styles.headerTitle} numberOfLines={1}>
            Backup
          </Text>

          <Text style={styles.headerSubtitle} numberOfLines={2}>
            Export, save, share, or restore your local-first data safely.
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
  colors: BackupColors;
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

function BackupReadyCard({
  backup,
  busy,
  colors,
  onSave,
  onShare,
}: {
  backup: ExportedBackup;
  busy: boolean;
  colors: BackupColors;
  onSave: () => void;
  onShare: () => void;
}) {
  return (
    <View
      style={[
        styles.readyBox,
        {
          backgroundColor: withOpacity(colors.success, "12"),
          borderColor: withOpacity(colors.success, "35"),
        },
      ]}
    >
      <View
        style={[
          styles.readyIcon,
          { backgroundColor: withOpacity(colors.success, "18") },
        ]}
      >
        <Ionicons
          name="checkmark-circle-outline"
          size={21}
          color={colors.success}
        />
      </View>

      <View style={styles.readyTextWrap}>
        <Text style={[styles.readyTitle, { color: colors.success }]}>
          Backup ready
        </Text>

        <Text style={[styles.readyText, { color: colors.text }]} numberOfLines={2}>
          {backup.filename}
        </Text>

        <Text style={[styles.readyText, { color: colors.text }]}>
          Size: {(backup.sizeBytes / 1024).toFixed(1)} KB ·{" "}
          {backup.passwordProtected ? "Protected" : "Not protected"}
        </Text>

        <View style={styles.readyActions}>
          <SmallButton
            title={Platform.OS === "android" ? "Save to phone" : "Save to Files"}
            icon="save-outline"
            onPress={onSave}
            disabled={busy}
            variant="primary"
            colors={colors}
          />

          <SmallButton
            title="Share"
            icon="share-outline"
            onPress={onShare}
            disabled={busy}
            variant="secondary"
            colors={colors}
          />
        </View>
      </View>
    </View>
  );
}

function ProgressCard({
  busy,
  progress,
  percent,
  logs,
  showLogs,
  colors,
  onToggleLogs,
}: {
  busy: boolean;
  progress: BackupProgress | null;
  percent: number;
  logs: string[];
  showLogs: boolean;
  colors: BackupColors;
  onToggleLogs: (value: boolean) => void;
}) {
  return (
    <View
      style={[
        styles.progressCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.progressHeader}>
        <View
          style={[
            styles.progressIcon,
            { backgroundColor: colors.softPrimary },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={colors.primary}
            />
          )}
        </View>

        <View style={styles.progressTextWrap}>
          <Text style={[styles.progressTitle, { color: colors.title }]}>
            {progress?.message ?? "Ready"}
          </Text>

          {progress?.detail ? (
            <Text
              style={[styles.progressDetail, { color: colors.text }]}
              numberOfLines={2}
            >
              {progress.detail}
            </Text>
          ) : null}
        </View>

        <Text style={[styles.progressPercent, { color: colors.primary }]}>
          {percent}%
        </Text>
      </View>

      <View
        style={[
          styles.progressTrack,
          { backgroundColor: colors.softCard },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${percent}%`,
              backgroundColor: colors.primary,
            },
          ]}
        />
      </View>

      <View
        style={[
          styles.logsToggleRow,
          { borderTopColor: colors.border },
        ]}
      >
        <View style={styles.logsToggleTextWrap}>
          <Text style={[styles.logsToggleTitle, { color: colors.title }]}>
            Technical logs
          </Text>

          <Text style={[styles.logsToggleSubtitle, { color: colors.text }]}>
            Useful when debugging backup or import problems.
          </Text>
        </View>

        <Switch
          value={showLogs}
          onValueChange={onToggleLogs}
          disabled={busy}
          trackColor={{
            false: withOpacity(colors.text, "24"),
            true: colors.primary,
          }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={withOpacity(colors.text, "24")}
        />
      </View>

      {showLogs && logs.length > 0 ? (
        <View
          style={[
            styles.logsBox,
            {
              backgroundColor: colors.softCard,
              borderColor: colors.border,
            },
          ]}
        >
          {logs.map((line, index) => (
            <Text
              key={`${line}-${index}`}
              style={[styles.logLine, { color: colors.text }]}
            >
              {line}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function WarningBox({
  colors,
  text,
}: {
  colors: BackupColors;
  text: string;
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
      <Ionicons name="warning-outline" size={17} color={colors.warning} />

      <Text style={[styles.warningText, { color: colors.warning }]}>
        {text}
      </Text>
    </View>
  );
}

function PrimaryButton({
  title,
  icon,
  onPress,
  disabled,
  colors,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  colors: BackupColors;
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
      <Ionicons name={icon} size={18} color={colors.buttonText} />

      <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function SmallButton({
  title,
  icon,
  onPress,
  disabled,
  variant,
  colors,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  variant: "primary" | "secondary";
  colors: BackupColors;
}) {
  const primary = variant === "primary";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.86}
      style={[
        styles.smallButton,
        {
          backgroundColor: primary ? colors.button : colors.card,
          borderColor: primary ? colors.button : colors.border,
        },
        disabled && styles.disabled,
      ]}
    >
      <Ionicons
        name={icon}
        size={15}
        color={primary ? colors.buttonText : colors.primary}
      />

      <Text
        style={[
          styles.smallButtonText,
          { color: primary ? colors.buttonText : colors.primary },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function ThemedInput({
  colors,
  style,
  ...props
}: TextInputProps & {
  colors: BackupColors;
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

function makeBackupColors(settings: any): BackupColors {
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

function clampPercent(value: number) {
  if (Number.isNaN(value)) return 0;

  return Math.max(0, Math.min(100, Math.round(value)));
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

  sectionText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    opacity: 0.76,
    marginBottom: 12,
  },

  protectionBox: {
    minHeight: 88,
    borderRadius: 22,
    borderWidth: 1,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 12,
  },

  protectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  protectionTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  protectionTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  protectionText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 3,
  },

  passwordFields: {
    gap: 10,
  },

  input: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "700",
  },

  warningBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 11,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  warningText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
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

  readyBox: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 13,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },

  readyIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  readyTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  readyTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  readyText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 2,
  },

  readyActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 11,
  },

  smallButton: {
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  smallButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },

  progressCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 15,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  progressIcon: {
    width: 42,
    height: 42,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  progressTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  progressTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  progressDetail: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
  },

  progressPercent: {
    fontSize: 14,
    fontWeight: "900",
  },

  progressTrack: {
    height: 9,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 14,
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
  },

  logsToggleRow: {
    marginTop: 14,
    paddingTop: 13,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  logsToggleTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  logsToggleTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  logsToggleSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
  },

  logsBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 11,
    marginTop: 12,
    gap: 5,
  },

  logLine: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    opacity: 0.76,
  },

  disabled: {
    opacity: 0.6,
  },
});