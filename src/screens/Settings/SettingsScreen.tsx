import React from "react";
import { View, Text, Button, Alert } from "react-native";
import { sendTestPush } from "../../notifications/api";
import { useAuth } from "../../auth/AuthContext";

export default function SettingsScreen() {
  const { logout } = useAuth();

  async function onTestPush() {
    try {
      const r = await sendTestPush();
      Alert.alert("Push", r.detail || "Sent!");
    } catch (e: any) {
      Alert.alert("Push", "Failed to send test push.");
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 8 }}>Settings</Text>
      <Button title="Send test notification" onPress={onTestPush} />
      <View style={{ height: 16 }} />
      <Button title="Logout" onPress={logout} />
    </View>
  );
}
