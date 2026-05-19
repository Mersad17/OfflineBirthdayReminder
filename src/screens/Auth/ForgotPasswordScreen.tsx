import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { forgotPassword } from "../../auth/api";

type FieldErrors = {
  email?: string;
  general?: string;
};

export default function ForgotPasswordScreen({ navigation }: any) {
  const { settings } = useAppearance();

  const primary = settings.primaryColor;
  const text = settings.textColor;
  const title = settings.titleColor;
  const card = settings.cardColor;
  const btn = settings.buttonColor;
  const btnText = settings.buttonTextColor;

  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && !loading;
  }, [email, loading]);

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    const em = email.trim().toLowerCase();

    if (!em) {
      e.email = "Please enter your email.";
    } else if (!em.includes("@")) {
      e.email = "Please enter a valid email.";
    }

    return e;
  }

  async function onSubmit() {
    const validationErrors = validate();

    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setSuccessMessage("");
    setLoading(true);

    try {
      const res = await forgotPassword({
        email: email.trim().toLowerCase(),
      });

      setSuccessMessage(
        res.detail || "If an account exists, a reset link has been sent."
      );
    } catch (err: any) {
      console.log("Forgot password error", err?.response?.data || err);

      setErrors({
        general:
          err?.response?.data?.detail ||
          "Could not send reset email. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <StatusBar barStyle={Platform.OS === "ios" ? "dark-content" : "default"} />

      <KeyboardAvoidingView
        behavior="position"
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <LinearGradient
            colors={[primary + "18", "#00000000", primary + "10"]}
            start={{ x: 0.1, y: 0.0 }}
            end={{ x: 0.9, y: 1.0 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.center}>
            <LinearGradient
              colors={[primary + "24", card]}
              start={{ x: 0.0, y: 0.0 }}
              end={{ x: 1.0, y: 1.0 }}
              style={[
                styles.card,
                {
                  backgroundColor: card,
                  borderColor: primary + "40",
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => navigation.navigate("Login")}
                activeOpacity={0.85}
                style={[styles.backBtn, { backgroundColor: primary + "12" }]}
              >
                <Ionicons name="arrow-back-outline" size={18} color={primary} />
                <Text style={[styles.backText, { color: primary }]}>Back to login</Text>
              </TouchableOpacity>

              <Text style={[styles.title, { color: title }]}>
                Forgot <Text style={{ color: primary }}>password?</Text>
              </Text>

              <Text style={[styles.subtitle, { color: text }]}>
                Enter your email and we will send you a link to reset your password.
              </Text>

              <View style={{ marginTop: 16 }}>
                <Text style={[styles.label, { color: text + "CC" }]}>Email</Text>

                <TextInput
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                    if (errors.general) setErrors((p) => ({ ...p, general: undefined }));
                    if (successMessage) setSuccessMessage("");
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor={text + "66"}
                  style={[
                    styles.input,
                    {
                      color: title,
                      borderColor: primary + "22",
                      backgroundColor: card,
                    },
                  ]}
                />

                {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              {!!errors.general && (
                <Text style={[styles.errorText, { marginTop: 10 }]}>
                  {errors.general}
                </Text>
              )}

              {!!successMessage && (
                <Text style={[styles.successText, { marginTop: 10 }]}>
                  {successMessage}
                </Text>
              )}

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={onSubmit}
                disabled={!canSubmit}
                style={[
                  styles.primaryBtn,
                  { backgroundColor: btn },
                  !canSubmit && { opacity: 0.6 },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={btnText} />
                ) : (
                  <Text style={[styles.primaryBtnText, { color: btnText }]}>
                    Send reset link
                  </Text>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 34,
    paddingBottom: 28,
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 430,
    borderRadius: 26,
    borderWidth: 2,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 6,
  },
  backBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 14,
  },
  backText: {
    fontSize: 12,
    fontWeight: "900",
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: "600",
    opacity: 0.92,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    fontWeight: "700",
  },
  primaryBtn: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "900",
  },
  errorText: {
    marginTop: 6,
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "700",
  },
  successText: {
    fontSize: 13,
    color: "#16A34A",
    fontWeight: "800",
    lineHeight: 18,
  },
});