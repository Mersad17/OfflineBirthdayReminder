import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as Localization from "expo-localization";
import i18n from "./index";

import {
  supportedLanguages,
  SupportedLanguage,
} from "./resources";

import {
  loadLanguagePreference,
  saveLanguagePreference,
  LanguagePreference,
} from "./languageStorage";

type LanguageContextValue = {
  languagePreference: LanguagePreference;
  activeLanguage: SupportedLanguage;
  loading: boolean;
  setLanguagePreference: (language: LanguagePreference) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

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

function resolveLanguage(preference: LanguagePreference): SupportedLanguage {
  if (preference === "system") {
    return getDeviceLanguage();
  }

  return preference;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [languagePreferenceState, setLanguagePreferenceState] =
    useState<LanguagePreference>("system");

  const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>("en");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initLanguage() {
      const saved = await loadLanguagePreference();
      const preference = saved ?? "system";
      const resolved = resolveLanguage(preference);

      setLanguagePreferenceState(preference);
      setActiveLanguage(resolved);

      await i18n.changeLanguage(resolved);

      setLoading(false);
    }

    initLanguage();
  }, []);

  async function setLanguagePreference(language: LanguagePreference) {
    const resolved = resolveLanguage(language);

    setLanguagePreferenceState(language);
    setActiveLanguage(resolved);

    await saveLanguagePreference(language);
    await i18n.changeLanguage(resolved);
  }

  const value = useMemo(
    () => ({
      languagePreference: languagePreferenceState,
      activeLanguage,
      loading,
      setLanguagePreference,
    }),
    [languagePreferenceState, activeLanguage, loading]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);

  if (!ctx) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return ctx;
}