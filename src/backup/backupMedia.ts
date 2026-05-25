import * as FileSystem from "expo-file-system/legacy";
import { eq } from "drizzle-orm";

import { AppId } from "../contacts/types";
import { db } from "../db/client";
import { contact } from "../db/schema";
import { BackupContactPhoto } from "./types";
import { BackupProgressCallback, clampPercent } from "./progress";

function isLocalFileUri(uri?: string | null) {
  return Boolean(uri && uri.startsWith("file://"));
}

function getExtensionFromUri(uri: string) {
  const clean = uri.split("?")[0];
  const match = clean.match(/\.(jpg|jpeg|png|webp)$/i);

  if (!match) return "jpg";

  const ext = match[1].toLowerCase();

  if (ext === "jpeg") return "jpg";

  return ext;
}

function mimeFromExtension(ext: string) {
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "jpg":
    case "jpeg":
    default:
      return "image/jpeg";
  }
}

function safeFileName(input: string) {
  return input.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function report(
  onProgress: BackupProgressCallback | undefined,
  percent: number,
  message: string,
  detail?: string
) {
  onProgress?.({
    percent: clampPercent(percent),
    message,
    detail,
  });
}

export async function readContactPhotosForBackup(
  contacts: Array<{
    id: AppId;
    photoUri?: string | null;
  }>,
  onProgress?: BackupProgressCallback
): Promise<BackupContactPhoto[]> {
  const photos: BackupContactPhoto[] = [];

  const candidates = contacts.filter((row) => isLocalFileUri(row.photoUri));

  if (candidates.length === 0) {
    report(onProgress, 100, "No contact photos to backup.");
    return [];
  }

  for (let index = 0; index < candidates.length; index++) {
    const row = candidates[index];

    report(
      onProgress,
      (index / candidates.length) * 100,
      "Reading contact photos...",
      `${index + 1}/${candidates.length}`
    );

    try {
      const info = await FileSystem.getInfoAsync(row.photoUri!);

      if (!info.exists) {
        continue;
      }

      const ext = getExtensionFromUri(row.photoUri!);
      const mimeType = mimeFromExtension(ext);

      const base64 = await FileSystem.readAsStringAsync(row.photoUri!, {
        encoding: FileSystem.EncodingType.Base64,
      });

      photos.push({
        contactId: row.id,
        fileName: safeFileName(`contact-${row.id}.${ext}`),
        mimeType,
        base64,
      });
    } catch (error) {
      console.log("Skipping contact photo backup", row.id, error);
    }
  }

  report(
    onProgress,
    100,
    "Contact photos ready.",
    `${photos.length} photos`
  );

  return photos;
}

async function ensureDirectory(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);

  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(uri, {
      intermediates: true,
    });
  }
}

export async function restoreContactPhotosFromBackup(
  photos?: BackupContactPhoto[],
  onProgress?: BackupProgressCallback
) {
  if (!photos || photos.length === 0) {
    report(onProgress, 100, "No contact photos to restore.");

    return {
      restored: 0,
      failed: 0,
    };
  }

  const baseDirectory = `${FileSystem.documentDirectory}birthdayly/contact-photos/`;

  await ensureDirectory(baseDirectory);

  let restored = 0;
  let failed = 0;

  for (let index = 0; index < photos.length; index++) {
    const photo = photos[index];

    report(
      onProgress,
      (index / photos.length) * 100,
      "Restoring contact photos...",
      `${index + 1}/${photos.length}`
    );

    try {
      if (!photo.contactId || !photo.base64) {
        failed += 1;
        continue;
      }

      const fileName = safeFileName(
        photo.fileName || `contact-${photo.contactId}.jpg`
      );

      const fileUri = `${baseDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, photo.base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await db
        .update(contact)
        .set({
          photoUri: fileUri,
          updatedAt: new Date(),
        })
        .where(eq(contact.id, photo.contactId));

      restored += 1;
    } catch (error) {
      console.log("Failed to restore contact photo", photo.contactId, error);
      failed += 1;
    }
  }

  report(
    onProgress,
    100,
    "Contact photos restored.",
    `${restored} restored, ${failed} failed`
  );

  return {
    restored,
    failed,
  };
}