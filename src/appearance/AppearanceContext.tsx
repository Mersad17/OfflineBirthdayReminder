// src/appearance/AppearanceContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";

import {
  loadAppearanceSettingsFromDb,
  saveAppearanceSettingsToDb,
} from "./appearanceStorage";

export type ThemeMode = "light" | "dark" | "system" | "custom";

export type BackgroundResizeMode = "cover" | "contain" | "center" | "repeat";

export type ResolvedThemeMode = "light" | "dark";

export type AppearanceSettings = {
  themeMode: ThemeMode;
  resolvedThemeMode: ResolvedThemeMode;

  primaryColor: string;
  backgroundColor: string;
  cardColor: string;
  titleColor: string;
  textColor: string;

  buttonColor: string;
  buttonTextColor: string;

  backgroundImageUri: string | null;
  backgroundResizeMode: BackgroundResizeMode;
};

type AppearanceContextValue = {
  settings: AppearanceSettings;
  isAppearanceReady: boolean;

  setThemeMode: (mode: ThemeMode) => void;
  setPrimaryColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  setCardColor: (color: string) => void;
  setTitleColor: (color: string) => void;
  setTextColor: (color: string) => void;
  setButtonColor: (color: string) => void;
  setButtonTextColor: (color: string) => void;
  setBackgroundImageUri: (uri: string | null) => void;
  setBackgroundResizeMode: (mode: BackgroundResizeMode) => void;
  resetAppearance: () => void;
};

const LIGHT_THEME: AppearanceSettings = {
  themeMode: "light",
  resolvedThemeMode: "light",

  primaryColor: "#4F46E5",
  backgroundColor: "#F7EFE7",
  cardColor: "#FFF9F1",
  titleColor: "#2B211B",
  textColor: "#7B6F66",

  buttonColor: "#4F46E5",
  buttonTextColor: "#FFFFFF",

  backgroundImageUri: null,
  backgroundResizeMode: "cover",
};

const DARK_THEME: AppearanceSettings = {
  themeMode: "dark",
  resolvedThemeMode: "dark",

  primaryColor: "#8B7CF6",
  backgroundColor: "#12100E",
  cardColor: "#1E1A17",
  titleColor: "#FFF7ED",
  textColor: "#D6C8BC",

  buttonColor: "#8B7CF6",
  buttonTextColor: "#FFFFFF",

  backgroundImageUri: null,
  backgroundResizeMode: "cover",
};

const AppearanceContext = createContext<AppearanceContextValue | undefined>(
  undefined
);

