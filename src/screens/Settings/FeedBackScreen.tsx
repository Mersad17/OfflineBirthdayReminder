// src/screens/settings/FeedbackScreen.tsx
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
import { sendFeedback } from "../../support/api";

type Props = NativeStackScreenProps<SettingsStackParamsList, "Feedback">;

export default function FeedbackScreen({ navigation }: Props) {
  const { settings } = useAppearance();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    if (!message.trim()) {
      Alert.alert("Feedback", "Please write some feedback first.");
      return;
    }

    const appVersion =
      Constants.expoConfig?.version ??
      Constants.nativeApplicationVersion ??
      "unknown";
    const platform = Platform.OS; // "ios" | "android" | "web"

    try {
      setSubmitting(true);
      await sendFeedback({
        message: message.trim(),
        app_version: appVersion,
        platform,
      });

      Alert.alert("Feedback", "Your email app has been opened with your feedback.", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);

      setMessage("");
    } catch (e) {
      console.log("Feedback error", e);
      Alert.alert(
        "Feedback",
        "Could not send feedback. Please try again later."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll>
      <View style={styles.container}>
        <Text style={[styles.title, { color: settings.titleColor }]}>
          Send feedback
        </Text>
        <Text style={[styles.subtitle, { color: settings.textColor }]}>
          Tell us what you like, what’s confusing, or what you’d like to see
          next.
        </Text>

        <TextInput
          style={[
            styles.textArea,
            { color: settings.textColor, borderColor: "#D1D5DB" },
          ]}
          value={message}
          onChangeText={setMessage}
          placeholder="Your feedback..."
          placeholderTextColor="#9CA3AF"
          multiline
          textAlignVertical="top"
        />

        <View style={styles.button}>
          <Button
            title={submitting ? "Sending..." : "Send feedback"}
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
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    minHeight: 140,
  },
  button: {
    marginTop: 16,
  },
});
