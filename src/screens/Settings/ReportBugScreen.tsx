// src/screens/settings/ReportBugScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import Constants from "expo-constants";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SettingsStackParamsList } from "../../navigation/SettingsStack";
import { useAppearance } from "../../appearance/AppearanceContext";
import { Screen } from "../../components/Screen";
import { reportBug } from "../../support/api";

type Props = NativeStackScreenProps<SettingsStackParamsList, "ReportBug">;

export default function ReportBugScreen({ navigation }: Props) {
  const { settings } = useAppearance();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (!title.trim() || !description.trim()) {
      Alert.alert("Report a bug", "Please fill in both fields.");
      return;
    }

    const appVersion =
      Constants.expoConfig?.version ??
      Constants.nativeApplicationVersion ??
      "unknown";
    const platform = Platform.OS; // "ios" | "android" | "web"

    try {
      setSubmitting(true);
      await reportBug({
        title: title.trim(),
        description: description.trim(),
        app_version: appVersion,
        platform,
      });

      Alert.alert("Report a bug", "Your email app has been opened with the bug report.", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);

      setTitle("");
      setDescription("");
    } catch (e) {
      console.log("Report bug error", e);
      Alert.alert(
        "Report a bug",
        "Could not send the report. Please try again later."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll>
      <View style={styles.container}>
        <Text style={[styles.title, { color: settings.titleColor }]}>
          Report a bug
        </Text>

        <Text style={[styles.label, { color: settings.textColor }]}>
          Short title
        </Text>
        <TextInput
          style={[
            styles.input,
            { color: settings.textColor, borderColor: "#D1D5DB" },
          ]}
          value={title}
          onChangeText={setTitle}
          placeholder="E.g. Crash when adding a birthday"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={[styles.label, { color: settings.textColor }]}>
          What happened?
        </Text>
        <TextInput
          style={[
            styles.textArea,
            { color: settings.textColor, borderColor: "#D1D5DB" },
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder="Steps to reproduce, what you expected, etc."
          placeholderTextColor="#9CA3AF"
          multiline
          textAlignVertical="top"
        />

        <View style={styles.button}>
          <Button
            title={submitting ? "Sending..." : "Send bug report"}
            onPress={onSubmit}
            color={settings.buttonColor}
            disabled={submitting}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    minHeight: 120,
  },
  button: {
    marginTop: 16,
  },
});
