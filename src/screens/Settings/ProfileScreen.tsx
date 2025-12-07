import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SettingsStackParamsList } from "../../navigation/SettingsStack";
import { useAuth } from "../../auth/AuthContext";
import { useAppearance } from "../../appearance/AppearanceContext";
import { updateProfile, deleteAccountRequest } from "../../auth/api";
import { Screen } from "../../components/Screen";
import axios from "axios";

type Props = NativeStackScreenProps<SettingsStackParamsList, "Profile">;

export default function ProfileScreen({}: Props) {
  const { user, refreshUser, logout } = useAuth();
  const { settings } = useAppearance();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);

  // delete account state
  const [passwordForDelete, setPasswordForDelete] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
    }
  }, [user]);

  async function onSave() {
    if (!firstName.trim()) {
      Alert.alert("Profile", "Name cannot be empty.");
      return;
    }

    try {
      setLoading(true);
      await updateProfile({ first_name: firstName, last_name: lastName });
      await refreshUser();
      Alert.alert("Profile", "Profile updated successfully.");
    } catch (e) {
      console.log("Update profile error", e);
      Alert.alert("Profile", "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  }

  function confirmDelete() {
    if (!passwordForDelete) {
      setDeleteError("Please enter your password to continue.");
      return;
    }

    Alert.alert(
      "Delete account",
      "This will permanently delete your account and data. This cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: onDeleteAccount,
        },
      ]
    );
  }

 
async function onDeleteAccount() {
  // 1️⃣ Try to delete on backend (password check happens here)
  try {
    setDeleting(true);
    setDeleteError(null);

    await deleteAccountRequest(passwordForDelete);
    // If we reach here, account IS deleted, password was correct
  } catch (e: any) {
    console.log("Delete account error", e);

    let msg = "Failed to delete account. Please check your password and try again.";

    if (axios.isAxiosError(e) && e.response) {
      const data = e.response.data as any;

      if (data?.detail) {
        msg = data.detail;
      } else if (Array.isArray(data?.password) && data.password[0]) {
        msg = data.password[0]; // "Incorrect password."
      }
    }

    setDeleteError(msg);
    Alert.alert("Delete account", msg);
    setDeleting(false);
    return; // 🔑 STOP: don't try logout if delete failed
  }

  // 2️⃣ If delete succeeded, try to logout / clear local state
  try {
    await logout();
  } catch (e) {
    console.log("Logout error after delete", e);
    // You could optionally show a different message here, but
    // at this point the account is gone anyway.
  } finally {
    setDeleting(false);
  }
}
  return (
    <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : undefined}
    keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0} // tweak if you have a header
  >
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

        {/* First name */}
        <Text style={[styles.label, { color: settings.textColor }]}>
          First Name
        </Text>
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

        {/* Last name */}
        <Text style={[styles.label, { color: settings.textColor }]}>
          Last Name
        </Text>
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

        {/* Save changes */}
        <View style={styles.saveButton}>
          <Button
            title={loading ? "Saving..." : "Save changes"}
            onPress={onSave}
            color={settings.buttonColor}
            disabled={loading || deleting}
          />
        </View>

        {/* Danger zone */}
        <View style={styles.dangerZone}>
          <Text style={[styles.dangerTitle, { color: settings.textColor }]}>
            Danger zone
          </Text>
          <Text style={[styles.dangerText, { color: settings.textColor }]}>
            Deleting your account will permanently remove your data. This action
            cannot be undone.
          </Text>

          <Text style={[styles.label, { color: settings.textColor }]}>
            Confirm with password
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: deleteError ? "#DC2626" : "#D1D5DB",
                color: settings.textColor,
              },
            ]}
            value={passwordForDelete}
            onChangeText={(text) => {
              setPasswordForDelete(text);
              if (deleteError) setDeleteError(null);
            }}
            placeholder="Current password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry
            autoCapitalize="none"
          />
          {deleteError && (
            <Text style={styles.errorText}>{deleteError}</Text>
          )}

          <View style={styles.deleteButton}>
            <Button
              title={deleting ? "Deleting..." : "Delete account"}
              onPress={confirmDelete}
              color="#DC2626"
              disabled={deleting || loading}
            />
          </View>
        </View>
      </View>
    </Screen>
    </KeyboardAvoidingView>
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
  dangerZone: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 8,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  dangerText: {
    fontSize: 13,
    opacity: 0.8,
  },
  deleteButton: {
    marginTop: 8,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: "#DC2626",
  },
});
