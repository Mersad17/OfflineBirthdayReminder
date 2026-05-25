import { File, Directory, Paths } from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import Constants from "expo-constants";
import { Platform } from "react-native";

import {
  ENCRYPTED_BACKUP_FORMAT,
  PLAIN_BACKUP_FORMAT,
  BackupExportOptions,
  BackupMode,
  EncryptedBackupV1,
  PlainBackupV1,
} from "./types";
import {
  buildPlainBackup,
  importPlainBackupToDatabase,
} from "./backupRepository";
import { decryptBackupJson, encryptBackupJson } from "./backupCrypto";
import { rescheduleActiveImportedReminders } from "./rescheduleImportedReminders";
import { BackupProgressCallback, clampPercent } from "./progress";

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

  /**
   * iOS does not allow silent public Downloads-style saving.
   * The user saves through Files from the share sheet.
   */
  report(onProgress, 60, "Opening Save to Files sheet...");

  await shareBackupFile(args.sourceUri);

  report(onProgress, 100, "Save sheet opened.");

  return {
    uri: args.sourceUri,
    savedToDevice: true,
  };
}

export async function exportBackupFile(
  options: BackupExportOptions,
  onProgress?: BackupProgressCallback
) {
  report(onProgress, 3, "Starting backup...");
  await waitForUi();

  report(onProgress, 10, "Reading local database...");
  await waitForUi();

  const plainBackup = await buildPlainBackup((progress) => {
    report(
      onProgress,
      10 + progress.percent * 0.55,
      progress.message,
      progress.detail
    );
  });

  plainBackup.app.appVersion =
    Constants.expoConfig?.version ??
    Constants.nativeApplicationVersion ??
    "unknown";

  plainBackup.app.platform = Platform.OS;

  report(
    onProgress,
    68,
    "Preparing backup JSON...",
    `${plainBackup.data.contacts.length} contacts, ${plainBackup.data.contactEvents.length} events`
  );

  await waitForUi();

  const plainJson = JSON.stringify(plainBackup, null, 2);
  const date = safeDateForFilename();

  let filename: string;
  let content: string;

  if (options.passwordProtected) {
    report(onProgress, 78, "Encrypting backup...");
    await waitForUi();

    const encrypted = await encryptBackupJson(
      plainJson,
      options.password,
      (cryptoProgress) => {
        report(
          onProgress,
          78 + cryptoProgress.percent * 0.12,
          cryptoProgress.message,
          cryptoProgress.detail
        );
      }
    );

    filename = `birthdayly-backup-${date}.birthdaylybackup`;
    content = JSON.stringify(encrypted, null, 2);
  } else {
    filename = `birthdayly-backup-${date}.json`;
    content = plainJson;
  }

  report(onProgress, 93, "Writing backup file...");
  await waitForUi();

  const file = await writeBackupFile({
    filename,
    content,
  });

  report(onProgress, 100, "Backup file ready.", file.uri);

  return {
    uri: file.uri,
    filename,
    sizeBytes: content.length,
    passwordProtected: options.passwordProtected,
  };
}

async function readPickedJsonFile(onProgress?: BackupProgressCallback) {
  report(onProgress, 3, "Opening file picker...");

  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "*/*"],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) {
    return {
      canceled: true as const,
      parsed: null,
    };
  }

  const asset = result.assets[0];

  if (!asset?.uri) {
    throw new Error("No file selected.");
  }

  report(onProgress, 15, "Reading backup file...", asset.name);

  const file = new File(asset.uri);
  const text = await file.text();

  try {
    report(onProgress, 25, "Parsing backup file...");

    return {
      canceled: false as const,
      parsed: JSON.parse(text),
    };
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }
}

export async function pickAndImportBackupFile(
  args: {
    mode: BackupMode;
    password?: string;
  },
  onProgress?: BackupProgressCallback
) {
  const picked = await readPickedJsonFile(onProgress);

  if (picked.canceled) {
    return {
      canceled: true as const,
      imported: null,
      rescheduled: undefined,
    };
  }

  const parsed = picked.parsed as any;

  let plainBackup: PlainBackupV1;

  if (parsed.format === ENCRYPTED_BACKUP_FORMAT) {
    report(onProgress, 35, "Decrypting backup...");

    const decryptedJson = await decryptBackupJson(
      parsed as EncryptedBackupV1,
      args.password,
      (decryptProgress) => {
        report(
          onProgress,
          35 + decryptProgress.percent * 0.15,
          decryptProgress.message,
          decryptProgress.detail
        );
      }
    );

    plainBackup = JSON.parse(decryptedJson);
  } else if (parsed.format === PLAIN_BACKUP_FORMAT) {
    report(onProgress, 45, "Plain backup detected.");
    plainBackup = parsed as PlainBackupV1;
  } else {
    throw new Error("Unknown backup format.");
  }

  report(onProgress, 55, "Importing data into SQLite...");

  const imported = await importPlainBackupToDatabase(
    plainBackup,
    args.mode,
    (importProgress) => {
      report(
        onProgress,
        55 + importProgress.percent * 0.3,
        importProgress.message,
        importProgress.detail
      );
    }
  );

  report(onProgress, 90, "Rescheduling local reminders...");

  const rescheduled = await rescheduleActiveImportedReminders();

  report(onProgress, 100, "Import complete.");

  return {
    canceled: false as const,
    imported,
    rescheduled,
  };
}