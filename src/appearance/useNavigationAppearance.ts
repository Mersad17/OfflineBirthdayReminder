import { DefaultTheme } from "@react-navigation/native";
import { useMemo } from "react";
import { useAppearance } from "./AppearanceContext";

export function useNavigationAppearance() {
  const { settings } = useAppearance();

  const navTheme = useMemo(
    () => ({
      ...DefaultTheme,
      dark: settings.themeMode === "dark",
      colors: {
        ...DefaultTheme.colors,
        primary: settings.primaryColor,
        background: settings.backgroundColor,
        card: settings.cardColor,
        text: settings.titleColor,
        border: settings.primaryColor + "22",
        notification: settings.primaryColor,
      },
    }),
    [
      settings.themeMode,
      settings.primaryColor,
      settings.backgroundColor,
      settings.cardColor,
      settings.titleColor,
    ]
  );

  const stackScreenOptions = useMemo(
    () => ({
      headerStyle: {
        backgroundColor: settings.cardColor,
      },
      headerTintColor: settings.titleColor,
      headerTitleStyle: {
        fontWeight: "700" as const,
      },
      headerShadowVisible: false,
      contentStyle: {
        backgroundColor: settings.backgroundColor,
      },
    }),
    [settings.cardColor, settings.titleColor, settings.backgroundColor]
  );

  const tabBarStyle = useMemo(
    () => ({
      backgroundColor: settings.cardColor,
      borderTopColor: settings.primaryColor + "22",
      borderTopWidth: 1,
      height: 64,
      paddingTop: 6,
      paddingBottom: 8,
    }),
    [settings.cardColor, settings.primaryColor]
  );

  const tabScreenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarActiveTintColor: settings.primaryColor,
      tabBarInactiveTintColor: settings.textColor + "88",
      tabBarStyle,
      tabBarLabelStyle: {
        fontWeight: "800" as const,
        fontSize: 11,
      },
    }),
    [settings.primaryColor, settings.textColor, tabBarStyle]
  );

  return {
    settings,
    navTheme,
    stackScreenOptions,
    tabScreenOptions,
    tabBarStyle,
  };
}