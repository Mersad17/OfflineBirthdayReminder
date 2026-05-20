// src/navigation/RootNavigator.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";

import { useAuth } from "../auth/AuthContext";
import AuthStack from "./AuthStack";
import AppTabs from "./AppTabs";
import { AppearanceProvider } from "../appearance/AppearanceContext";
import { useNavigationAppearance } from "../appearance/useNavigationAppearance";
const linking = {
  prefixes: ["birthdayly://"],
  config: {
    screens: {
      Login: "login",
      Register: "register",
      ForgotPassword: "forgot-password",
      ResetPassword: "reset-password",
      VerifyEmail: "verify-email",
    },
  },
};

export default function RootNavigator() {
  return (
    <AppearanceProvider>
      <NavigationWithAppearance />
    </AppearanceProvider>
  );
}

function NavigationWithAppearance() {
  const { isAuthenticated } = useAuth();
  const { navTheme } = useNavigationAppearance();

  const content = isAuthenticated ? <AppTabs /> : <AuthStack />;

  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      {content}
    </NavigationContainer>
  );
}