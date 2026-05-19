// src/screens/Auth/LoginScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { GoogleSignInButton } from "./GoogleSignInButton";

type FieldErrors = {
  email?: string;
  password?: string;
  general?: string;
};

export default function LoginScreen({ navigation }: any) {
  const { settings } = useAppearance();
  const { login, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const { width } = Dimensions.get("window");
  const CARD_W = Math.min(420, Math.max(300, width - 36));

  // subtle float anim
  const floatY = useRef(new (require("react-native").Animated).Value(0)).current;

  useEffect(() => {
    const Animated = require("react-native").Animated as typeof import("react-native").Animated;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -6, duration: 1600, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatY]);

  const primary = settings.primaryColor;
  const text = settings.textColor;
  const title = settings.titleColor;
  const card = settings.cardColor;
  const btn = settings.buttonColor;
  const btnText = settings.buttonTextColor;

  const canSubmit = useMemo(() => email.trim().length > 0 && password.length > 0, [email, password]);

  async function onSubmit() {
    const trimmedEmail = email.trim().toLowerCase();
    const newErrors: FieldErrors = {};

    // client-side validation
    if (!trimmedEmail) newErrors.email = "Please enter your email.";
    else if (!trimmedEmail.includes("@")) newErrors.email = "Please enter a valid email.";
    if (!password) newErrors.password = "Please enter your password.";

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
        if (apiErrors.detail) apiFieldErrors.general = String(apiErrors.detail);

        if (apiErrors.non_field_errors) {
          const msg = Array.isArray(apiErrors.non_field_errors)
            ? apiErrors.non_field_errors[0]
            : String(apiErrors.non_field_errors);
          apiFieldErrors.general = msg;
        }
      }

      if (!apiFieldErrors.general) {
        apiFieldErrors.general = "Login failed. Please check your credentials and try again.";
      }

      setErrors(apiFieldErrors);
    }
  }

  const keyboardVerticalOffset = Platform.OS === "ios" ? 40 : 0;

  return (
    <Screen>
      <StatusBar barStyle={Platform.OS === "ios" ? "dark-content" : "default"} />

      <KeyboardAvoidingView
        behavior="position"
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* background */}
          <LinearGradient
            colors={[primary + "18", "#00000000", primary + "10"]}
            start={{ x: 0.1, y: 0.0 }}
            end={{ x: 0.9, y: 1.0 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={{ flex: 1, justifyContent: "center" }}>
              <LinearGradient
                colors={[primary + "24", card]}
                start={{ x: 0.0, y: 0.0 }}
                end={{ x: 1.0, y: 1.0 }}
                style={[
                  styles.card,
                  {
                    width: CARD_W,
                    backgroundColor: card,
                    borderColor: primary + "40",
                  },
                ]}
              >
                <View style={styles.topRow}>
                  <View style={[styles.badge, { backgroundColor: primary + "1A", borderColor: primary + "33" }]}>
                    <Text style={[styles.badgeText, { color: primary }]}>Birthdayly</Text>
                  </View>

                </View>

                <Text style={[styles.title, { color: title }]}>
                  Welcome <Text style={{ color: primary }}>back</Text>
                </Text>
                <Text style={[styles.subtitle, { color: text }]}>
                  Log in to see birthdays & talk reminders.
                </Text>

                {/* Email */}
                <View style={{ marginTop: 14 }}>
                  <View style={[styles.inputWrap, { borderColor: primary + "22" }]}>
                    <Text style={[styles.inputLabel, { color: text + "AA" }]}>Email</Text>
                    <TextInput
                      style={[styles.input, { color: title }]}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      value={email}
                      onChangeText={(t) => {
                        setEmail(t);
                        if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                        if (errors.general) setErrors((prev) => ({ ...prev, general: undefined }));
                      }}
                      placeholder="you@example.com"
                      placeholderTextColor={text + "66"}
                    />
                  </View>
                  {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                </View>

                {/* Password */}
                <View style={{ marginTop: 10 }}>
                  <View style={[styles.inputWrap, { borderColor: primary + "22" }]}>
                    <View style={styles.pwdRow}>
                      <Text style={[styles.inputLabel, { color: text + "AA" }]}>Password</Text>

                      <TouchableOpacity
                        onPress={() => setShowPassword((prev) => !prev)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={[styles.pwdToggle, { backgroundColor: primary + "12" }]}
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name={showPassword ? "eye-off-outline" : "eye-outline"}
                          size={16}
                          color={primary}
                        />
                        <Text style={{ color: primary, fontWeight: "900", fontSize: 12, marginLeft: 6 }}>
                          {showPassword ? "Hide" : "Show"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={[styles.input, { color: title }]}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={(t) => {
                        setPassword(t);
                        if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                        if (errors.general) setErrors((prev) => ({ ...prev, general: undefined }));
                      }}
                      placeholder="••••••••"
                      placeholderTextColor={text + "66"}
                    />
                  </View>
                  {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                </View>

                {/* Backend/general error */}
                {errors.general ? <Text style={[styles.errorText, { marginTop: 10 }]}>{errors.general}</Text> : null}

                {/* Links */}
                <View style={styles.linksRow}>
                  <TouchableOpacity onPress={() => navigation?.navigate?.("Register")} activeOpacity={0.85}>
                    <Text style={[styles.link, { color: primary }]}>Create account</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => navigation?.navigate?.("ForgotPassword")} activeOpacity={0.85}>
                    <Text style={[styles.link, { color: primary }]}>Forgot?</Text>
                  </TouchableOpacity>
                </View>

                {/* Buttons */}
              <View style={{ marginTop: 12, gap: 10 }}>
                <GoogleSignInButton
                  backgroundColor={card}
                  textColor={title}
                  borderColor={primary + "33"}
                />

                <View style={styles.dividerRow}>
                  <View style={[styles.dividerLine, { backgroundColor: primary + "22" }]} />
                  <Text style={[styles.dividerText, { color: text + "99" }]}>or</Text>
                  <View style={[styles.dividerLine, { backgroundColor: primary + "22" }]} />
                </View>

                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={onSubmit}
                  disabled={!canSubmit || loading}
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: btn },
                    (!canSubmit || loading) && { opacity: 0.6 },
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color={btnText} />
                  ) : (
                    <Text style={[styles.primaryBtnText, { color: btnText }]}>Log in</Text>
                  )}
                </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => navigation?.goBack?.()}
                    style={[styles.secondaryBtn, { borderColor: primary + "55", backgroundColor: primary + "10" }]}
                  >
                    <Text style={[styles.secondaryBtnText, { color: primary }]}>Back</Text>
                  </TouchableOpacity>

                  <Text style={[styles.footer, { color: text + "AA" }]}>Secure login • Clean reminders</Text>
                </View>
              </LinearGradient>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 18,
  },

  card: {
    borderRadius: 26,
    borderWidth: 2,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 6,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
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

  inputWrap: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  input: {
    fontSize: 15.5,
    fontWeight: "700",
    paddingVertical: 6,
  },

  pwdRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  pwdToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  linksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  link: {
    fontWeight: "900",
    fontSize: 13,
  },

  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 5,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryBtn: {
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "900",
  },

  footer: {
    marginTop: 4,
    fontSize: 11.5,
    textAlign: "center",
    fontWeight: "600",
  },

  errorText: {
    color: "#DC2626",
    fontSize: 13,
    marginTop: 6,
    fontWeight: "700",
  },
  dividerRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
},

dividerLine: {
  flex: 1,
  height: 1,
},

dividerText: {
  fontSize: 12,
  fontWeight: "800",
},
});
