import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";

const DOCUMENT_DIRECTORY = FileSystem.documentDirectory;

if (!DOCUMENT_DIRECTORY) {
  throw new Error("FileSystem.documentDirectory is not available.");
}

const ALBUMS_DIR = `${DOCUMENT_DIRECTORY}contact-albums/`;

function safeExtension(uri: string) {
  const clean = uri.split("?")[0];
  const ext = clean.split(".").pop()?.toLowerCase();

  if (!ext || ext.length > 5) return "jpg";

  return ext;
}

async function ensureAlbumsDirectory() {
  const info = await FileSystem.getInfoAsync(ALBUMS_DIR);

  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(ALBUMS_DIR, {
      intermediates: true,
    });
  }
}

export type PickedAlbumPhoto = {
  uri: string;
  width?: number | null;
  height?: number | null;
};

export async function pickAndCopyAlbumPhotos(args: {
  contactId: string;
  albumId: string;
}) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Photo library permission was not granted.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    quality: 0.9,
    selectionLimit: 20,
  });

  if (result.canceled) {
    return [];
  }

  await ensureAlbumsDirectory();

  const copiedPhotos: PickedAlbumPhoto[] = [];

  for (const [index, asset] of result.assets.entries()) {
    if (!asset.uri) continue;

    const ext = safeExtension(asset.uri);
    const filename = `${args.contactId}-${args.albumId}-${Date.now()}-${index}.${ext}`;
    const destinationUri = `${ALBUMS_DIR}${filename}`;

    await FileSystem.copyAsync({
      from: asset.uri,
      to: destinationUri,
    });

    copiedPhotos.push({
      uri: destinationUri,
      width: asset.width ?? null,
      height: asset.height ?? null,
    });
  }

  return copiedPhotos;
}

export async function deleteStoredPhoto(uri?: string | null) {
  if (!uri) return;

  try {
    await FileSystem.deleteAsync(uri, {
      idempotent: true,
    });
  } catch (error) {
    console.log("Delete stored photo failed:", error);
  }
}