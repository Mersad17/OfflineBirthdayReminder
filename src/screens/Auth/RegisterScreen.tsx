// src/screens/Auth/RegisterScreen.tsx
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
  firstName?: string;
  email?: string;
  password?: string;
  password2?: string;
  general?: string;
};

export default function RegisterScreen() {
  const { register, loading } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function onSubmit() {
    const trimmedEmail = email.trim().toLowerCase();
    const newErrors: FieldErrors = {};

    // client-side validation
    if (!firstName.trim()) {
      newErrors.firstName = "Please enter your first name.";
    }

    if (!trimmedEmail) {
      newErrors.email = "Please enter your email.";
    } else if (!trimmedEmail.includes("@")) {
      newErrors.email = "Please enter a valid email.";
    }

    if (!password) {
      newErrors.password = "Please enter a password.";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    if (!password2) {
      newErrors.password2 = "Please repeat your password.";
    } else if (password && password2 && password !== password2) {
      newErrors.password2 = "Passwords do not match.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({}); // clear previous errors

    try {
      await register(
        trimmedEmail,
        password,
        firstName.trim(),
        lastName.trim(),
        "Europe/Paris"
      );
    } catch (e: any) {
      console.log("Register error", e?.response?.data || e);
  
      const apiErrors = e?.response?.data;
      const newErrors: FieldErrors = {};
  
      if (apiErrors) {
        // Email errors from backend
        if (apiErrors.email) {
          const msg = Array.isArray(apiErrors.email)
            ? apiErrors.email[0]
            : String(apiErrors.email);
          newErrors.email = msg;
        }
  
        // Password errors (if your serializer ever sends them)
        if (apiErrors.password) {
          const msg = Array.isArray(apiErrors.password)
            ? apiErrors.password[0]
            : String(apiErrors.password);
          newErrors.password = msg;
        }
  
        // Non-field errors
        if (apiErrors.non_field_errors) {
          const msg = Array.isArray(apiErrors.non_field_errors)
            ? apiErrors.non_field_errors[0]
            : String(apiErrors.non_field_errors);
          newErrors.general = msg;
        }
      }
  
      if (Object.keys(newErrors).length === 0) {
        // fallback if we didn't recognize the structure
        newErrors.general =
          "Register failed. Please check your details or try again.";
      }
  
      setErrors(newErrors);
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
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>
              Sign up to start saving birthdays and reminders.
            </Text>

            {/* First name */}
            <Text style={styles.label}>First name</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                if (errors.firstName) {
                  setErrors((prev) => ({ ...prev, firstName: undefined }));
                }
              }}
              placeholder="First name"
              placeholderTextColor="#9CA3AF"
            />
            {errors.firstName ? (
              <Text style={styles.errorText}>{errors.firstName}</Text>
            ) : null}

            {/* Last name */}
            <Text style={styles.label}>Last name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name (optional)"
              placeholderTextColor="#9CA3AF"
            />

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
                placeholder="At least 8 characters"
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

            {/* Confirm password */}
            <Text style={styles.label}>Confirm password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                secureTextEntry={!showPassword2}
                value={password2}
                onChangeText={(text) => {
                  setPassword2(text);
                  if (errors.password2) {
                    setErrors((prev) => ({ ...prev, password2: undefined }));
                  }
                }}
                placeholder="Repeat your password"
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity
                onPress={() => setShowPassword2((prev) => !prev)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword2 ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
            {errors.password2 ? (
              <Text style={styles.errorText}>{errors.password2}</Text>
            ) : null}

            {/* General error */}
            {errors.general ? (
              <Text style={[styles.errorText, { marginTop: 8 }]}>
                {errors.general}
              </Text>
            ) : null}

            <View style={styles.button}>
              <Button
                title={loading ? "Creating..." : "Create account"}
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
    paddingBottom: 24,
    justifyContent: "flex-start",
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
