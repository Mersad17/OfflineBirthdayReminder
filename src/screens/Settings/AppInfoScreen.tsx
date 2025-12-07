// src/screens/settings/AppInfoScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Linking,
  ScrollView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SettingsStackParamsList } from "../../navigation/SettingsStack";
import { useAppearance } from "../../appearance/AppearanceContext";
import Constants from "expo-constants";
import { Screen } from "../../components/Screen";

type Props = NativeStackScreenProps<SettingsStackParamsList, "AppInfo">;

export default function AppInfoScreen({}: Props) {
  const { settings } = useAppearance();

  const appName = Constants.expoConfig?.name ?? "My App";
  const version =
    Constants.expoConfig?.version ?? Constants.nativeApplicationVersion ?? "–";
  const buildNumber =
    Constants.nativeBuildVersion ??
    Constants.expoConfig?.runtimeVersion ??
    "–";

  const environment = __DEV__ ? "Development" : "Production";

  function openLink(url: string) {
    Linking.openURL(url).catch((err) => {
      console.log("Failed to open URL", err);
    });
  }

  return (
    <Screen scroll>

    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: settings.titleColor }]}>
          About this app
        </Text>

        {/* App info card */}
        <View style={styles.card}>
          <Text style={[styles.appName, { color: settings.textColor }]}>
            {appName}
          </Text>

          <View style={styles.row}>
            <Text style={[styles.label, { color: settings.textColor }]}>
              Version
            </Text>
            <Text style={[styles.value, { color: settings.textColor }]}>
              {version}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.label, { color: settings.textColor }]}>
              Build
            </Text>
            <Text style={[styles.value, { color: settings.textColor }]}>
              {buildNumber}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.label, { color: settings.textColor }]}>
              Environment
            </Text>
            <Text style={[styles.value, { color: settings.textColor }]}>
              {environment}
            </Text>
          </View>

         
        </View>

        {/* Links */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: settings.textColor }]}>
            Legal
          </Text>

          <Text
            style={[styles.link, { color: settings.buttonColor }]}
            onPress={() => openLink("https://example.com/privacy")}
            >
            Privacy Policy
          </Text>
          <Text
            style={[styles.link, { color: settings.buttonColor }]}
            onPress={() => openLink("https://example.com/terms")}
            >
            Terms of Service
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: settings.textColor }]}>
            © {new Date().getFullYear()} Your Company. All rights reserved.
          </Text>
        </View>
      </View>
    </ScrollView>
</Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  container: {
    flex: 1,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    gap: 8,
  },
  appName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    fontSize: 14,
    opacity: 0.8,
  },
  value: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "right",
    flexShrink: 1,
  },
  section: {
    marginTop: 8,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  link: {
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
    opacity: 0.7,
  },
});
