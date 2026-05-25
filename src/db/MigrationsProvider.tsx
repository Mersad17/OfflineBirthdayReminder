import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

import { db } from "./client";
import migrations from "./drizzle/migrations";

type Props = {
  children: React.ReactNode;
};

export function MigrationsProvider({ children }: Props) {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Database migration error</Text>
        <Text style={styles.error}>{error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.text}>Preparing local database...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontWeight: "800",
    fontSize: 18,
    marginBottom: 8,
  },
  error: {
    color: "#DC2626",
    textAlign: "center",
  },
  text: {
    marginTop: 12,
  },
});