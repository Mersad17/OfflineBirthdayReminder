import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SettingsStackParamsList } from "../../navigation/SettingsStack";
import { useAppearance } from "../../appearance/AppearanceContext";
import {
  changePassword,
} from "../../auth/api";
import { ChangePasswordErrorResponse } from "../../auth/types";
import { Screen } from "../../components/Screen";

type Props = NativeStackScreenProps<
  SettingsStackParamsList,
  "PasswordAndSecurity"
>;

export default function PasswordAndSecurityScreen({}: Props) {
  const { settings } = useAppearance();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword1, setNewPassword1] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword1, setShowNewPassword1] = useState(false);
  const [showNewPassword2, setShowNewPassword2] = useState(false);

  function clearErrors() {
    setCurrentPasswordError(null);
    setNewPasswordError(null);
    setFormError(null);
  }

  async function onChangePassword() {
    clearErrors();

    if (!currentPassword || !newPassword1 || !newPassword2) {
      setFormError("Please fill in all fields.");
      Alert.alert("Password", "Please fill in all fields.");
      return;
    }

    if (newPassword1 !== newPassword2) {
      setNewPasswordError("New passwords do not match.");
      Alert.alert("Password", "New passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword1,
      });

      Alert.alert("Password", "Password changed successfully.");
      setCurrentPassword("");
      setNewPassword1("");
      setNewPassword2("");
    } catch (err) {
      const errorData = err as ChangePasswordErrorResponse;
      console.log("Change password error", errorData);

      if (errorData.current_password?.length) {
        setCurrentPasswordError(errorData.current_password.join(" "));
      }

      if (errorData.new_password?.length) {
        setNewPasswordError(errorData.new_password.join(" "));
      }

      const nonField =
        errorData.non_field_errors?.[0] ||
        errorData.detail ||
        null;

      if (nonField) {
        setFormError(nonField);
        Alert.alert("Password", nonField);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
    <View style={styles.container}>
      <Text style={[styles.title, { color: settings.titleColor }]}>
        Password & Security
      </Text>

      {/* Current password */}
      <Text style={[styles.label, { color: settings.textColor }]}>
        Current password
      </Text>
      <View
        style={[
          styles.passwordRow,
          { borderColor: currentPasswordError ? "#EF4444" : "#D1D5DB" },
        ]}
      >
        <TextInput
          style={[styles.passwordInput, { color: settings.textColor }]}
          value={currentPassword}
          onChangeText={(text) => {
            setCurrentPassword(text);
            if (currentPasswordError) setCurrentPasswordError(null);
          }}
          placeholder="Current password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!showCurrentPassword}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          onPress={() => setShowCurrentPassword((prev) => !prev)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={showCurrentPassword ? "eye" : "eye-off"}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>
      {currentPasswordError && (
        <Text style={styles.errorText}>{currentPasswordError}</Text>
      )}

      {/* New password */}
      <Text style={[styles.label, { color: settings.textColor }]}>
        New password
      </Text>
      <View
        style={[
          styles.passwordRow,
          { borderColor: newPasswordError ? "#EF4444" : "#D1D5DB" },
        ]}
      >
        <TextInput
          style={[styles.passwordInput, { color: settings.textColor }]}
          value={newPassword1}
          onChangeText={(text) => {
            setNewPassword1(text);
            if (newPasswordError) setNewPasswordError(null);
          }}
          placeholder="New password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!showNewPassword1}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          onPress={() => setShowNewPassword1((prev) => !prev)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={showNewPassword1 ? "eye" : "eye-off"}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>

      {/* Confirm new password */}
      <Text style={[styles.label, { color: settings.textColor }]}>
        Confirm new password
      </Text>
      <View
        style={[
          styles.passwordRow,
          { borderColor: newPasswordError ? "#EF4444" : "#D1D5DB" },
        ]}
      >
        <TextInput
          style={[styles.passwordInput, { color: settings.textColor }]}
          value={newPassword2}
          onChangeText={(text) => {
            setNewPassword2(text);
            if (newPasswordError) setNewPasswordError(null);
          }}
          placeholder="Confirm new password"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={!showNewPassword2}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          onPress={() => setShowNewPassword2((prev) => !prev)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={showNewPassword2 ? "eye" : "eye-off"}
            size={20}
            color="#6B7280"
          />
        </TouchableOpacity>
      </View>
      {newPasswordError && (
        <Text style={styles.errorText}>{newPasswordError}</Text>
      )}

      {formError && (
        <Text style={[styles.errorText, { marginTop: 4 }]}>{formError}</Text>
      )}

      <View style={styles.saveButton}>
        <Button
          title={loading ? "Saving..." : "Change password"}
          onPress={onChangePassword}
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
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
  },
  saveButton: {
    marginTop: 16,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },
});
