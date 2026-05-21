import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";

import {
  resources,
  supportedLanguages,
  SupportedLanguage,
} from "./resources";

function getDeviceLanguage(): SupportedLanguage {
  const locales = Localization.getLocales();
  const languageCode = locales[0]?.languageCode;

  if (
    languageCode &&
    supportedLanguages.includes(languageCode as SupportedLanguage)
  ) {
    return languageCode as SupportedLanguage;
  }

  return "en";
}

i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: "en",

  ns: ["common", "auth", "settings"],
  defaultNS: "common",

  interpolation: {
    escapeValue: false,
  },

  compatibilityJSON: "v4",
});

export default i18n;