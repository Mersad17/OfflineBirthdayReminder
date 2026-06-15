import { File, Directory, Paths } from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import Constants from "expo-constants";
import { Platform } from "react-native";

import {
  ENCRYPTED_BACKUP_FORMAT,
  FULL_BACKUP_INCLUDE,
  PLAIN_BACKUP_FORMAT,
  BackupExportOptions,
  BackupImportOptions,
  BackupImportPlan,
  BackupImportResult,
  BackupPreview,
  LegacyBackupMode,
  PlainBackupV2,
} from "./types";
import {
  buildBackupPreview,
  buildImportPlan,
  buildPlainBackup,
  importPlainBackupToDatabase,
  validatePlainBackup,
} from "./backupRepository";
import { decryptBackupJson, encryptBackupJson } from "./backupCrypto";
import { rescheduleActiveImportedReminders } from "./rescheduleImportedReminders";
import { BackupProgressCallback, clampPercent } from "./progress";

type ExportBackupFileOptions = {
  passwordProtected: boolean;
  password?: string;
} & Partial<Omit<BackupExportOptions, "passwordProtected" | "password">>;

export type ExportedBackupFile = {
  uri: string;
  filename: string;
  sizeBytes: number;
  passwordProtected: boolean;
  preview: BackupPreview;
};

export type PickedBackupForPreview = {
  uri: string;
  filename: string;
  sizeBytes: number;
  encrypted: boolean;
  plainBackup: PlainBackupV2;
  preview: BackupPreview;
};

export type PickBackupPreviewResult =
  | {
      canceled: true;
      picked: null;
    }
  | {
      canceled: false;
      picked: PickedBackupForPreview;
    };

export type ImportPickedBackupResult = {
  imported: BackupImportResult;
  rescheduled: Awaited<ReturnType<typeof rescheduleActiveImportedReminders>>;
};

function safeDateForFilename() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function report(
  onProgress: BackupProgressCallback | undefined,
  percent: number,
  message: string,
  detail?: string
) {
  const safePercent = clampPercent(percent);

  console.log(`[Backup] ${safePercent}% ${message}`, detail ?? "");

  onProgress?.({
    percent: safePercent,
    message,
    detail,
  });
}

function waitForUi() {
  return new Promise((resolve) => setTimeout(resolve, 30));
}

function getTextSizeBytes(text: string) {
  try {
    return new TextEncoder().encode(text).length;
  } catch {
    return text.length;
  }
}

function getFilenameFromUri(uri: string) {
  const clean = uri.split("?")[0];
  const parts = clean.split("/");

  return parts[parts.length - 1] || `birthdayly-backup-${safeDateForFilename()}`;
}

function normalizeExportOptions(
  options: ExportBackupFileOptions
): BackupExportOptions {
  return {
    passwordProtected: options.passwordProtected,
    password: options.password,
    scope: options.scope ?? "full",
    selectedContactIds: options.selectedContactIds,
    include: options.include ?? FULL_BACKUP_INCLUDE,
  };
}

function normalizeLegacyImportOptions(args: {
  mode: LegacyBackupMode;
  password?: string;
}): BackupImportOptions {
  return {
    strategy: args.mode === "replace" ? "replace_all" : "safe_merge",
    include: FULL_BACKUP_INCLUDE,
    password: args.password,
  };
}

async function ensureBackupsDirectory() {
  const dir = new Directory(Paths.document, "birthdayly-backups");

  if (!dir.exists) {
    dir.create({
      intermediates: true,
    });
  }

  return dir;
}

async function writeBackupFile(args: {
  filename: string;
  content: string;
}) {
  const dir = await ensureBackupsDirectory();
  const file = new File(dir, args.filename);

  if (file.exists) {
    file.delete();
  }

  file.create();
  file.write(args.content);

  return file;
}

