// src/appearance/appearanceImageStorage.ts
import * as FileSystem from "expo-file-system/legacy";

const APPEARANCE_DIR = `${FileSystem.documentDirectory}appearance/`;

function safeExtension(uri: string) {
  const cleanUri = uri.split("?")[0];
  const extension = cleanUri.split(".").pop()?.toLowerCase();

  if (!extension || extension.length > 5) {
    return "jpg";
  }

  return extension;
}

async function ensureAppearanceDirectory() {
  const info = await FileSystem.getInfoAsync(APPEARANCE_DIR);

  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(APPEARANCE_DIR, {
      intermediates: true,
    });
  }
}

export async function copyAppearanceBackgroundImage(sourceUri: string) {
  await ensureAppearanceDirectory();

  const extension = safeExtension(sourceUri);
  const filename = `background-${Date.now()}.${extension}`;
  const destinationUri = `${APPEARANCE_DIR}${filename}`;

  await FileSystem.copyAsync({
    from: sourceUri,
    to: destinationUri,
  });

  return destinationUri;
}

export async function deleteAppearanceBackgroundImage(uri?: string | null) {
  if (!uri) return;

  if (!uri.startsWith(APPEARANCE_DIR)) return;

  try {
    await FileSystem.deleteAsync(uri, {
      idempotent: true,
    });
  } catch (error) {
    console.log("Delete appearance background failed:", error);
  }
}