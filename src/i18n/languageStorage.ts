import * as SecureStore from "expo-secure-store";
import { SupportedLanguage } from "./resources";

export type LanguagePreference = SupportedLanguage | "system";

const LANGUAGE_KEY = "app_language";

export async function saveLanguagePreference(language: LanguagePreference) {
  await SecureStore.setItemAsync(LANGUAGE_KEY, language);
}

export async function loadLanguagePreference(): Promise<LanguagePreference | null> {
  const value = await SecureStore.getItemAsync(LANGUAGE_KEY);

  if (
    value === "system" ||
    value === "en" ||
    value === "fr" ||
    value === "sq"
  ) {
    return value;
  }

  return null;
}