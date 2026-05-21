import enCommon from "./locales/en/common.json";
import enAuth from "./locales/en/auth.json";
import enHome from "./locales/en/home.json";
import enSettings from "./locales/en/settings.json";

import frCommon from "./locales/fr/common.json";
import frAuth from "./locales/fr/auth.json";
import frHome from "./locales/fr/home.json";
import frSettings from "./locales/fr/settings.json";

import sqCommon from "./locales/sq/common.json";
import sqAuth from "./locales/sq/auth.json";
import sqHome from "./locales/sq/home.json";

import sqSettings from "./locales/sq/settings.json";

export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    home: enHome,
    settings: enSettings,
  },
  fr: {
    common: frCommon,
    auth: frAuth,
    home: frHome,
    settings: frSettings,
  },
  sq: {
    common: sqCommon,
    auth: sqAuth,
    home: sqHome,
    settings: sqSettings,
  },
} as const;

export const supportedLanguages = ["en", "fr", "sq"] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];