// App.tsx
import { AuthProvider } from "./src/auth/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import React from "react";
import "./src/i18n";
import { LanguageProvider } from "./src/i18n/LanguageContext";
export default function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
      
      <RootNavigator />
    </AuthProvider>
    </LanguageProvider>
  );
}
