// src/appearance/appearanceStorage.ts
import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { appSetting } from "../db/schema";
import type {
  AppearanceSettings,
  BackgroundResizeMode,
  ThemeMode,
} from "./AppearanceContext";

const APPEARANCE_SETTING_KEY = "appearance";

const VALID_THEME_MODES: ThemeMode[] = ["light", "dark", "system", "custom"];

const VALID_BACKGROUND_RESIZE_MODES: BackgroundResizeMode[] = [
  "cover",
  "contain",
  "center",
  "repeat",
];

export async function loadAppearanceSettingsFromDb(): Promise<
  Partial<AppearanceSettings> | null
> {
  try {
    const rows = await db
      .select()
      .from(appSetting)
      .where(eq(appSetting.key, APPEARANCE_SETTING_KEY))
      .limit(1);

    const row = rows[0];

    if (!row) return null;

    const parsed = JSON.parse(row.value);

    return sanitizeStoredAppearance(parsed);
  } catch (error) {
    console.log("Load appearance settings failed:", error);
    return null;
  }
}

export async function saveAppearanceSettingsToDb(
  settings: AppearanceSettings
): Promise<void> {
  try {
    const now = new Date();

    const value = JSON.stringify({
      themeMode: settings.themeMode,
      primaryColor: settings.primaryColor,
      backgroundColor: settings.backgroundColor,
      cardColor: settings.cardColor,
      titleColor: settings.titleColor,
      textColor: settings.textColor,
      buttonColor: settings.buttonColor,
      buttonTextColor: settings.buttonTextColor,
      backgroundImageUri: settings.backgroundImageUri,
      backgroundResizeMode: settings.backgroundResizeMode,
    });

    const existing = await db
      .select()
      .from(appSetting)
      .where(eq(appSetting.key, APPEARANCE_SETTING_KEY))
      .limit(1);

    if (existing[0]) {
      await db
        .update(appSetting)
        .set({
          value,
          updatedAt: now,
        })
        .where(eq(appSetting.key, APPEARANCE_SETTING_KEY));

      return;
    }

    await db.insert(appSetting).values({
      key: APPEARANCE_SETTING_KEY,
      value,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    console.log("Save appearance settings failed:", error);
  }
}

function sanitizeStoredAppearance(
  value: unknown
): Partial<AppearanceSettings> | null {
  if (!value || typeof value !== "object") return null;

  const input = value as Record<string, unknown>;

  const output: Partial<AppearanceSettings> = {};

  if (
    typeof input.themeMode === "string" &&
    VALID_THEME_MODES.includes(input.themeMode as ThemeMode)
  ) {
    output.themeMode = input.themeMode as ThemeMode;
  }

  if (isHexColor(input.primaryColor)) {
    output.primaryColor = input.primaryColor;
  }

  if (isHexColor(input.backgroundColor)) {
    output.backgroundColor = input.backgroundColor;
  }

  if (isHexColor(input.cardColor)) {
    output.cardColor = input.cardColor;
  }

  if (isHexColor(input.titleColor)) {
    output.titleColor = input.titleColor;
  }

  if (isHexColor(input.textColor)) {
    output.textColor = input.textColor;
  }

  if (isHexColor(input.buttonColor)) {
    output.buttonColor = input.buttonColor;
  }

  if (isHexColor(input.buttonTextColor)) {
    output.buttonTextColor = input.buttonTextColor;
  }

  if (
    typeof input.backgroundImageUri === "string" ||
    input.backgroundImageUri === null
  ) {
    output.backgroundImageUri = input.backgroundImageUri;
  }

  if (
    typeof input.backgroundResizeMode === "string" &&
    VALID_BACKGROUND_RESIZE_MODES.includes(
      input.backgroundResizeMode as BackgroundResizeMode
    )
  ) {
    output.backgroundResizeMode =
      input.backgroundResizeMode as BackgroundResizeMode;
  }

  return output;
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
}