async function readTextFromUri(uri: string) {
  try {
    const file = new File(uri);
    return await file.text();
  } catch {
    return FileSystemLegacy.readAsStringAsync(uri, {
      encoding: FileSystemLegacy.EncodingType.UTF8,
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Share / save                                                                 */
/* -------------------------------------------------------------------------- */

export async function shareBackupFile(uri: string) {
  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(uri, {
    mimeType: "application/json",
    dialogTitle: "Save or share Birthdayly backup",
    UTI: "public.json",
  });

  return true;
}

export async function saveBackupToDevice(
  args: {
    sourceUri: string;
    filename: string;
    mimeType?: string;
  },
  onProgress?: BackupProgressCallback
) {
  report(onProgress, 5, "Preparing save...");

  if (Platform.OS === "android") {
    report(onProgress, 20, "Choose a folder to save your backup...");

    const permissions =
      await FileSystemLegacy.StorageAccessFramework.requestDirectoryPermissionsAsync();

    if (!permissions.granted) {
      throw new Error("Folder permission was not granted.");
    }

    report(onProgress, 45, "Reading backup file...");

    const content = await FileSystemLegacy.readAsStringAsync(args.sourceUri, {
      encoding: FileSystemLegacy.EncodingType.UTF8,
    });

    report(onProgress, 70, "Creating file in selected folder...");

    const destinationUri =
      await FileSystemLegacy.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        args.filename,
        args.mimeType ?? "application/json"
      );

    report(onProgress, 90, "Writing backup to selected folder...");

    await FileSystemLegacy.writeAsStringAsync(destinationUri, content, {
      encoding: FileSystemLegacy.EncodingType.UTF8,
    });

    report(onProgress, 100, "Backup saved to phone.", destinationUri);

    return {
      uri: destinationUri,
      savedToDevice: true,
    };
  }

  report(onProgress, 60, "Opening Save to Files sheet...");

  await shareBackupFile(args.sourceUri);

  report(onProgress, 100, "Save sheet opened.");

  return {
    uri: args.sourceUri,
    savedToDevice: true,
  };
}

/* -------------------------------------------------------------------------- */
/* Export                                                                       */
/* -------------------------------------------------------------------------- */

export async function exportBackupFile(
  options: ExportBackupFileOptions,
  onProgress?: BackupProgressCallback
): Promise<ExportedBackupFile> {
  const safeOptions = normalizeExportOptions(options);

  report(onProgress, 3, "Starting backup...");
  await waitForUi();

  report(onProgress, 10, "Reading local database...");
  await waitForUi();

  const plainBackup = await buildPlainBackup(safeOptions, (progress) => {
    report(
      onProgress,
      10 + progress.percent * 0.55,
      progress.message,
      progress.detail
    );
  });

  plainBackup.manifest.app.appVersion =
    Constants.expoConfig?.version ??
    Constants.nativeApplicationVersion ??
    "unknown";

  plainBackup.manifest.app.platform = Platform.OS;

  report(
    onProgress,
    68,
    "Preparing backup JSON...",
    `${plainBackup.manifest.counts.contacts} contacts, ${plainBackup.manifest.counts.contactEvents} events`
  );

  await waitForUi();

  const plainJson = JSON.stringify(plainBackup, null, 2);
  const date = safeDateForFilename();

  const suffix =
    safeOptions.scope === "selected_contacts"
      ? "selected"
      : safeOptions.scope === "settings_only"
      ? "settings"
      : "full";

  let filename: string;
  let content: string;

  if (safeOptions.passwordProtected) {
    report(onProgress, 78, "Encrypting backup...");
    await waitForUi();

    const encrypted = await encryptBackupJson(
      plainJson,
      safeOptions.password,
      (cryptoProgress) => {
        report(
          onProgress,
          78 + cryptoProgress.percent * 0.12,
          cryptoProgress.message,
          cryptoProgress.detail
        );
      }
    );

    filename = `birthdayly-backup-${suffix}-${date}.birthdaylybackup`;
    content = JSON.stringify(encrypted, null, 2);
  } else {
    filename = `birthdayly-backup-${suffix}-${date}.json`;
    content = plainJson;
  }

  report(onProgress, 93, "Writing backup file...");
  await waitForUi();

  const file = await writeBackupFile({
    filename,
    content,
  });

  const preview = buildBackupPreview(plainBackup, filename);

  report(onProgress, 100, "Backup file ready.", file.uri);

  return {
    uri: file.uri,
    filename,
    sizeBytes: getTextSizeBytes(content),
    passwordProtected: safeOptions.passwordProtected,
    preview: {
      ...preview,
      encrypted: safeOptions.passwordProtected,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Pick / decrypt / preview                                                     */
/* -------------------------------------------------------------------------- */

async function readPickedJsonFile(onProgress?: BackupProgressCallback) {
  report(onProgress, 3, "Opening file picker...");

  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "application/octet-stream", "*/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) {
    return {
      canceled: true as const,
      parsed: null,
      rawText: "",
      filename: "",
      uri: "",
      sizeBytes: 0,
    };
  }

  const asset = result.assets[0];

  if (!asset?.uri) {
    throw new Error("No file selected.");
  }

  const filename = asset.name || getFilenameFromUri(asset.uri);

  report(onProgress, 15, "Reading backup file...", filename);

  const rawText = await readTextFromUri(asset.uri);

  try {
    report(onProgress, 25, "Parsing backup file...");

    return {
      canceled: false as const,
      parsed: JSON.parse(rawText),
      rawText,
      filename,
      uri: asset.uri,
      sizeBytes: asset.size ?? getTextSizeBytes(rawText),
    };
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }
}

async function parsePickedBackupToPlainBackup(args: {
  parsed: any;
  password?: string;
  filename?: string;
  onProgress?: BackupProgressCallback;
}) {
  const parsed = args.parsed;
  const encrypted = parsed?.format === ENCRYPTED_BACKUP_FORMAT;

  if (encrypted) {
    if (!args.password) {
      throw new Error("This backup is encrypted. Enter the backup password.");
    }

    report(args.onProgress, 35, "Decrypting backup...");

    const decryptedJson = await decryptBackupJson(
      parsed,
      args.password,
      (decryptProgress) => {
        report(
          args.onProgress,
          35 + decryptProgress.percent * 0.15,
          decryptProgress.message,
          decryptProgress.detail
        );
      }
    );

    try {
      report(args.onProgress, 52, "Reading decrypted backup...");

      const decryptedParsed = JSON.parse(decryptedJson);
      const plainBackup = validatePlainBackup(decryptedParsed);
      const preview = buildBackupPreview(plainBackup, args.filename);

      return {
        encrypted: true,
        plainBackup,
        preview: {
          ...preview,
          encrypted: true,
        },
      };
    } catch {
      throw new Error("The decrypted backup data is not valid.");
    }
  }

  if (parsed?.format === PLAIN_BACKUP_FORMAT) {
    report(args.onProgress, 45, "Plain backup detected.");

    const plainBackup = validatePlainBackup(parsed);
    const preview = buildBackupPreview(plainBackup, args.filename);

    return {
      encrypted: false,
      plainBackup,
      preview: {
        ...preview,
        encrypted: false,
      },
    };
  }

  throw new Error("Unknown backup format.");
}

export async function pickBackupFileForPreview(
  args: {
    password?: string;
  } = {},
  onProgress?: BackupProgressCallback
): Promise<PickBackupPreviewResult> {
  const picked = await readPickedJsonFile(onProgress);

  if (picked.canceled) {
    return {
      canceled: true,
      picked: null,
    };
  }

  const parsed = await parsePickedBackupToPlainBackup({
    parsed: picked.parsed,
    password: args.password,
    filename: picked.filename,
    onProgress,
  });

  report(onProgress, 100, "Backup preview ready.");

  return {
    canceled: false,
    picked: {
      uri: picked.uri,
      filename: picked.filename,
      sizeBytes: picked.sizeBytes,
      encrypted: parsed.encrypted,
      plainBackup: parsed.plainBackup,
      preview: parsed.preview,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Plan + import                                                                */
/* -------------------------------------------------------------------------- */

export async function buildImportPlanForPickedBackup(
  args: {
    pickedBackup: PickedBackupForPreview;
    options: BackupImportOptions;
  },
  onProgress?: BackupProgressCallback
): Promise<BackupImportPlan> {
  report(onProgress, 5, "Building import plan...");

  const plan = await buildImportPlan(args.pickedBackup.plainBackup, args.options);

  report(
    onProgress,
    100,
    "Import plan ready.",
    `${plan.conflicts.length} contacts checked`
  );

  return plan;
}

export async function importPickedBackupFile(
  args: {
    pickedBackup: PickedBackupForPreview;
    options: BackupImportOptions | BackupImportPlan;
  },
  onProgress?: BackupProgressCallback
): Promise<ImportPickedBackupResult> {
  report(onProgress, 5, "Preparing import...");

  const imported = await importPlainBackupToDatabase(
    args.pickedBackup.plainBackup,
    args.options,
    (importProgress) => {
      report(
        onProgress,
        10 + importProgress.percent * 0.78,
        importProgress.message,
        importProgress.detail
      );
    }
  );

  report(onProgress, 90, "Rescheduling local reminders...");

  const rescheduled = await rescheduleActiveImportedReminders();

  report(onProgress, 100, "Import complete.");

  return {
    imported,
    rescheduled,
  };
}

/* -------------------------------------------------------------------------- */
/* Backward compatibility for current BackupScreen                              */
/* -------------------------------------------------------------------------- */

function toLegacyImportResult(result: BackupImportResult) {
  return {
    imported: {
      contactGroups: result.imported.contactGroups,
      contactTags: result.imported.contactTags,
      contacts: result.imported.contacts,
      contactTagLinks: result.imported.contactTagLinks,
      contactMemories: result.imported.contactMemories,
      contactEvents: result.imported.contactEvents,
      reminders: result.imported.reminders,
      interactions: result.imported.interactions,
      contactPhotos:
        result.imported.contactPhotos + result.imported.albumPhotos,
    },
    restoredPhotos: result.restoredPhotos,
    conflicts: result.conflicts,
  };
}

export async function pickAndImportBackupFile(
  args: {
    mode: LegacyBackupMode;
    password?: string;
  },
  onProgress?: BackupProgressCallback
) {
  const picked = await pickBackupFileForPreview(
    {
      password: args.password,
    },
    onProgress
  );

  if (picked.canceled) {
    return {
      canceled: true as const,
      imported: null,
      rescheduled: undefined,
    };
  }

  const options = normalizeLegacyImportOptions(args);

  const result = await importPickedBackupFile(
    {
      pickedBackup: picked.picked,
      options,
    },
    onProgress
  );

  return {
    canceled: false as const,
    imported: toLegacyImportResult(result.imported),
    rescheduled: result.rescheduled,
    preview: picked.picked.preview,
  };
}