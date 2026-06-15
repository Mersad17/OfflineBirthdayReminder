import { getRandomBytesAsync } from "expo-crypto";
import { gcm } from "@noble/ciphers/aes.js";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { base64 } from "@scure/base";

import {
  BACKUP_VERSION,
  ENCRYPTED_BACKUP_FORMAT,
  EncryptedBackupV2,
} from "./types";
import { BackupProgressCallback, clampPercent } from "./progress";

const KDF_ITERATIONS = 310_000;
const MIN_KDF_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const NONCE_BYTES = 12;
const AES_KEY_BYTES = 32;

const SUPPORTED_ENCRYPTED_BACKUP_VERSIONS = new Set<number>([
  1,
  BACKUP_VERSION,
]);

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type EncryptedBackupEnvelope = {
  format: typeof ENCRYPTED_BACKUP_FORMAT;
  version: number;
  encryptedAt?: string;
  encryption: {
    algorithm: "AES-256-GCM";
    kdf: "PBKDF2-HMAC-SHA256";
    iterations: number;
    salt: string;
    nonce: string;
  };
  ciphertext: string;
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

async function randomBytes(length: number): Promise<Uint8Array> {
  const bytes = await getRandomBytesAsync(length);

  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}

function assertPassword(password?: string) {
  if (!password || password.length < 8) {
    throw new Error("Backup password must be at least 8 characters.");
  }
}

function assertEncryptedBackupShape(input: unknown): asserts input is EncryptedBackupEnvelope {
  const backup = input as EncryptedBackupEnvelope;

  if (!backup || typeof backup !== "object") {
    throw new Error("Invalid encrypted backup file.");
  }

  if (backup.format !== ENCRYPTED_BACKUP_FORMAT) {
    throw new Error("This is not an encrypted Birthdayly backup.");
  }

  if (!SUPPORTED_ENCRYPTED_BACKUP_VERSIONS.has(Number(backup.version))) {
    throw new Error(`Unsupported encrypted backup version: ${backup.version}.`);
  }

  if (!backup.encryption || typeof backup.encryption !== "object") {
    throw new Error("Invalid encrypted backup: missing encryption metadata.");
  }

  if (backup.encryption.algorithm !== "AES-256-GCM") {
    throw new Error("Unsupported backup encryption algorithm.");
  }

  if (backup.encryption.kdf !== "PBKDF2-HMAC-SHA256") {
    throw new Error("Unsupported backup key derivation method.");
  }

  if (
    !Number.isFinite(backup.encryption.iterations) ||
    backup.encryption.iterations < MIN_KDF_ITERATIONS
  ) {
    throw new Error("Invalid backup encryption strength.");
  }

  if (!backup.encryption.salt || typeof backup.encryption.salt !== "string") {
    throw new Error("Invalid encrypted backup: missing salt.");
  }

  if (!backup.encryption.nonce || typeof backup.encryption.nonce !== "string") {
    throw new Error("Invalid encrypted backup: missing nonce.");
  }

  if (!backup.ciphertext || typeof backup.ciphertext !== "string") {
    throw new Error("Invalid encrypted backup: missing ciphertext.");
  }
}

function decodeBase64Field(value: string, fieldName: string) {
  try {
    return base64.decode(value);
  } catch {
    throw new Error(`Invalid encrypted backup: ${fieldName} is not valid base64.`);
  }
}

async function deriveAesKey(args: {
  password: string;
  saltBase64: string;
  iterations: number;
}): Promise<Uint8Array> {
  const salt = decodeBase64Field(args.saltBase64, "salt");

  if (salt.length < SALT_BYTES) {
    throw new Error("Invalid encrypted backup: salt is too short.");
  }

  return pbkdf2Async(sha256, args.password, salt, {
    c: args.iterations,
    dkLen: AES_KEY_BYTES,
  });
}

export async function encryptBackupJson(
  plainJson: string,
  password?: string,
  onProgress?: BackupProgressCallback
): Promise<EncryptedBackupV2> {
  assertPassword(password);

  let key: Uint8Array | null = null;

  try {
    report(onProgress, 5, "Creating encryption salt...");

    const saltBytes = await randomBytes(SALT_BYTES);
    const nonceBytes = await randomBytes(NONCE_BYTES);

    const salt = base64.encode(saltBytes);
    const nonce = base64.encode(nonceBytes);

    report(onProgress, 30, "Deriving encryption key...");

    key = await deriveAesKey({
      password: password!,
      saltBase64: salt,
      iterations: KDF_ITERATIONS,
    });

    report(onProgress, 75, "Encrypting backup data...");

    const plaintextBytes = encoder.encode(plainJson);
    const ciphertextBytes = gcm(key, nonceBytes).encrypt(plaintextBytes);

    report(onProgress, 100, "Encryption complete.");

    return {
      format: ENCRYPTED_BACKUP_FORMAT,
      version: BACKUP_VERSION,
      encryptedAt: new Date().toISOString(),
      encryption: {
        algorithm: "AES-256-GCM",
        kdf: "PBKDF2-HMAC-SHA256",
        iterations: KDF_ITERATIONS,
        salt,
        nonce,
      },
      ciphertext: base64.encode(ciphertextBytes),
    };
  } finally {
    key?.fill(0);
  }
}

export async function decryptBackupJson(
  encryptedBackup: unknown,
  password?: string,
  onProgress?: BackupProgressCallback
): Promise<string> {
  assertPassword(password);
  assertEncryptedBackupShape(encryptedBackup);

  let key: Uint8Array | null = null;

  try {
    report(onProgress, 20, "Deriving decryption key...");

    key = await deriveAesKey({
      password: password!,
      saltBase64: encryptedBackup.encryption.salt,
      iterations: encryptedBackup.encryption.iterations,
    });

    report(onProgress, 70, "Decrypting backup...");

    const nonceBytes = decodeBase64Field(
      encryptedBackup.encryption.nonce,
      "nonce"
    );

    if (nonceBytes.length !== NONCE_BYTES) {
      throw new Error("Invalid encrypted backup: nonce has invalid length.");
    }

    const ciphertextBytes = decodeBase64Field(
      encryptedBackup.ciphertext,
      "ciphertext"
    );

    const plaintextBytes = gcm(key, nonceBytes).decrypt(ciphertextBytes);

    report(onProgress, 100, "Decryption complete.");

    return decoder.decode(plaintextBytes);
  } catch (error: any) {
    if (
      typeof error?.message === "string" &&
      error.message.startsWith("Invalid encrypted backup")
    ) {
      throw error;
    }

    throw new Error("Could not decrypt backup. Check the password.");
  } finally {
    key?.fill(0);
  }
}