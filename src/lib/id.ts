import * as Crypto from "expo-crypto";

export async function createId(): Promise<string> {
  /**
   * Use Expo's native UUID if available.
   */
  if (typeof Crypto.randomUUID === "function") {
    return Crypto.randomUUID();
  }

  /**
   * Fallback UUID v4 using secure random bytes.
   */
  const bytes = await Crypto.getRandomBytesAsync(16);

  // UUID v4 bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}