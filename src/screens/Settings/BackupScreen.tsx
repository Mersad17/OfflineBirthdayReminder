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
import { fetchContacts } from "../../contacts/repository";
import { AppId, Contact } from "../../contacts/types";
import {
  buildImportPlanForPickedBackup,
  exportBackupFile,
  ExportedBackupFile,
  importPickedBackupFile,
  pickBackupFileForPreview,
  PickedBackupForPreview,
  saveBackupToDevice,
  shareBackupFile,
} from "../../backup/backupFiles";
import { BackupProgress } from "../../backup/progress";
import {
  BackupExportScope,
  BackupImportPlan,
  BackupImportStrategy,
  BackupIncludeOptions,
  FULL_BACKUP_INCLUDE,
  SELECTED_CONTACTS_BACKUP_INCLUDE,
} from "../../backup/types";

type Props = NativeStackScreenProps<SettingsStackParamsList, "Backup">;

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

const SETTINGS_ONLY_INCLUDE: BackupIncludeOptions = {
  contacts: false,
  groups: false,
  tags: false,
  memories: false,
  events: false,
  reminders: false,
  interactions: false,
  customInfo: false,
  contactPhotos: false,
  albums: false,
  albumPhotos: false,
  relationships: false,
  appSettings: true,
};

const DATA_TYPE_ROWS: Array<{
  key: keyof BackupIncludeOptions;
  title: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    key: "contacts",
    title: "People profiles",
    text: "Names, birthdays, phone, email, descriptions, groups.",
    icon: "people-outline",
  },
  {
    key: "groups",
    title: "Groups",
    text: "Family, friends, work, and custom groups.",
    icon: "albums-outline",
  },
  {
    key: "tags",
    title: "Tags",
    text: "Tags and contact-tag links.",
    icon: "pricetags-outline",
  },
  {
    key: "memories",
    title: "Memories & notes",
    text: "Important notes, ask-next-time notes, pinned memories.",
    icon: "sparkles-outline",
  },
  {
    key: "events",
    title: "Events & birthdays",
    text: "Birthdays, meetings, important dates, check-ins.",
    icon: "calendar-outline",
  },
  {
    key: "reminders",
    title: "Reminders",
    text: "Local reminder data. Notifications are rescheduled after import.",
    icon: "notifications-outline",
  },
  {
    key: "interactions",
    title: "Interactions",
    text: "Calls, messages, meetings, and relationship history.",
    icon: "chatbubble-ellipses-outline",
  },
  {
    key: "customInfo",
    title: "Custom sections",
    text: "Custom fields like kids, work details, gift ideas.",
    icon: "construct-outline",
  },
  {
    key: "contactPhotos",
    title: "Profile photos",
    text: "Local contact profile photos.",
    icon: "image-outline",
  },
  {
    key: "albums",
    title: "Albums",
    text: "Contact albums and album structure.",
    icon: "images-outline",
  },
  {
    key: "albumPhotos",
    title: "Album photos",
    text: "Local photos stored inside contact albums.",
    icon: "camera-outline",
  },
  {
    key: "relationships",
    title: "Life Circle relationships",
    text: "Connections between selected people.",
    icon: "git-network-outline",
  },
  {
    key: "appSettings",
    title: "App settings",
    text: "Local preferences and app configuration.",
    icon: "settings-outline",
  },
];

