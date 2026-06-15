import { AppId } from "../contacts/types";

export const PLAIN_BACKUP_FORMAT = "birthdayly.plain.backup";
export const ENCRYPTED_BACKUP_FORMAT = "birthdayly.encrypted.backup";

export const BACKUP_VERSION = 2;

export type BackupImportStrategy =
  | "safe_merge"
  | "update_existing"
  | "duplicate_conflicts"
  | "replace_selected"
  | "replace_all";

export type LegacyBackupMode = "merge" | "replace";

export type BackupExportScope =
  | "full"
  | "selected_contacts"
  | "settings_only";

export type BackupDataType =
  | "contacts"
  | "groups"
  | "tags"
  | "memories"
  | "events"
  | "reminders"
  | "interactions"
  | "custom_info"
  | "contact_photos"
  | "albums"
  | "album_photos"
  | "relationships"
  | "app_settings";

export type BackupIncludeOptions = {
  contacts: boolean;
  groups: boolean;
  tags: boolean;
  memories: boolean;
  events: boolean;
  reminders: boolean;
  interactions: boolean;
  customInfo: boolean;
  contactPhotos: boolean;
  albums: boolean;
  albumPhotos: boolean;
  relationships: boolean;
  appSettings: boolean;
};

export type BackupExportOptions = {
  passwordProtected: boolean;
  password?: string;
  scope: BackupExportScope;
  selectedContactIds?: AppId[];
  include: BackupIncludeOptions;
};

export type BackupImportOptions = {
  strategy: BackupImportStrategy;
  selectedContactIds?: AppId[];
  include: BackupIncludeOptions;
  password?: string;
};

export type BackupContactPhoto = {
  contactId: AppId;
  fileName: string;
  mimeType: string;
  base64: string;
};

export type BackupAlbumPhoto = {
  id: AppId;
  albumId: AppId;
  contactId: AppId;
  fileName: string;
  mimeType: string;
  base64: string;
  width?: number | null;
  height?: number | null;
  takenAt?: string | number | null;
  sortOrder?: number;
};

export type BackupCounts = {
  contactGroups: number;
  contactTags: number;
  contacts: number;
  contactTagLinks: number;
  contactMemories: number;
  contactEvents: number;
  reminders: number;
  interactions: number;
  customInfoSections: number;
  customInfoFields: number;
  customInfoEntries: number;
  customInfoValues: number;
  contactAlbums: number;
  contactAlbumPhotos: number;
  contactRelationships: number;
  appSettings: number;
  contactPhotos: number;
  albumPhotos: number;
};

export type BackupManifestV2 = {
  backupVersion: typeof BACKUP_VERSION;
  exportedAt: string;
  exportType: BackupExportScope;
  selectedContactIds?: AppId[];
  includedDataTypes: BackupDataType[];
  counts: BackupCounts;
  app: {
    name: "Birthdayly";
    appVersion?: string;
    platform?: string;
  };
};

export type BackupDataV2 = {
  contactGroups: any[];
  contactTags: any[];
  contacts: any[];
  contactTagLinks: any[];
  contactMemories: any[];
  contactEvents: any[];
  reminders: any[];
  interactions: any[];

  customInfoSections: any[];
  customInfoFields: any[];
  customInfoEntries: any[];
  customInfoValues: any[];

  contactAlbums: any[];
  contactAlbumPhotos: any[];
  contactRelationships: any[];

  appSettings: any[];

  contactPhotos: BackupContactPhoto[];
  albumPhotos: BackupAlbumPhoto[];
};

export type PlainBackupV2 = {
  format: typeof PLAIN_BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  manifest: BackupManifestV2;
  data: BackupDataV2;
};

export type EncryptedBackupV2 = {
  format: typeof ENCRYPTED_BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  encryptedAt: string;
  encryption: {
    algorithm: "AES-256-GCM";
    kdf: "PBKDF2-HMAC-SHA256";
    iterations: number;
    salt: string;
    nonce: string;
  };
  ciphertext: string;
};

export type BackupPreview = {
  encrypted: boolean;
  filename?: string;
  format: string;
  version: number;
  manifest: BackupManifestV2;
};

export type ContactImportConflict = {
  backupContactId: AppId;
  localContactId?: AppId;
  contactName: string;
  matchType: "id" | "email" | "phone" | "name_birthday" | "none";
  decision:
    | "create_new"
    | "keep_local"
    | "merge_missing"
    | "update_from_backup"
    | "duplicate";
};

export type BackupImportPlan = {
  strategy: BackupImportStrategy;
  selectedContactIds?: AppId[];
  include: BackupIncludeOptions;
  conflicts: ContactImportConflict[];
};

export type BackupImportResult = {
  imported: BackupCounts;
  skipped: Partial<BackupCounts>;
  conflicts: {
    total: number;
    createdNew: number;
    merged: number;
    updated: number;
    duplicated: number;
    keptLocal: number;
  };
  restoredPhotos: {
    restored: number;
    failed: number;
  };
};

export type AnyBackupFile = PlainBackupV2 | EncryptedBackupV2;

export const FULL_BACKUP_INCLUDE: BackupIncludeOptions = {
  contacts: true,
  groups: true,
  tags: true,
  memories: true,
  events: true,
  reminders: true,
  interactions: true,
  customInfo: true,
  contactPhotos: true,
  albums: true,
  albumPhotos: true,
  relationships: true,
  appSettings: true,
};

export const SELECTED_CONTACTS_BACKUP_INCLUDE: BackupIncludeOptions = {
  contacts: true,
  groups: true,
  tags: true,
  memories: true,
  events: true,
  reminders: true,
  interactions: true,
  customInfo: true,
  contactPhotos: true,
  albums: true,
  albumPhotos: true,
  relationships: true,
  appSettings: false,
};