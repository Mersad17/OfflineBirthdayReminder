import * as FileSystem from "expo-file-system/legacy";
import { eq } from "drizzle-orm";

import { AppId } from "../contacts/types";
import { db } from "../db/client";
import { contact, contactAlbumPhoto } from "../db/schema";
import { BackupAlbumPhoto, BackupContactPhoto } from "./types";
import { BackupProgressCallback, clampPercent } from "./progress";

type BackupIdMap = Record<string, string> | Map<string, string>;

type RestoreMediaOptions = {
  contactIdMap?: BackupIdMap;
  albumPhotoIdMap?: BackupIdMap;
};

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

function isLocalFileUri(uri?: string | null) {
  return Boolean(uri && uri.startsWith("file://"));
}

function getDocumentDirectory() {
  if (!FileSystem.documentDirectory) {
    throw new Error("App document directory is not available.");
  }

  return FileSystem.documentDirectory;
}

function getMappedId(id: string, map?: BackupIdMap) {
  if (!map) return id;

  if (map instanceof Map) {
    return map.get(id) ?? id;
  }

  return map[id] ?? id;
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

async function ensureDirectory(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);

  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(uri, {
      intermediates: true,
    });
  }
}

async function readLocalFileAsBase64(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);

  if (!info.exists) {
    return null;
  }

  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/* -------------------------------------------------------------------------- */
/* Contact profile photos                                                       */
/* -------------------------------------------------------------------------- */

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
      const photoUri = row.photoUri;

      if (!photoUri) continue;

      const base64 = await readLocalFileAsBase64(photoUri);

      if (!base64) continue;

      const ext = getExtensionFromUri(photoUri);
      const mimeType = mimeFromExtension(ext);

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

  report(onProgress, 100, "Contact photos ready.", `${photos.length} photos`);

  return photos;
}

export async function restoreContactPhotosFromBackup(
  photos?: BackupContactPhoto[],
  onProgress?: BackupProgressCallback,
  options?: RestoreMediaOptions
) {
  if (!photos || photos.length === 0) {
    report(onProgress, 100, "No contact photos to restore.");

    return {
      restored: 0,
      failed: 0,
    };
  }

  const baseDirectory = `${getDocumentDirectory()}birthdayly/contact-photos/`;

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

      const mappedContactId = getMappedId(
        String(photo.contactId),
        options?.contactIdMap
      );

      const ext = getExtensionFromMimeTypeOrName(photo.mimeType, photo.fileName);
      const fileName = safeFileName(
        photo.fileName || `contact-${mappedContactId}.${ext}`
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
        .where(eq(contact.id, mappedContactId));

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

/* -------------------------------------------------------------------------- */
/* Album photos                                                                 */
/* -------------------------------------------------------------------------- */

export async function readAlbumPhotosForBackup(
  albumPhotos: Array<{
    id: AppId;
    albumId: AppId;
    contactId: AppId;
    uri?: string | null;
    width?: number | null;
    height?: number | null;
    takenAt?: number | string | null;
    sortOrder?: number | null;
  }>,
  onProgress?: BackupProgressCallback
): Promise<BackupAlbumPhoto[]> {
  const photos: BackupAlbumPhoto[] = [];
  const candidates = albumPhotos.filter((row) => isLocalFileUri(row.uri));

  if (candidates.length === 0) {
    report(onProgress, 100, "No album photos to backup.");
    return [];
  }

  for (let index = 0; index < candidates.length; index++) {
    const row = candidates[index];

    report(
      onProgress,
      (index / candidates.length) * 100,
      "Reading album photos...",
      `${index + 1}/${candidates.length}`
    );

    try {
      const uri = row.uri;

      if (!uri) continue;

      const base64 = await readLocalFileAsBase64(uri);

      if (!base64) continue;

      const ext = getExtensionFromUri(uri);
      const mimeType = mimeFromExtension(ext);

      photos.push({
        id: row.id,
        albumId: row.albumId,
        contactId: row.contactId,
        fileName: safeFileName(`album-${row.albumId}-photo-${row.id}.${ext}`),
        mimeType,
        base64,
        width: row.width ?? null,
        height: row.height ?? null,
        takenAt: row.takenAt ?? null,
        sortOrder: row.sortOrder ?? 0,
      });
    } catch (error) {
      console.log("Skipping album photo backup", row.id, error);
    }
  }

  report(onProgress, 100, "Album photos ready.", `${photos.length} photos`);

  return photos;
}

export async function restoreAlbumPhotosFromBackup(
  photos?: BackupAlbumPhoto[],
  onProgress?: BackupProgressCallback,
  options?: RestoreMediaOptions
) {
  if (!photos || photos.length === 0) {
    report(onProgress, 100, "No album photos to restore.");

    return {
      restored: 0,
      failed: 0,
    };
  }

  const baseDirectory = `${getDocumentDirectory()}birthdayly/album-photos/`;

  await ensureDirectory(baseDirectory);

  let restored = 0;
  let failed = 0;

  for (let index = 0; index < photos.length; index++) {
    const photo = photos[index];

    report(
      onProgress,
      (index / photos.length) * 100,
      "Restoring album photos...",
      `${index + 1}/${photos.length}`
    );

    try {
      if (!photo.id || !photo.base64) {
        failed += 1;
        continue;
      }

      const mappedPhotoId = getMappedId(
        String(photo.id),
        options?.albumPhotoIdMap
      );

      const ext = getExtensionFromMimeTypeOrName(photo.mimeType, photo.fileName);
      const fileName = safeFileName(
        photo.fileName || `album-photo-${mappedPhotoId}.${ext}`
      );

      const fileUri = `${baseDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, photo.base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await db
        .update(contactAlbumPhoto)
        .set({
          uri: fileUri,
          updatedAt: Date.now(),
        })
        .where(eq(contactAlbumPhoto.id, mappedPhotoId));

      restored += 1;
    } catch (error) {
      console.log("Failed to restore album photo", photo.id, error);
      failed += 1;
    }
  }

  report(
    onProgress,
    100,
    "Album photos restored.",
    `${restored} restored, ${failed} failed`
  );

  return {
    restored,
    failed,
  };
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                      */
/* -------------------------------------------------------------------------- */

function getExtensionFromMimeTypeOrName(
  mimeType?: string | null,
  fileName?: string | null
) {
  if (fileName) {
    const ext = getExtensionFromUri(fileName);

    if (ext) return ext;
  }

  switch (mimeType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/jpeg":
    default:
      return "jpg";
  }
}