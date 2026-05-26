import { AppId } from "../contacts/types";

export type ContactAlbum = {
  id: AppId;
  user_id: string;
  contact_id: AppId;
  title: string;
  cover_photo_id?: AppId | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
  deleted_at?: number | null;
};

export type ContactAlbumPhoto = {
  id: AppId;
  album_id: AppId;
  contact_id: AppId;
  uri: string;
  width?: number | null;
  height?: number | null;
  taken_at?: number | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
  deleted_at?: number | null;
};

export type ContactAlbumSummary = ContactAlbum & {
  photo_count: number;
  cover_uri?: string | null;
  preview_photos: ContactAlbumPhoto[];
};

export type ContactAlbumDetails = ContactAlbum & {
  photos: ContactAlbumPhoto[];
};