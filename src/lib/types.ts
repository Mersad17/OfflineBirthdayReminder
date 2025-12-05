type ThemeMode = "light" | "dark" | "system";

export type AppearanceSettings = {
  themeMode: ThemeMode;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  backgroundImageUri?: string | null;
};
