import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Switch,
  Platform,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

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

export default function BackupScreen({ navigation }: Props) {
  const { settings } = useAppearance();

  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState<BackupProgress | null>(null);
  const [logs, setLogs] = React.useState<string[]>([]);
  const [lastBackup, setLastBackup] = React.useState<ExportedBackup | null>(
    null
  );
const [showLogs, setShowLogs] = React.useState(false);
  const [passwordProtected, setPasswordProtected] = React.useState(true);
  const [exportPassword, setExportPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const [importPassword, setImportPassword] = React.useState("");

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
        { text: "Cancel", style: "cancel" },
        {
          text: "Export without password",
          style: "destructive",
          onPress: runExport,
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
      { text: "Cancel", style: "cancel" },
      {
        text: "Merge",
        onPress: () => onImport("merge"),
      },
      {
        text: "Replace all data",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Replace all local data?",
            "This will delete your current local data and replace it with the backup. Make sure you have another backup first.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Replace",
                style: "destructive",
                onPress: () => onImport("replace"),
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

  const percent = progress?.percent ?? 0;

  return (
    <Screen scroll>
      <View style={styles.container}>
        <Text style={[styles.title, { color: settings.titleColor }]}>
          Backup & restore
        </Text>

        <Text style={[styles.subtitle, { color: settings.textColor }]}>
          Export your local data to a backup file. Password protection is recommended.
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: settings.cardColor,
              borderColor: settings.textColor + "15",
            },
          ]}
        >
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: settings.titleColor }]}>
                Password protect backup
              </Text>

              <Text style={[styles.cardSubtitle, { color: settings.textColor }]}>
                Recommended. Protects your contacts, notes, birthdays, reminders, and memories.
              </Text>
            </View>

            <Switch
              value={passwordProtected}
              onValueChange={setPasswordProtected}
              disabled={busy}
              trackColor={{ false: "#D1D5DB", true: settings.buttonColor }}
              thumbColor="#FFFFFF"
            />
          </View>

          {passwordProtected ? (
            <>
              <TextInput
                value={exportPassword}
                onChangeText={setExportPassword}
                placeholder="Backup password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                style={[
                  styles.input,
                  {
                    color: settings.textColor,
                    borderColor: settings.textColor + "20",
                  },
                ]}
              />

              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                style={[
                  styles.input,
                  {
                    color: settings.textColor,
                    borderColor: settings.textColor + "20",
                  },
                ]}
              />

              <Text style={styles.warningText}>
                If you forget this password, the backup cannot be recovered.
              </Text>
            </>
          ) : (
            <Text style={styles.warningText}>
              Warning: a plain JSON backup can be read by anyone who gets the file.
            </Text>
          )}

          <PrimaryButton
            title="Create backup"
            onPress={onExport}
            disabled={busy}
            settings={settings}
          />

          {lastBackup ? (
            <View style={styles.savedBox}>
              <Text style={[styles.savedTitle, { color: settings.titleColor }]}>
                Backup ready
              </Text>

              <Text style={[styles.savedText, { color: settings.textColor }]}>
                {lastBackup.filename}
              </Text>

              <Text style={[styles.savedText, { color: settings.textColor }]}>
                Size: {(lastBackup.sizeBytes / 1024).toFixed(1)} KB
              </Text>

              <View style={styles.buttonRow}>
                <PrimaryButton
                  title={
                    Platform.OS === "android"
                      ? "Save to phone"
                      : "Save to Files"
                  }
                  onPress={onSaveBackupToPhone}
                  disabled={busy}
                  settings={settings}
                />

                <SecondaryButton
                  title="Share"
                  onPress={onShareLastBackup}
                  disabled={busy}
                  settings={settings}
                />
              </View>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: settings.cardColor,
              borderColor: settings.textColor + "15",
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: settings.titleColor }]}>
            Import backup
          </Text>

          <Text style={[styles.cardSubtitle, { color: settings.textColor }]}>
            Select a Birthdayly backup file. If the file is encrypted, enter the backup password first.
          </Text>

          <TextInput
            value={importPassword}
            onChangeText={setImportPassword}
            placeholder="Backup password if needed"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            style={[
              styles.input,
              {
                color: settings.textColor,
                borderColor: settings.textColor + "20",
              },
            ]}
          />

          <PrimaryButton
            title="Import backup"
            onPress={chooseImportMode}
            disabled={busy}
            settings={settings}
          />
        </View>

        {busy || progress ? (
          <View
            style={[
              styles.progressCard,
              {
                backgroundColor: settings.cardColor,
                borderColor: settings.textColor + "15",
              },
            ]}
          >
            <View style={styles.progressHeader}>
              {busy ? <ActivityIndicator color={settings.primaryColor} /> : null}

              <Text style={[styles.progressTitle, { color: settings.titleColor }]}>
                {progress?.message ?? "Ready"}
              </Text>

              <Text style={[styles.progressPercent, { color: settings.textColor }]}>
                {percent}%
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${percent}%`,
                    backgroundColor: settings.primaryColor,
                  },
                ]}
              />
            </View>

            {progress?.detail ? (
              <Text style={[styles.progressDetail, { color: settings.textColor }]}>
                {progress.detail}
              </Text>
            ) : null}
<View style={styles.logsToggleRow}>
  <Text style={[styles.logsToggleText, { color: settings.textColor }]}>
    Show technical logs
  </Text>

  <Switch
    value={showLogs}
    onValueChange={setShowLogs}
    disabled={busy}
    trackColor={{ false: "#D1D5DB", true: settings.buttonColor }}
    thumbColor="#FFFFFF"
  />
</View>
            {showLogs && logs.length > 0 ? (
  <View style={styles.logsBox}>
    {logs.map((line, index) => (
      <Text
        key={`${line}-${index}`}
        style={[styles.logLine, { color: settings.textColor }]}
      >
        {line}
      </Text>
    ))}
  </View>
) : null}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function PrimaryButton({
  title,
  onPress,
  disabled,
  settings,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  settings: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        { backgroundColor: settings.buttonColor },
        disabled && { opacity: 0.6 },
      ]}
    >
      <Text style={[styles.buttonText, { color: settings.buttonTextColor }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function SecondaryButton({
  title,
  onPress,
  disabled,
  settings,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  settings: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.secondaryButton,
        {
          borderColor: settings.buttonColor,
          backgroundColor: "transparent",
        },
        disabled && { opacity: 0.6 },
      ]}
    >
      <Text style={[styles.secondaryButtonText, { color: settings.buttonColor }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  warningText: {
    color: "#B45309",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  button: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  buttonText: {
    fontWeight: "800",
  },
  secondaryButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontWeight: "800",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 8,
  },
  savedBox: {
    marginTop: 8,
    gap: 6,
  },
  savedTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  savedText: {
    fontSize: 12,
    opacity: 0.75,
  },
  progressCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: "800",
    opacity: 0.8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressDetail: {
    fontSize: 12,
    opacity: 0.7,
  },
  logsBox: {
    marginTop: 4,
    gap: 4,
  },
  logLine: {
    fontSize: 11,
    opacity: 0.7,
  },
  logsToggleRow: {
  marginTop: 4,
  paddingTop: 8,
  borderTopWidth: 1,
  borderTopColor: "#E5E7EB",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
},
logsToggleText: {
  fontSize: 13,
  fontWeight: "700",
  opacity: 0.8,
},
});