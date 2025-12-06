import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SettingsStackParamsList } from "../../navigation/SettingsStack";
import { useAuth } from "../../auth/AuthContext";
import { useAppearance } from "../../appearance/AppearanceContext";
import { updateProfile } from "../../auth/api"; 
import { Screen } from "../../components/Screen";

type Props = NativeStackScreenProps<SettingsStackParamsList, "Profile">;

export default function ProfileScreen({}: Props) {
  const { user, refreshUser } = useAuth(); 
  const { settings } = useAppearance();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);

  // load initial values from auth user (adjust fields to match your user)
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName( user.last_name || "");
    }
  }, [user]);

  async function onSave() {
    if (!firstName.trim()) {
      Alert.alert("Profile", "Name cannot be empty.");
      return;
    }

    try {
      setLoading(true);
      // send updated name to backend
      await updateProfile({ first_name: firstName, last_name:lastName });
      // reload user into AuthContext
      await refreshUser();

      Alert.alert("Profile", "Profile updated successfully.");
    } catch (e) {
      console.log("Update profile error", e);
      Alert.alert("Profile", "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  }


  return (
    <Screen scroll>

    <View style={[styles.container]}>
      <Text style={[styles.title, { color: settings.titleColor }]}>
        Manage Profile
      </Text>

      {/* Email (read-only) */}
      <Text style={[styles.label, { color: settings.textColor }]}>Email</Text>
      <View style={styles.readOnlyBox}>
        <Text style={{ color: settings.textColor }}>
          {user?.email || "unknown@example.com"}
        </Text>
      </View>

      {/* Name */}
      <Text style={[styles.label, { color: settings.textColor }]}>First Name</Text>
      <TextInput
        style={[
          styles.input,
          { borderColor: "#D1D5DB", color: settings.textColor },
        ]}
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Your name"
        placeholderTextColor="#9CA3AF"
      />
      <Text style={[styles.label, { color: settings.textColor }]}>Last Name</Text>

      <TextInput
        style={[
          styles.input,
          { borderColor: "#D1D5DB", color: settings.textColor },
        ]}
        value={lastName}
        onChangeText={setLastName}
        placeholder="Last name"
        placeholderTextColor="#9CA3AF"
        />

      <View style={styles.saveButton}>
        <Button
          title={loading ? "Saving..." : "Save changes"}
          onPress={onSave}
          color={settings.buttonColor}
          disabled={loading}
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
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  readOnlyBox: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F3F4F6",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  saveButton: {
    marginTop: 16,
  },
});
