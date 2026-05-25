import React from "react";
import { NavigationContainer } from "@react-navigation/native";

import AppTabs from "./AppTabs";
import { AppearanceProvider } from "../appearance/AppearanceContext";
import { useNavigationAppearance } from "../appearance/useNavigationAppearance";

export default function RootNavigator() {
  return (
    <AppearanceProvider>
      <NavigationWithAppearance />
    </AppearanceProvider>
  );
}

function NavigationWithAppearance() {
  const { navTheme } = useNavigationAppearance();

  return (
    <NavigationContainer theme={navTheme}>
      <AppTabs />
    </NavigationContainer>
  );
}