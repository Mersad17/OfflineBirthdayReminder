// src/appearance/AppearanceContext.tsx
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
  } from "react";
  import AsyncStorage from "@react-native-async-storage/async-storage";
  
  export type ThemeMode = "light" | "dark" | "system";
  export type BackgroundResizeMode = "cover" | "contain" | "center"| "repeat";  
  export type AppearanceSettings = {
    themeMode: ThemeMode;
    primaryColor: string;
    backgroundColor: string;
    titleColor:string;
    textColor: string;
    buttonColor: string;
    buttonTextColor: string;
    backgroundImageUri?: string | null;
    backgroundResizeMode?: BackgroundResizeMode;
  };
  
  const DEFAULT_SETTINGS: AppearanceSettings = {
    themeMode: "light",
    primaryColor: "#4F46E5", // indigo
    backgroundColor: "#FFFFFF",
    titleColor: "#111827",       // dark
    textColor: "#374151",        // slightly lighter
    buttonColor: "#4F46E5",      // same as primary
    buttonTextColor: "#FFFFFF",
    backgroundImageUri: null,
    backgroundResizeMode:"cover",
  };
  
  const STORAGE_KEY = "appearance_settings_v1";
  
  type AppearanceContextValue = {
    settings: AppearanceSettings;
    setThemeMode: (mode: ThemeMode) => void;
    setPrimaryColor: (color: string) => void;
    setBackgroundColor: (color: string) => void;
    setTitleColor: (color:string)=>void;
    setTextColor: (color: string) => void;
    setButtonColor: (color: string) => void;
    setButtonTextColor: (color: string)=>void;
    setBackgroundImageUri: (uri: string | null) => void;
    setBackgroundResizeMode: (mode: BackgroundResizeMode) => void; 
  };
  
  const AppearanceContext = createContext<AppearanceContextValue | undefined>(
    undefined
  );
  
  export function AppearanceProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<AppearanceSettings>(DEFAULT_SETTINGS);
    const [loaded, setLoaded] = useState(false);
  
    // Load from storage on mount
    useEffect(() => {
      async function loadSettings() {
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            setSettings({ ...DEFAULT_SETTINGS, ...parsed });
          }
        } catch (e) {
          console.log("Failed to load appearance settings", e);
        } finally {
          setLoaded(true);
        }
      }
      loadSettings();
    }, []);
  
    // Save to storage when settings change
    useEffect(() => {
      if (!loaded) return;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch((e) =>
        console.log("Failed to save appearance settings", e)
      );
    }, [settings, loaded]);
  
    function updateSettings(partial: Partial<AppearanceSettings>) {
      setSettings((prev) => ({ ...prev, ...partial }));
    }
  
    const value: AppearanceContextValue = {
      settings,
      setThemeMode: (mode) => updateSettings({ themeMode: mode }),
      setPrimaryColor: (color) => updateSettings({ primaryColor: color }),
      setBackgroundColor: (color) => updateSettings({ backgroundColor: color }),
      setTitleColor:(color)=> updateSettings({ titleColor:color }),
      setTextColor: (color) => updateSettings({ textColor: color }),
      setButtonColor: (color) => updateSettings({ buttonColor: color }),
      setButtonTextColor: (color) => updateSettings({ buttonTextColor: color }),
      setBackgroundImageUri: (uri) => updateSettings({ backgroundImageUri: uri }),
      setBackgroundResizeMode: (mode) =>
        updateSettings({ backgroundResizeMode: mode }), 
    };
  
    // You could show a splash while !loaded, but for now just render children
    return (
      <AppearanceContext.Provider value={value}>
        {children}
      </AppearanceContext.Provider>
    );
  }
  
  export function useAppearance() {
    const ctx = useContext(AppearanceContext);
    if (!ctx) {
      throw new Error("useAppearance must be used inside AppearanceProvider");
    }
    return ctx;
  }
  