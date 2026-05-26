// src/db/MigrationProvider.tsx
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

import { db } from "./client";
import migrations from "./drizzle/migrations";

type Props = {
  children: React.ReactNode;
};

export function MigrationProvider({ children }: Props) {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 8 }}>
          Database migration failed
        </Text>

        <Text style={{ textAlign: "center" }}>
          {error.message}
        </Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Preparing local database...</Text>
      </View>
    );
  }

  return <>{children}</>;
}