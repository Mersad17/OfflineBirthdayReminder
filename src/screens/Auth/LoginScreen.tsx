// src/screens/Auth/LoginScreen.tsx
import React, { useState } from "react";
import {
  View,
  TextInput,
  Button,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";

const PRIMARY_COLOR = "#2563EB";

type FieldErrors = {
  email?: string;
  password?: string;
  general?: string;
};

export default function LoginScreen() {
  const { login, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function onSubmit() {
    const trimmedEmail = email.trim().toLowerCase();
    const newErrors: FieldErrors = {};

    // client-side validation
    if (!trimmedEmail) {
      newErrors.email = "Please enter your email.";
    } else if (!trimmedEmail.includes("@")) {
      newErrors.email = "Please enter a valid email.";
    }

    if (!password) {
      newErrors.password = "Please enter your password.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({}); // clear previous errors

    try {
      await login(trimmedEmail, password);
    } catch (e: any) {
      console.log("Login error", e?.response?.data || e);

      const apiErrors = e?.response?.data;
      const apiFieldErrors: FieldErrors = {};

      if (apiErrors) {
        // SimpleJWT / DRF often returns "detail" or "non_field_errors"
        if (apiErrors.detail) {
          apiFieldErrors.general = String(apiErrors.detail);
        }
        if (apiErrors.non_field_errors) {
          const msg = Array.isArray(apiErrors.non_field_errors)
            ? apiErrors.non_field_errors[0]
            : String(apiErrors.non_field_errors);
          apiFieldErrors.general = msg;
        }
      }

      if (!apiFieldErrors.general) {
        apiFieldErrors.general =
          "Login failed. Please check your credentials and try again.";
      }

      setErrors(apiFieldErrors);
    }
  }

  const keyboardVerticalOffset = Platform.OS === "ios" ? 40 : 0;

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior="position"
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Log in to see your saved birthdays and reminders.
            </Text>

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              placeholder="you@example.com"
              placeholderTextColor="#9CA3AF"
            />
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                placeholder="Your password"
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}

            {/* General error from backend */}
            {errors.general ? (
              <Text style={[styles.errorText, { marginTop: 8 }]}>
                {errors.general}
              </Text>
            ) : null}

            <View style={styles.button}>
              <Button
                title={loading ? "Logging in..." : "Login"}
                onPress={onSubmit}
                color={PRIMARY_COLOR}
                disabled={loading}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
    justifyContent: "center",
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    gap: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 12,
    color: "#4B5563",
  },
  label: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
    color: "#111827",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    borderColor: "#D1D5DB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    borderColor: "#D1D5DB",
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#F9FAFB",
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 16,
    color: "#111827",
  },
  button: {
    marginTop: 16,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    marginTop: 2,
  },
});
