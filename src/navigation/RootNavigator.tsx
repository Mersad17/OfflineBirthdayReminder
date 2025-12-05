// src/navigation/RootNavigator.tsx
import React, { useMemo } from "react";
import {
  NavigationContainer,
  DefaultTheme,
} from "@react-navigation/native";
import { useAuth } from "../auth/AuthContext";
import AuthStack from "./AuthStack";
import AppTabs from "./AppTabs";
import {
  AppearanceProvider,
  useAppearance,
} from "../appearance/AppearanceContext";

export default function RootNavigator() {
  return (
    <AppearanceProvider>
      <NavigationWithAppearance />
    </AppearanceProvider>
  );
}

function NavigationWithAppearance() {
  const { isAuthenticated } = useAuth();
  const { settings } = useAppearance();

  const content = isAuthenticated ? <AppTabs /> : <AuthStack />;

  // 🎨 Thème de navigation :
  // - plus de background "transparent" ici
  // - on peut se baser sur la couleur de fond choisie dans les settings
  const navTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: settings.backgroundColor || "#000000",
      },
    }),
    [settings.backgroundColor]
  );

  return (
    <NavigationContainer theme={navTheme}>
      {content}
    </NavigationContainer>
  );
}