export function AppearanceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const systemScheme = useColorScheme();
  const systemTheme: ResolvedThemeMode =
    systemScheme === "dark" ? "dark" : "light";

  const [settings, setSettings] = useState<AppearanceSettings>(() =>
    buildTheme("system", systemTheme)
  );

  const [isAppearanceReady, setIsAppearanceReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const saved = await loadAppearanceSettingsFromDb();

      if (!mounted) return;

      if (saved) {
        const themeMode = saved.themeMode ?? "system";
        const base = buildTheme(themeMode, systemTheme);

        setSettings({
          ...base,
          ...saved,
          resolvedThemeMode: resolveThemeMode(themeMode, systemTheme),
        });
      } else {
        setSettings(buildTheme("system", systemTheme));
      }

      setIsAppearanceReady(true);
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setSettings((current) => {
      if (current.themeMode !== "system") return current;

      const next = {
        ...buildTheme("system", systemTheme),
        backgroundImageUri: current.backgroundImageUri,
        backgroundResizeMode: current.backgroundResizeMode,
      };

      void saveAppearanceSettingsToDb(next);

      return next;
    });
  }, [systemTheme]);

  function persist(next: AppearanceSettings) {
    void saveAppearanceSettingsToDb(next);
  }

  function updateSettings(
    patch: Partial<AppearanceSettings>,
    options?: {
      makeCustom?: boolean;
    }
  ) {
    setSettings((current) => {
      const nextThemeMode = options?.makeCustom ? "custom" : current.themeMode;

      const next: AppearanceSettings = {
        ...current,
        ...patch,
        themeMode: nextThemeMode,
        resolvedThemeMode: resolveThemeMode(nextThemeMode, systemTheme),
      };

      persist(next);

      return next;
    });
  }

  function setThemeMode(mode: ThemeMode) {
    setSettings((current) => {
      const next =
        mode === "custom"
          ? {
              ...current,
              themeMode: "custom" as const,
              resolvedThemeMode: current.resolvedThemeMode,
            }
          : {
              ...buildTheme(mode, systemTheme),
              backgroundImageUri: current.backgroundImageUri,
              backgroundResizeMode: current.backgroundResizeMode,
            };

      persist(next);

      return next;
    });
  }

  function resetAppearance() {
    const next = buildTheme("system", systemTheme);

    setSettings(next);
    persist(next);
  }

  const value = useMemo<AppearanceContextValue>(
    () => ({
      settings,
      isAppearanceReady,

      setThemeMode,

      setPrimaryColor: (color) =>
        updateSettings(
          {
            primaryColor: normalizeHexColor(color, settings.primaryColor),
          },
          { makeCustom: true }
        ),

      setBackgroundColor: (color) =>
        updateSettings(
          {
            backgroundColor: normalizeHexColor(color, settings.backgroundColor),
          },
          { makeCustom: true }
        ),

      setCardColor: (color) =>
        updateSettings(
          {
            cardColor: normalizeHexColor(color, settings.cardColor),
          },
          { makeCustom: true }
        ),

      setTitleColor: (color) =>
        updateSettings(
          {
            titleColor: normalizeHexColor(color, settings.titleColor),
          },
          { makeCustom: true }
        ),

      setTextColor: (color) =>
        updateSettings(
          {
            textColor: normalizeHexColor(color, settings.textColor),
          },
          { makeCustom: true }
        ),

      setButtonColor: (color) =>
        updateSettings(
          {
            buttonColor: normalizeHexColor(color, settings.buttonColor),
          },
          { makeCustom: true }
        ),

      setButtonTextColor: (color) =>
        updateSettings(
          {
            buttonTextColor: normalizeHexColor(
              color,
              settings.buttonTextColor
            ),
          },
          { makeCustom: true }
        ),

      setBackgroundImageUri: (uri) =>
        updateSettings(
          {
            backgroundImageUri: uri,
          },
          { makeCustom: true }
        ),

      setBackgroundResizeMode: (mode) =>
        updateSettings(
          {
            backgroundResizeMode: mode,
          },
          { makeCustom: true }
        ),

      resetAppearance,
    }),
    [settings, isAppearanceReady, systemTheme]
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);

  if (!context) {
    throw new Error("useAppearance must be used inside AppearanceProvider.");
  }

  return context;
}

function buildTheme(
  mode: ThemeMode,
  systemTheme: ResolvedThemeMode
): AppearanceSettings {
  if (mode === "dark") {
    return {
      ...DARK_THEME,
      themeMode: "dark",
      resolvedThemeMode: "dark",
    };
  }

  if (mode === "light") {
    return {
      ...LIGHT_THEME,
      themeMode: "light",
      resolvedThemeMode: "light",
    };
  }

  if (mode === "system") {
    const base = systemTheme === "dark" ? DARK_THEME : LIGHT_THEME;

    return {
      ...base,
      themeMode: "system",
      resolvedThemeMode: systemTheme,
    };
  }

  return {
    ...LIGHT_THEME,
    themeMode: "custom",
    resolvedThemeMode: systemTheme,
  };
}

function resolveThemeMode(
  mode: ThemeMode,
  systemTheme: ResolvedThemeMode
): ResolvedThemeMode {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";

  return systemTheme;
}

function normalizeHexColor(value: string, fallback: string) {
  const clean = value.trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(clean)) {
    return clean;
  }

  return fallback;
}