import React from "react";
import RootNavigator from "./src/navigation/RootNavigator";
import "./src/notifications/notification";
import "./src/i18n";
import { LanguageProvider } from "./src/i18n/LanguageContext";
import { MigrationProvider } from "./src/db/MigrationsProvider";


export default function App() {
  return (
    <LanguageProvider>
      <MigrationProvider>
        <RootNavigator />
      </MigrationProvider>
    </LanguageProvider>
  );
}