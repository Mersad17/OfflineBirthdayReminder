import { getRandomBytesAsync } from "expo-crypto";
import { gcm } from "@noble/ciphers/aes.js";
import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { base64 } from "@scure/base";

import {
  BACKUP_VERSION,
  ENCRYPTED_BACKUP_FORMAT,
  EncryptedBackupV1,
} from "./types";
import { BackupProgressCallback, clampPercent } from "./progress";

const KDF_ITERATIONS = 310_000;
const SALT_BYTES = 16;
const NONCE_BYTES = 12;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

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

async function deriveAesKey(args: {
  password: string;
  saltBase64: string;
  iterations: number;
}): Promise<Uint8Array> {
  const salt = base64.decode(args.saltBase64);

  const keyBytes = await pbkdf2Async(sha256, args.password, salt, {
    c: args.iterations,
    dkLen: 32,
  });

  return keyBytes;
}

function assertPassword(password?: string) {
  if (!password || password.length < 8) {
    throw new Error("Backup password must be at least 8 characters.");
  }
}

export async function encryptBackupJson(
  plainJson: string,
  password?: string,
  onProgress?: BackupProgressCallback
): Promise<EncryptedBackupV1> {
  assertPassword(password);

  report(onProgress, 5, "Creating encryption salt...");

  const saltBytes = await randomBytes(SALT_BYTES);
  const nonceBytes = await randomBytes(NONCE_BYTES);

  const salt = base64.encode(saltBytes);
  const nonce = base64.encode(nonceBytes);

  report(onProgress, 30, "Deriving encryption key...");

  const key = await deriveAesKey({
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
}

export async function decryptBackupJson(
  encryptedBackup: EncryptedBackupV1,
  password?: string,
  onProgress?: BackupProgressCallback
): Promise<string> {
  assertPassword(password);

  if (encryptedBackup.format !== ENCRYPTED_BACKUP_FORMAT) {
    throw new Error("This is not an encrypted Birthdayly backup.");
  }

  if (encryptedBackup.version !== BACKUP_VERSION) {
    throw new Error("Unsupported encrypted backup version.");
  }

  if (encryptedBackup.encryption.kdf !== "PBKDF2-HMAC-SHA256") {
    throw new Error("Unsupported backup key derivation method.");
  }

  if (encryptedBackup.encryption.algorithm !== "AES-256-GCM") {
    throw new Error("Unsupported backup encryption algorithm.");
  }

  report(onProgress, 20, "Deriving decryption key...");

  const key = await deriveAesKey({
    password: password!,
    saltBase64: encryptedBackup.encryption.salt,
    iterations: encryptedBackup.encryption.iterations,
  });

  report(onProgress, 70, "Decrypting backup...");

  const nonceBytes = base64.decode(encryptedBackup.encryption.nonce);
  const ciphertextBytes = base64.decode(encryptedBackup.ciphertext);

  try {
    const plaintextBytes = gcm(key, nonceBytes).decrypt(ciphertextBytes);

    report(onProgress, 100, "Decryption complete.");

    return decoder.decode(plaintextBytes);
  } catch {
    throw new Error("Could not decrypt backup. Check the password.");
  }
}