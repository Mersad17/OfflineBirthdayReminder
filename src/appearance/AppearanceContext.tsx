// src/appearance/AppearanceContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useColorScheme } from "react-native";

export type ThemeMode = "light" | "dark" | "system" | "custom";

type BackgroundResizeMode = "cover" | "contain" | "center" | "repeat";

type AppearanceSettings = {
  themeMode: ThemeMode;
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

type ColorPreset = Pick<
  AppearanceSettings,
  | "primaryColor"
  | "backgroundColor"
  | "cardColor"
  | "titleColor"
  | "textColor"
  | "buttonColor"
  | "buttonTextColor"
>;

const LIGHT_PRESET: ColorPreset = {
  primaryColor: "#4F46E5",
  backgroundColor: "#F9FAFB",
  cardColor: "#FFFFFF",
  titleColor: "#111827",
  textColor: "#374151",
  buttonColor: "#4F46E5",
  buttonTextColor: "#FFFFFF",
};

const DARK_PRESET: ColorPreset = {
  primaryColor: "#6366F1",
  backgroundColor: "#020617",
  cardColor: "#020617", // or "#0B1120" if you want slightly lighter cards
  titleColor: "#F9FAFB",
  textColor: "#E5E7EB",
  buttonColor: "#4F46E5",
  buttonTextColor: "#FFFFFF",
};

const INITIAL_CUSTOM_PRESET: ColorPreset = { ...LIGHT_PRESET };

type AppearanceContextValue = {
  settings: AppearanceSettings;
  setThemeMode: (mode: ThemeMode) => void;
  setPrimaryColor: (c: string) => void;
  setBackgroundColor: (c: string) => void;
  setCardColor: (c: string) => void;
  setTitleColor: (c: string) => void;
  setTextColor: (c: string) => void;
  setButtonColor: (c: string) => void;
  setButtonTextColor: (c: string) => void;
  setBackgroundImageUri: (uri: string | null) => void;
  setBackgroundResizeMode: (m: BackgroundResizeMode) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | undefined>(
  undefined
);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme(); // "light" | "dark" | null

  const [settings, setSettings] = useState<AppearanceSettings>({
    themeMode: "system",
    ...LIGHT_PRESET,
    backgroundImageUri: null,
    backgroundResizeMode: "cover",
  });

  // stores the user's last custom palette
  const [customPreset, setCustomPreset] =
    useState<ColorPreset>(INITIAL_CUSTOM_PRESET);

  // helper: apply a preset to settings
  function applyPreset(preset: ColorPreset, mode: ThemeMode) {
    setSettings((prev) => ({
      ...prev,
      themeMode: mode,
      ...preset,
    }));
  }

  // system mode → react to OS theme changes
  useEffect(() => {
    if (settings.themeMode !== "system") return;
    const isDark = systemScheme === "dark";
    applyPreset(isDark ? DARK_PRESET : LIGHT_PRESET, "system");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemScheme]);

  // ---- Theme mode setter ----
  const setThemeMode = (mode: ThemeMode) => {
    if (mode === "light") {
      applyPreset(LIGHT_PRESET, "light");
    } else if (mode === "dark") {
      applyPreset(DARK_PRESET, "dark");
    } else if (mode === "system") {
      const isDark = systemScheme === "dark";
      applyPreset(isDark ? DARK_PRESET : LIGHT_PRESET, "system");
    } else if (mode === "custom") {
      // go back to last custom palette
      applyPreset(customPreset, "custom");
    }
  };

  // ---- helper: any manual color change → custom mode ----
  function updateColor<K extends keyof ColorPreset>(key: K, value: string) {
    setSettings((prev) => {
      const currentColors: ColorPreset = {
        primaryColor: prev.primaryColor,
        backgroundColor: prev.backgroundColor,
        cardColor: prev.cardColor,
        titleColor: prev.titleColor,
        textColor: prev.textColor,
        buttonColor: prev.buttonColor,
        buttonTextColor: prev.buttonTextColor,
      };

      // if not already in custom, copy current palette as starting custom
      if (prev.themeMode !== "custom") {
        const newCustom: ColorPreset = { ...currentColors, [key]: value };
        setCustomPreset(newCustom);
        return {
          ...prev,
          themeMode: "custom",
          ...newCustom,
        };
      }

      // already in custom → update both settings + stored customPreset
      const updated: ColorPreset = { ...currentColors, [key]: value };
      setCustomPreset(updated);
      return {
        ...prev,
        ...updated,
      };
    });
  }

  const setPrimaryColor = (c: string) => updateColor("primaryColor", c);
  const setBackgroundColor = (c: string) => updateColor("backgroundColor", c);
  const setCardColor = (c: string) => updateColor("cardColor", c);
  const setTitleColor = (c: string) => updateColor("titleColor", c);
  const setTextColor = (c: string) => updateColor("textColor", c);
  const setButtonColor = (c: string) => updateColor("buttonColor", c);
  const setButtonTextColor = (c: string) =>
    updateColor("buttonTextColor", c);

  const setBackgroundImageUri = (uri: string | null) => {
    setSettings((prev) => ({
      ...prev,
      backgroundImageUri: uri,
    }));
  };

  const setBackgroundResizeMode = (m: BackgroundResizeMode) => {
    setSettings((prev) => ({
      ...prev,
      backgroundResizeMode: m,
    }));
  };

  const value: AppearanceContextValue = {
    settings,
    setThemeMode,
    setPrimaryColor,
    setBackgroundColor,
    setCardColor,
    setTitleColor,
    setTextColor,
    setButtonColor,
    setButtonTextColor,
    setBackgroundImageUri,
    setBackgroundResizeMode,
  };

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    throw new Error("useAppearance must be used within AppearanceProvider");
  }
  return ctx;
}