export default function BackupScreen({ navigation }: Props) {
  const { settings } = useAppearance();
  const colors = useMemo(() => makeBackupColors(settings), [settings]);

  const [busy, setBusy] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [progress, setProgress] = useState<BackupProgress | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  const [localContacts, setLocalContacts] = useState<Contact[]>([]);
  const [lastBackup, setLastBackup] = useState<ExportedBackupFile | null>(null);

  const [passwordProtected, setPasswordProtected] = useState(true);
  const [exportPassword, setExportPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [exportScope, setExportScope] = useState<BackupExportScope>("full");
  const [exportInclude, setExportInclude] =
    useState<BackupIncludeOptions>(FULL_BACKUP_INCLUDE);
  const [selectedExportContactIds, setSelectedExportContactIds] = useState<
    AppId[]
  >([]);
  const [showExportDataTypes, setShowExportDataTypes] = useState(false);

  const [importPassword, setImportPassword] = useState("");
  const [pickedBackup, setPickedBackup] =
    useState<PickedBackupForPreview | null>(null);
  const [importInclude, setImportInclude] =
    useState<BackupIncludeOptions>(FULL_BACKUP_INCLUDE);
  const [selectedImportContactIds, setSelectedImportContactIds] = useState<
    AppId[]
  >([]);
  const [importStrategy, setImportStrategy] =
    useState<BackupImportStrategy>("safe_merge");
  const [importPlan, setImportPlan] = useState<BackupImportPlan | null>(null);
  const [showImportDataTypes, setShowImportDataTypes] = useState(false);

  const percent = clampPercent(progress?.percent ?? 0);
  const backupContacts = useMemo(
    () => getBackupContacts(pickedBackup),
    [pickedBackup]
  );

  useEffect(() => {
    navigation.setOptions?.({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    void loadLocalContacts();
  }, []);

  useEffect(() => {
    if (exportScope === "full") {
      setExportInclude(FULL_BACKUP_INCLUDE);
      return;
    }

    if (exportScope === "selected_contacts") {
      setExportInclude(SELECTED_CONTACTS_BACKUP_INCLUDE);
      return;
    }

    setExportInclude(SETTINGS_ONLY_INCLUDE);
  }, [exportScope]);

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

      return [line, ...prev].slice(0, 18);
    });
  }

  async function loadLocalContacts() {
    try {
      setContactsLoading(true);

      const all: Contact[] = [];
      let page = 1;

      for (let index = 0; index < 25; index++) {
        const response: any = await fetchContacts({
          page,
          search: undefined,
          group: null,
        });

        const results: Contact[] = Array.isArray(response)
          ? response
          : response.results ?? [];

        all.push(...results);

        if (Array.isArray(response) || !response.next) {
          break;
        }

        page += 1;
      }

      setLocalContacts(dedupeContacts(all));
    } catch (error) {
      console.log("Failed to load contacts for backup", error);
    } finally {
      setContactsLoading(false);
    }
  }

  function chooseExportScope(nextScope: BackupExportScope) {
    setExportScope(nextScope);
    setLastBackup(null);
  }

  function toggleExportContact(contactId: AppId) {
    setSelectedExportContactIds((prev) => toggleId(prev, contactId));
    setLastBackup(null);
  }

  function toggleImportContact(contactId: AppId) {
    setSelectedImportContactIds((prev) => toggleId(prev, contactId));
    setImportPlan(null);
  }

  function toggleExportInclude(key: keyof BackupIncludeOptions) {
    setExportInclude((prev) => normalizeIncludeDependencies({
      ...prev,
      [key]: !prev[key],
    }));
    setLastBackup(null);
  }

  function toggleImportInclude(key: keyof BackupIncludeOptions) {
    setImportInclude((prev) => normalizeIncludeDependencies({
      ...prev,
      [key]: !prev[key],
    }));
    setImportPlan(null);
  }

  function selectAllExportContacts() {
    setSelectedExportContactIds(localContacts.map((item) => item.id));
    setLastBackup(null);
  }

  function clearExportContacts() {
    setSelectedExportContactIds([]);
    setLastBackup(null);
  }

  function selectAllImportContacts() {
    setSelectedImportContactIds(backupContacts.map((item) => item.id));
    setImportPlan(null);
  }

  function clearImportContacts() {
    setSelectedImportContactIds([]);
    setImportPlan(null);
  }

  async function onExport() {
    if (exportScope === "selected_contacts" && selectedExportContactIds.length === 0) {
      Alert.alert("Selected backup", "Choose at least one person to export.");
      return;
    }

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
      "This backup may contain names, birthdays, notes, reminders, memories, photos, and relationship history. Anyone with this file can read it.",
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
          scope: exportScope,
          selectedContactIds:
            exportScope === "selected_contacts"
              ? selectedExportContactIds
              : undefined,
          include: exportInclude,
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

  async function onPickBackupForPreview() {
    try {
      setBusy(true);
      setPickedBackup(null);
      setImportPlan(null);
      resetProgress();

      const result = await pickBackupFileForPreview(
        {
          password: importPassword || undefined,
        },
        handleProgress
      );

      if (result.canceled) return;

      setPickedBackup(result.picked);

      const nextContacts = getBackupContacts(result.picked);
      setSelectedImportContactIds(nextContacts.map((item) => item.id));
      setImportInclude(
        includeFromBackupDataTypes(result.picked.preview.manifest.includedDataTypes)
      );

      Alert.alert("Backup preview ready", "Review the backup before importing.");
    } catch (error: any) {
      console.log("Pick backup preview error", error);
      Alert.alert(
        "Backup preview",
        error?.message ||
          "Could not open this backup. If it is encrypted, check the password."
      );
    } finally {
      setBusy(false);
    }
  }

  async function onBuildImportPlan() {
    if (!pickedBackup) {
      Alert.alert("Import backup", "Choose a backup file first.");
      return;
    }

    if (selectedImportContactIds.length === 0 && importInclude.contacts) {
      Alert.alert("Import backup", "Choose at least one person to import.");
      return;
    }

    try {
      setBusy(true);
      setImportPlan(null);
      resetProgress();

      const plan = await buildImportPlanForPickedBackup(
        {
          pickedBackup,
          options: {
            strategy: importStrategy,
            selectedContactIds: importInclude.contacts
              ? selectedImportContactIds
              : undefined,
            include: importInclude,
            password: importPassword || undefined,
          },
        },
        handleProgress
      );

      setImportPlan(plan);
    } catch (error: any) {
      console.log("Build import plan error", error);
      Alert.alert(
        "Analyze import",
        error?.message || "Could not analyze this backup."
      );
    } finally {
      setBusy(false);
    }
  }

  async function onImportPickedBackup() {
    if (!pickedBackup) {
      Alert.alert("Import backup", "Choose a backup file first.");
      return;
    }

    if (selectedImportContactIds.length === 0 && importInclude.contacts) {
      Alert.alert("Import backup", "Choose at least one person to import.");
      return;
    }

    if (importStrategy === "replace_all" || importStrategy === "replace_selected") {
      Alert.alert(
        importStrategy === "replace_all"
          ? "Replace all local data?"
          : "Replace selected people?",
        importStrategy === "replace_all"
          ? "This will delete your current local data and replace it with the backup. Create a separate backup first."
          : "This will delete matching selected local people and replace them with the backup version.",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Continue",
            style: "destructive",
            onPress: () => {
              void runImportPickedBackup();
            },
          },
        ]
      );

      return;
    }

    await runImportPickedBackup();
  }

  async function runImportPickedBackup() {
    if (!pickedBackup) return;

    try {
      setBusy(true);
      resetProgress();

      const plan =
        importPlan ??
        (await buildImportPlanForPickedBackup(
          {
            pickedBackup,
            options: {
              strategy: importStrategy,
              selectedContactIds: importInclude.contacts
                ? selectedImportContactIds
                : undefined,
              include: importInclude,
              password: importPassword || undefined,
            },
          },
          handleProgress
        ));

      const result = await importPickedBackupFile(
        {
          pickedBackup,
          options: plan,
        },
        handleProgress
      );

      const imported = result.imported.imported;
      const conflicts = result.imported.conflicts;
      const restoredPhotos = result.imported.restoredPhotos;
      const rescheduled = result.rescheduled;

      Alert.alert(
        "Import complete",
        [
          `Contacts: ${imported.contacts}`,
          `Events: ${imported.contactEvents}`,
          `Reminders: ${imported.reminders}`,
          `Memories: ${imported.contactMemories}`,
          `Interactions: ${imported.interactions}`,
          `Custom sections: ${imported.customInfoSections}`,
          `Albums: ${imported.contactAlbums}`,
          `Relationships: ${imported.contactRelationships}`,
          `Photos restored: ${restoredPhotos.restored}`,
          `Photo restore failed: ${restoredPhotos.failed}`,
          "",
          `Conflicts: ${conflicts.total}`,
          `Merged: ${conflicts.merged}`,
          `Updated: ${conflicts.updated}`,
          `Duplicated: ${conflicts.duplicated}`,
          `Kept local: ${conflicts.keptLocal}`,
          "",
          rescheduled.notificationsEnabled
            ? `Notifications scheduled: ${rescheduled.scheduled}`
            : "Notifications are disabled. Imported reminders were saved but not scheduled.",
          `Skipped reminders: ${rescheduled.skipped}`,
          `Failed reminders: ${rescheduled.failed}`,
        ].join("\n")
      );

      setImportPlan(null);
      setPickedBackup(null);
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
                icon="download-outline"
                title="Export backup"
                colors={colors}
              />

              <Text style={[styles.sectionText, { color: colors.text }]}>
                Create a full backup or choose specific people and data types.
              </Text>

              <ChoiceGrid>
                <ChoiceCard
                  icon="archive-outline"
                  title="Full"
                  text="Everything in the app."
                  selected={exportScope === "full"}
                  colors={colors}
                  onPress={() => chooseExportScope("full")}
                />

                <ChoiceCard
                  icon="people-outline"
                  title="Selected people"
                  text="Export only specific contacts."
                  selected={exportScope === "selected_contacts"}
                  colors={colors}
                  onPress={() => chooseExportScope("selected_contacts")}
                />

                <ChoiceCard
                  icon="settings-outline"
                  title="Settings"
                  text="Only app preferences."
                  selected={exportScope === "settings_only"}
                  colors={colors}
                  onPress={() => chooseExportScope("settings_only")}
                />
              </ChoiceGrid>

              {exportScope === "selected_contacts" ? (
                <ContactPickerCard
                  title="People to export"
                  contacts={localContacts}
                  selectedIds={selectedExportContactIds}
                  loading={contactsLoading}
                  colors={colors}
                  onToggle={toggleExportContact}
                  onSelectAll={selectAllExportContacts}
                  onClear={clearExportContacts}
                />
              ) : null}

              <ToggleOpenRow
                title="Data included"
                text={`${countEnabledInclude(exportInclude)} categories selected`}
                open={showExportDataTypes}
                colors={colors}
                onPress={() => setShowExportDataTypes((value) => !value)}
              />

              {showExportDataTypes ? (
                <DataTypeChecklist
                  include={exportInclude}
                  colors={colors}
                  disabledKeys={
                    exportScope === "settings_only" ? DATA_TYPE_ROWS
                        .filter((row) => row.key !== "appSettings")
                        .map((row) => row.key)
                      : []
                  }
                  onToggle={toggleExportInclude}
                />
              ) : null}

              <ProtectionBox
                passwordProtected={passwordProtected}
                busy={busy}
                colors={colors}
                onChange={setPasswordProtected}
              />

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
                First preview the backup. Then choose what to import and how to
                handle conflicts.
              </Text>

              <ThemedInput
                value={importPassword}
                onChangeText={(value) => {
                  setImportPassword(value);
                  setPickedBackup(null);
                  setImportPlan(null);
                }}
                placeholder="Backup password if needed"
                secureTextEntry
                colors={colors}
              />

              <PrimaryButton
                title="Choose backup file"
                icon="folder-open-outline"
                onPress={onPickBackupForPreview}
                disabled={busy}
                colors={colors}
              />

              {pickedBackup ? (
                <>
                  <BackupPreviewCard
                    pickedBackup={pickedBackup}
                    colors={colors}
                  />

                  {backupContacts.length > 0 ? (
                    <ContactPickerCard
                      title="People to import"
                      contacts={backupContacts as any}
                      selectedIds={selectedImportContactIds}
                      loading={false}
                      colors={colors}
                      onToggle={toggleImportContact}
                      onSelectAll={selectAllImportContacts}
                      onClear={clearImportContacts}
                    />
                  ) : null}

                  <ToggleOpenRow
                    title="Data to import"
                    text={`${countEnabledInclude(importInclude)} categories selected`}
                    open={showImportDataTypes}
                    colors={colors}
                    onPress={() => setShowImportDataTypes((value) => !value)}
                  />

                  {showImportDataTypes ? (
                    <DataTypeChecklist
                      include={importInclude}
                      colors={colors}
                      onToggle={toggleImportInclude}
                    />
                  ) : null}

                  <ImportStrategyCard
                    strategy={importStrategy}
                    colors={colors}
                    onChange={(next) => {
                      setImportStrategy(next);
                      setImportPlan(null);
                    }}
                  />

                  <SmallActionRow>
                    <SmallButton
                      title="Analyze conflicts"
                      icon="search-outline"
                      onPress={onBuildImportPlan}
                      disabled={busy}
                      variant="secondary"
                      colors={colors}
                    />

                    <SmallButton
                      title="Import"
                      icon="cloud-upload-outline"
                      onPress={onImportPickedBackup}
                      disabled={busy}
                      variant="primary"
                      colors={colors}
                    />
                  </SmallActionRow>

                  {importPlan ? (
                    <ConflictSummaryCard plan={importPlan} colors={colors} />
                  ) : null}
                </>
              ) : null}
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

/* components */

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
            Export selected people, preview backups, and restore safely.
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
      <View style={[styles.sectionIcon, { backgroundColor: colors.softPrimary }]}>
        <Ionicons name={icon} size={17} color={colors.primary} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.title }]}>{title}</Text>
    </View>
  );
}

function ChoiceGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.choiceGrid}>{children}</View>;
}

function ChoiceCard({
  icon,
  title,
  text,
  selected,
  colors,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  selected: boolean;
  colors: BackupColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.choiceCard,
        {
          backgroundColor: selected ? colors.softPrimary : colors.softCard,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <Ionicons
        name={selected ? "checkmark-circle" : icon}
        size={21}
        color={selected ? colors.primary : colors.text}
      />

      <Text style={[styles.choiceTitle, { color: colors.title }]}>{title}</Text>

      <Text style={[styles.choiceText, { color: colors.text }]}>{text}</Text>
    </TouchableOpacity>
  );
}

function ContactPickerCard({
  title,
  contacts,
  selectedIds,
  loading,
  colors,
  onToggle,
  onSelectAll,
  onClear,
}: {
  title: string;
  contacts: Contact[];
  selectedIds: AppId[];
  loading: boolean;
  colors: BackupColors;
  onToggle: (id: AppId) => void;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const selectedSet = new Set(selectedIds.map(String));

  return (
    <View
      style={[
        styles.pickerBox,
        {
          backgroundColor: colors.softCard,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.pickerTopRow}>
        <View>
          <Text style={[styles.pickerTitle, { color: colors.title }]}>
            {title}
          </Text>

          <Text style={[styles.pickerSubtitle, { color: colors.text }]}>
            {selectedIds.length}/{contacts.length} selected
          </Text>
        </View>

        <View style={styles.pickerActions}>
          <TouchableOpacity onPress={onSelectAll} disabled={loading}>
            <Text style={[styles.pickerActionText, { color: colors.primary }]}>
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClear} disabled={loading}>
            <Text style={[styles.pickerActionText, { color: colors.danger }]}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.inlineLoader}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.inlineLoaderText, { color: colors.text }]}>
            Loading people...
          </Text>
        </View>
      ) : contacts.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.text }]}>
          No people found.
        </Text>
      ) : (
        <View style={styles.contactList}>
          {contacts.slice(0, 60).map((item) => {
            const selected = selectedSet.has(String(item.id));

            return (
              <TouchableOpacity
                key={String(item.id)}
                style={[
                  styles.contactRow,
                  {
                    backgroundColor: selected
                      ? withOpacity(colors.primary, "12")
                      : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => onToggle(item.id)}
                activeOpacity={0.86}
              >
                <View
                  style={[
                    styles.contactCheck,
                    {
                      backgroundColor: selected
                        ? colors.primary
                        : colors.softCard,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  {selected ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : null}
                </View>

                <View style={styles.contactTextWrap}>
                  <Text
                    style={[styles.contactName, { color: colors.title }]}
                    numberOfLines={1}
                  >
                    {getContactName(item)}
                  </Text>

                  <Text
                    style={[styles.contactMeta, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {getContactMeta(item)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function ToggleOpenRow({
  title,
  text,
  open,
  colors,
  onPress,
}: {
  title: string;
  text: string;
  open: boolean;
  colors: BackupColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.toggleOpenRow,
        {
          backgroundColor: colors.softCard,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <View style={styles.toggleOpenTextWrap}>
        <Text style={[styles.toggleOpenTitle, { color: colors.title }]}>
          {title}
        </Text>

        <Text style={[styles.toggleOpenText, { color: colors.text }]}>
          {text}
        </Text>
      </View>

      <Ionicons
        name={open ? "chevron-up" : "chevron-down"}
        size={18}
        color={colors.text}
      />
    </TouchableOpacity>
  );
}

function DataTypeChecklist({
  include,
  disabledKeys = [],
  colors,
  onToggle,
}: {
  include: BackupIncludeOptions;
  disabledKeys?: Array<keyof BackupIncludeOptions>;
  colors: BackupColors;
  onToggle: (key: keyof BackupIncludeOptions) => void;
}) {
  const disabledSet = new Set(disabledKeys);

  return (
    <View style={styles.dataTypeList}>
      {DATA_TYPE_ROWS.map((row) => {
        const selected = include[row.key];
        const disabled = disabledSet.has(row.key);

        return (
          <TouchableOpacity
            key={row.key}
            style={[
              styles.dataTypeRow,
              {
                backgroundColor: selected
                  ? withOpacity(colors.primary, "10")
                  : colors.card,
                borderColor: selected ? colors.primary : colors.border,
                opacity: disabled ? 0.5 : 1,
              },
            ]}
            disabled={disabled}
            onPress={() => onToggle(row.key)}
            activeOpacity={0.86}
          >
            <View
              style={[
                styles.dataTypeIcon,
                {
                  backgroundColor: selected
                    ? colors.softPrimary
                    : colors.softCard,
                },
              ]}
            >
              <Ionicons
                name={row.icon}
                size={17}
                color={selected ? colors.primary : colors.text}
              />
            </View>

            <View style={styles.dataTypeTextWrap}>
              <Text style={[styles.dataTypeTitle, { color: colors.title }]}>
                {row.title}
              </Text>

              <Text style={[styles.dataTypeText, { color: colors.text }]}>
                {row.text}
              </Text>
            </View>

            <Ionicons
              name={selected ? "checkmark-circle" : "ellipse-outline"}
              size={21}
              color={selected ? colors.primary : colors.muted}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ProtectionBox({
  passwordProtected,
  busy,
  colors,
  onChange,
}: {
  passwordProtected: boolean;
  busy: boolean;
  colors: BackupColors;
  onChange: (value: boolean) => void;
}) {
  return (
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
          name={passwordProtected ? "shield-checkmark-outline" : "warning-outline"}
          size={20}
          color={passwordProtected ? colors.success : colors.warning}
        />
      </View>

      <View style={styles.protectionTextWrap}>
        <Text style={[styles.protectionTitle, { color: colors.title }]}>
          Password protect backup
        </Text>

        <Text style={[styles.protectionText, { color: colors.text }]}>
          Recommended for private local-first data.
        </Text>
      </View>

      <Switch
        value={passwordProtected}
        onValueChange={onChange}
        disabled={busy}
        trackColor={{
          false: withOpacity(colors.text, "24"),
          true: colors.primary,
        }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={withOpacity(colors.text, "24")}
      />
    </View>
  );
}

function BackupPreviewCard({
  pickedBackup,
  colors,
}: {
  pickedBackup: PickedBackupForPreview;
  colors: BackupColors;
}) {
  const counts = pickedBackup.preview.manifest.counts;

  return (
    <View
      style={[
        styles.previewBox,
        {
          backgroundColor: withOpacity(colors.success, "10"),
          borderColor: withOpacity(colors.success, "32"),
        },
      ]}
    >
      <View style={styles.previewTopRow}>
        <View
          style={[
            styles.readyIcon,
            { backgroundColor: withOpacity(colors.success, "18") },
          ]}
        >
          <Ionicons name="document-text-outline" size={21} color={colors.success} />
        </View>

        <View style={styles.readyTextWrap}>
          <Text style={[styles.readyTitle, { color: colors.success }]}>
            Backup preview
          </Text>

          <Text style={[styles.readyText, { color: colors.text }]} numberOfLines={2}>
            {pickedBackup.filename}
          </Text>

          <Text style={[styles.readyText, { color: colors.text }]}>
            {pickedBackup.encrypted ? "Encrypted" : "Plain JSON"} ·{" "}
            {(pickedBackup.sizeBytes / 1024).toFixed(1)} KB
          </Text>
        </View>
      </View>

      <View style={styles.previewCountsGrid}>
        <CountPill label="People" value={counts.contacts} colors={colors} />
        <CountPill label="Events" value={counts.contactEvents} colors={colors} />
        <CountPill label="Reminders" value={counts.reminders} colors={colors} />
        <CountPill label="Memories" value={counts.contactMemories} colors={colors} />
        <CountPill label="Albums" value={counts.contactAlbums} colors={colors} />
        <CountPill label="Photos" value={counts.contactPhotos + counts.albumPhotos} colors={colors} />
      </View>
    </View>
  );
}

function CountPill({
  label,
  value,
  colors,
}: {
  label: string;
  value: number;
  colors: BackupColors;
}) {
  return (
    <View style={[styles.countPill, { backgroundColor: colors.card }]}>
      <Text style={[styles.countValue, { color: colors.title }]}>
        {value}
      </Text>

      <Text style={[styles.countLabel, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

function ImportStrategyCard({
  strategy,
  colors,
  onChange,
}: {
  strategy: BackupImportStrategy;
  colors: BackupColors;
  onChange: (strategy: BackupImportStrategy) => void;
}) {
  return (
    <View style={styles.strategyList}>
      <ImportStrategyOption
        value="safe_merge"
        current={strategy}
        title="Safe merge"
        text="Recommended. Adds missing data and avoids deleting anything."
        colors={colors}
        onChange={onChange}
      />

      <ImportStrategyOption
        value="update_existing"
        current={strategy}
        title="Update existing"
        text="Updates matching people with backup values."
        colors={colors}
        onChange={onChange}
      />

      <ImportStrategyOption
        value="duplicate_conflicts"
        current={strategy}
        title="Duplicate conflicts"
        text="Creates a new copy when a matching person exists."
        colors={colors}
        onChange={onChange}
      />

      <ImportStrategyOption
        value="replace_selected"
        current={strategy}
        title="Replace selected"
        text="Deletes matching selected people and restores backup version."
        danger
        colors={colors}
        onChange={onChange}
      />

      <ImportStrategyOption
        value="replace_all"
        current={strategy}
        title="Replace everything"
        text="Dangerous. Deletes all local data and restores the backup."
        danger
        colors={colors}
        onChange={onChange}
      />
    </View>
  );
}

function ImportStrategyOption({
  value,
  current,
  title,
  text,
  danger,
  colors,
  onChange,
}: {
  value: BackupImportStrategy;
  current: BackupImportStrategy;
  title: string;
  text: string;
  danger?: boolean;
  colors: BackupColors;
  onChange: (strategy: BackupImportStrategy) => void;
}) {
  const selected = value === current;
  const activeColor = danger ? colors.danger : colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.strategyRow,
        {
          backgroundColor: selected
            ? withOpacity(activeColor, "10")
            : colors.softCard,
          borderColor: selected ? activeColor : colors.border,
        },
      ]}
      onPress={() => onChange(value)}
      activeOpacity={0.86}
    >
      <Ionicons
        name={selected ? "radio-button-on" : "radio-button-off"}
        size={20}
        color={selected ? activeColor : colors.muted}
      />

      <View style={styles.strategyTextWrap}>
        <Text style={[styles.strategyTitle, { color: colors.title }]}>
          {title}
        </Text>

        <Text style={[styles.strategyText, { color: colors.text }]}>
          {text}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ConflictSummaryCard({
  plan,
  colors,
}: {
  plan: BackupImportPlan;
  colors: BackupColors;
}) {
  const conflicts = plan.conflicts;
  const matched = conflicts.filter((item) => item.matchType !== "none").length;
  const newPeople = conflicts.filter((item) => item.matchType === "none").length;

  const byDecision = conflicts.reduce<Record<string, number>>((acc, item) => {
    acc[item.decision] = (acc[item.decision] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <View
      style={[
        styles.conflictBox,
        {
          backgroundColor: colors.softCard,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.conflictTitle, { color: colors.title }]}>
        Import analysis
      </Text>

      <Text style={[styles.conflictText, { color: colors.text }]}>
        {matched} existing people matched · {newPeople} new people
      </Text>

      <View style={styles.conflictGrid}>
        <CountPill label="Merge" value={byDecision.merge_missing ?? 0} colors={colors} />
        <CountPill label="Update" value={byDecision.update_from_backup ?? 0} colors={colors} />
        <CountPill label="Duplicate" value={byDecision.duplicate ?? 0} colors={colors} />
        <CountPill label="New" value={byDecision.create_new ?? 0} colors={colors} />
      </View>
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
  backup: ExportedBackupFile;
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
        <View style={[styles.progressIcon, { backgroundColor: colors.softPrimary }]}>
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

      <View style={[styles.progressTrack, { backgroundColor: colors.softCard }]}>
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

      <View style={[styles.logsToggleRow, { borderTopColor: colors.border }]}>
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

function WarningBox({ colors, text }: { colors: BackupColors; text: string }) {
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

function SmallActionRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.smallActionRow}>{children}</View>;
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
    background: settings.backgroundColor ?? "#F8F4FF",
    card: settings.cardColor ?? "#FFFFFF",
    title: settings.titleColor ?? "#10162F",
    text: settings.textColor ?? "#5F6680",
    primary: settings.primaryColor ?? "#6651E5",
    button: settings.buttonColor || settings.primaryColor || "#6651E5",
    buttonText: settings.buttonTextColor ?? "#FFFFFF",
    border: withOpacity(settings.textColor ?? "#10162F", "16"),
    muted: withOpacity(settings.textColor ?? "#10162F", "88"),
    softCard: withOpacity(settings.textColor ?? "#10162F", "08"),
    softPrimary: withOpacity(settings.primaryColor ?? "#6651E5", "16"),
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

function toggleId<T extends string>(list: T[], id: T) {
  const exists = list.some((item) => String(item) === String(id));

  if (exists) {
    return list.filter((item) => String(item) !== String(id));
  }

  return [...list, id];
}

function dedupeContacts(contacts: Contact[]) {
  const map = new Map<string, Contact>();

  contacts.forEach((item) => {
    if (item?.id) {
      map.set(String(item.id), item);
    }
  });

  return Array.from(map.values());
}

function getContactName(contact: any) {
  const firstName = contact.firstName ?? contact.first_name ?? "";
  const lastName = contact.lastName ?? contact.last_name ?? "";

  return `${firstName} ${lastName}`.trim() || "Unnamed person";
}

function getContactMeta(contact: any) {
  const birthday = contact.birthday;
  const email = contact.email;
  const phone = contact.phone;

  if (birthday) return `Birthday: ${birthday}`;
  if (email) return email;
  if (phone) return phone;

  return "No extra info";
}

function getBackupContacts(pickedBackup: PickedBackupForPreview | null) {
  if (!pickedBackup) return [];

  return (pickedBackup.plainBackup.data.contacts ?? []).map((row: any) => ({
    ...row,
    id: String(row.id) as AppId,
  }));
}

function countEnabledInclude(include: BackupIncludeOptions) {
  return Object.values(include).filter(Boolean).length;
}

function normalizeIncludeDependencies(include: BackupIncludeOptions) {
  const next = { ...include };

  const needsContacts =
    next.groups ||
    next.tags ||
    next.memories ||
    next.events ||
    next.reminders ||
    next.interactions ||
    next.customInfo ||
    next.contactPhotos ||
    next.albums ||
    next.albumPhotos ||
    next.relationships;

  if (needsContacts) {
    next.contacts = true;
  }

  if (next.reminders) {
    next.events = true;
  }

  if (next.albumPhotos) {
    next.albums = true;
  }

  if (next.contactPhotos || next.albumPhotos) {
    next.contacts = true;
  }

  return next;
}

function includeFromBackupDataTypes(types: string[]): BackupIncludeOptions {
  return {
    contacts: types.includes("contacts"),
    groups: types.includes("groups"),
    tags: types.includes("tags"),
    memories: types.includes("memories"),
    events: types.includes("events"),
    reminders: types.includes("reminders"),
    interactions: types.includes("interactions"),
    customInfo: types.includes("custom_info"),
    contactPhotos: types.includes("contact_photos"),
    albums: types.includes("albums"),
    albumPhotos: types.includes("album_photos"),
    relationships: types.includes("relationships"),
    appSettings: types.includes("app_settings"),
  };
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
    minHeight: 158,
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

  choiceGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },

  choiceCard: {
    flex: 1,
    minHeight: 104,
    borderRadius: 22,
    borderWidth: 1,
    padding: 11,
  },

  choiceTitle: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 9,
  },

  choiceText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 4,
  },

  pickerBox: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },

  pickerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 10,
  },

  pickerTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  pickerSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
  },

  pickerActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  pickerActionText: {
    fontSize: 12,
    fontWeight: "900",
  },

  inlineLoader: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  inlineLoaderText: {
    fontSize: 12,
    fontWeight: "800",
  },

  contactList: {
    gap: 7,
  },

  contactRow: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  contactCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  contactTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  contactName: {
    fontSize: 13,
    fontWeight: "900",
  },

  contactMeta: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
  },

  toggleOpenRow: {
    minHeight: 58,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  toggleOpenTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  toggleOpenTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  toggleOpenText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
  },

  dataTypeList: {
    gap: 8,
    marginBottom: 12,
  },

  dataTypeRow: {
    minHeight: 70,
    borderRadius: 20,
    borderWidth: 1,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  dataTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  dataTypeTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  dataTypeTitle: {
    fontSize: 13,
    fontWeight: "900",
  },

  dataTypeText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
  },

  protectionBox: {
    minHeight: 78,
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
    marginBottom: 10,
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

  smallActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },

  smallButton: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  smallButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },

  previewBox: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 13,
    marginTop: 14,
    gap: 12,
  },

  previewTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
  },

  previewCountsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  countPill: {
    minWidth: 82,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  countValue: {
    fontSize: 15,
    fontWeight: "900",
  },

  countLabel: {
    fontSize: 10,
    fontWeight: "800",
    opacity: 0.72,
    marginTop: 2,
  },

  strategyList: {
    gap: 8,
    marginTop: 12,
  },

  strategyRow: {
    minHeight: 68,
    borderRadius: 20,
    borderWidth: 1,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  strategyTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  strategyTitle: {
    fontSize: 13,
    fontWeight: "900",
  },

  strategyText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
  },

  conflictBox: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 13,
    marginTop: 12,
  },

  conflictTitle: {
    fontSize: 15,
    fontWeight: "900",
  },

  conflictText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 3,
  },

  conflictGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
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

  emptyText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.72,
  },

  disabled: {
    opacity: 0.6,
  },
});