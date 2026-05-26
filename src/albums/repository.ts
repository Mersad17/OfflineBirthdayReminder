import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { contactAlbum, contactAlbumPhoto } from "../db/schema";
import { AppId } from "../contacts/types";
import {
  ContactAlbum,
  ContactAlbumDetails,
  ContactAlbumPhoto,
  ContactAlbumSummary,
} from "./types";
import { deleteStoredPhoto, PickedAlbumPhoto } from "./photoStorage";

function newId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function now() {
  return Date.now();
}

function mapAlbum(row: typeof contactAlbum.$inferSelect): ContactAlbum {
  return {
    id: row.id,
    user_id: row.userId,
    contact_id: row.contactId,
    title: row.title,
    cover_photo_id: row.coverPhotoId,
    sort_order: row.sortOrder,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt,
  };
}

function mapPhoto(
  row: typeof contactAlbumPhoto.$inferSelect
): ContactAlbumPhoto {
  return {
    id: row.id,
    album_id: row.albumId,
    contact_id: row.contactId,
    uri: row.uri,
    width: row.width,
    height: row.height,
    taken_at: row.takenAt,
    sort_order: row.sortOrder,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt,
  };
}

export async function fetchAlbumsForContact(
  contactId: AppId
): Promise<ContactAlbumSummary[]> {
  const albumRows = await db
    .select()
    .from(contactAlbum)
    .where(
      and(
        eq(contactAlbum.contactId, String(contactId)),
        isNull(contactAlbum.deletedAt)
      )
    )
    .orderBy(asc(contactAlbum.sortOrder), desc(contactAlbum.createdAt));

  const summaries = await Promise.all(
    albumRows.map(async (albumRow) => {
      const photoRows = await db
        .select()
        .from(contactAlbumPhoto)
        .where(
          and(
            eq(contactAlbumPhoto.albumId, albumRow.id),
            isNull(contactAlbumPhoto.deletedAt)
          )
        )
        .orderBy(asc(contactAlbumPhoto.sortOrder), desc(contactAlbumPhoto.createdAt));

      const photos = photoRows.map(mapPhoto);
      const album = mapAlbum(albumRow);

      const cover =
        photos.find((photo) => photo.id === album.cover_photo_id) ?? photos[0];

      return {
        ...album,
        photo_count: photos.length,
        cover_uri: cover?.uri ?? null,
        preview_photos: photos.slice(0, 4),
      };
    })
  );

  return summaries;
}

export async function fetchAlbumDetails(
  albumId: AppId
): Promise<ContactAlbumDetails> {
  const albumRows = await db
    .select()
    .from(contactAlbum)
    .where(and(eq(contactAlbum.id, String(albumId)), isNull(contactAlbum.deletedAt)))
    .limit(1);

  const albumRow = albumRows[0];

  if (!albumRow) {
    throw new Error("Album not found.");
  }

  const photoRows = await db
    .select()
    .from(contactAlbumPhoto)
    .where(
      and(
        eq(contactAlbumPhoto.albumId, String(albumId)),
        isNull(contactAlbumPhoto.deletedAt)
      )
    )
    .orderBy(asc(contactAlbumPhoto.sortOrder), desc(contactAlbumPhoto.createdAt));

  return {
    ...mapAlbum(albumRow),
    photos: photoRows.map(mapPhoto),
  };
}

export async function createContactAlbum(args: {
  contactId: AppId;
  title: string;
}) {
  const cleanTitle = args.title.trim();

  if (!cleanTitle) {
    throw new Error("Album title is required.");
  }

  const timestamp = now();

  const row = {
    id: newId(),
    userId: "local",
    contactId: String(args.contactId),
    title: cleanTitle,
    coverPhotoId: null,
    sortOrder: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };

  await db.insert(contactAlbum).values(row);

  return mapAlbum(row);
}

export async function renameContactAlbum(args: {
  albumId: AppId;
  title: string;
}) {
  const cleanTitle = args.title.trim();

  if (!cleanTitle) {
    throw new Error("Album title is required.");
  }

  await db
    .update(contactAlbum)
    .set({
      title: cleanTitle,
      updatedAt: now(),
    })
    .where(eq(contactAlbum.id, String(args.albumId)));

  return fetchAlbumDetails(args.albumId);
}

export async function addPhotosToAlbum(args: {
  contactId: AppId;
  albumId: AppId;
  photos: PickedAlbumPhoto[];
}) {
  const timestamp = now();

  const existingPhotos = await db
    .select()
    .from(contactAlbumPhoto)
    .where(
      and(
        eq(contactAlbumPhoto.albumId, String(args.albumId)),
        isNull(contactAlbumPhoto.deletedAt)
      )
    );

  const startOrder = existingPhotos.length;

  const rows = args.photos.map((photo, index) => ({
    id: newId(),
    albumId: String(args.albumId),
    contactId: String(args.contactId),
    uri: photo.uri,
    width: photo.width ?? null,
    height: photo.height ?? null,
    takenAt: null,
    sortOrder: startOrder + index,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  }));

  if (rows.length > 0) {
    await db.insert(contactAlbumPhoto).values(rows);

    const album = await fetchAlbumDetails(args.albumId);

    if (!album.cover_photo_id && rows[0]) {
      await db
        .update(contactAlbum)
        .set({
          coverPhotoId: rows[0].id,
          updatedAt: timestamp,
        })
        .where(eq(contactAlbum.id, String(args.albumId)));
    } else {
      await db
        .update(contactAlbum)
        .set({
          updatedAt: timestamp,
        })
        .where(eq(contactAlbum.id, String(args.albumId)));
    }
  }

  return fetchAlbumDetails(args.albumId);
}

export async function deleteAlbumPhoto(photoId: AppId) {
  const photoRows = await db
    .select()
    .from(contactAlbumPhoto)
    .where(eq(contactAlbumPhoto.id, String(photoId)))
    .limit(1);

  const photo = photoRows[0];

  if (!photo) return;

  await db
    .update(contactAlbumPhoto)
    .set({
      deletedAt: now(),
      updatedAt: now(),
    })
    .where(eq(contactAlbumPhoto.id, String(photoId)));

  await deleteStoredPhoto(photo.uri);
}

export async function deleteContactAlbum(albumId: AppId) {
  const album = await fetchAlbumDetails(albumId);
  const timestamp = now();

  await db
    .update(contactAlbum)
    .set({
      deletedAt: timestamp,
      updatedAt: timestamp,
    })
    .where(eq(contactAlbum.id, String(albumId)));

  await db
    .update(contactAlbumPhoto)
    .set({
      deletedAt: timestamp,
      updatedAt: timestamp,
    })
    .where(eq(contactAlbumPhoto.albumId, String(albumId)));

  for (const photo of album.photos) {
    await deleteStoredPhoto(photo.uri);
  }
}