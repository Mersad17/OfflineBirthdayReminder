import { AppId } from "../contacts/types";

export const PLAIN_BACKUP_FORMAT = "birthdayly.plain.backup";
export const ENCRYPTED_BACKUP_FORMAT = "birthdayly.encrypted.backup";
export const BACKUP_VERSION = 1;

export type BackupMode = "merge" | "replace";

export type BackupContactPhoto = {
  contactId: AppId;
  fileName: string;
  mimeType: string;
  base64: string;
};

export type BackupDataV1 = {
  contactGroups: any[];
  contactTags: any[];
  contacts: any[];
  contactTagLinks: any[];
  contactMemories: any[];
  contactEvents: any[];
  reminders: any[];
  interactions: any[];

  /**
   * Optional for backward compatibility.
   */
  contactPhotos?: BackupContactPhoto[];
};

export type PlainBackupV1 = {
  format: typeof PLAIN_BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  app: {
    name: "Birthdayly";
    appVersion?: string;
    platform?: string;
  };
  data: BackupDataV1;
};

export type EncryptedBackupV1 = {
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

export type BackupExportOptions = {
  passwordProtected: boolean;
  password?: string;
};

export type AnyBackupFile = PlainBackupV1 | EncryptedBackupV1;