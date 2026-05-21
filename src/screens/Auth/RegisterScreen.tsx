// src/screens/Auth/RegisterScreen.tsx
import React, { useMemo, useState } from "react";

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { useAuth } from "../../auth/AuthContext";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { useTranslation } from "react-i18next";

type FieldErrors = {
  firstName?: string;
  email?: string;
  password?: string;
  password2?: string;
  general?: string;
};

export default function RegisterScreen({ navigation }: any) {
  const { settings } = useAppearance();
  const { register, loading } = useAuth() as any;
  const { t } = useTranslation(["auth", "common"]);
  const primary = settings.primaryColor;
  const text = settings.textColor;
  const title = settings.titleColor;
  const card = settings.cardColor;
  const btn = settings.buttonColor;
  const btnText = settings.buttonTextColor;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const keyboardVerticalOffset = Platform.OS === "ios" ? 40 : 0;

  const canSubmit = useMemo(() => {
    return (
      firstName.trim().length > 0 &&
      email.trim().length > 0 &&
      password.length > 0 &&
      password2.length > 0 &&
      !loading
    );
  }, [firstName, email, password, password2, loading]);

  function clearError(key: keyof FieldErrors) {
    if (!errors[key]) return;
    setErrors((p) => ({ ...p, [key]: undefined }));
  }

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    const em = email.trim().toLowerCase();

    if (!firstName.trim()) e.firstName = t("auth:auth.register.firstNameRequired");;
    if (!em) e.email = t("auth:auth.register.emailRequired");
    else if (!em.includes("@")) e.email = t("auth:auth.register.emailInvalid");

    if (!password) e.password = t("auth:auth.register.passwordRequired");
    else if (password.length < 8) e.password = t("auth:auth.register.passwordMin");

    if (!password2) e.password2 = t("auth:auth.register.password2Required");
    else if (password2 !== password) e.password2 = t("auth:auth.register.passwordsDoNotMatch");

    return e;
  }

  async function onSubmit() {
    const newErrors = validate();
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const em = email.trim().toLowerCase();

    try {
      await register(em, password, firstName.trim(), lastName.trim(), "Europe/Paris");

      navigation.navigate("Login", {
        message: t("auth:auth.register.checkEmail"),
      });
    } catch (err: any) {
      const api = err?.response?.data;
      const e: FieldErrors = {};

      if (api) {
        if (api.detail) e.general = String(api.detail);

        if (api.first_name) e.firstName = Array.isArray(api.first_name) ? api.first_name[0] : String(api.first_name);
        if (api.email) e.email = Array.isArray(api.email) ? api.email[0] : String(api.email);
        if (api.password) e.password = Array.isArray(api.password) ? api.password[0] : String(api.password);

        if (api.non_field_errors) {
          e.general = Array.isArray(api.non_field_errors) ? api.non_field_errors[0] : String(api.non_field_errors);
        }
      }

      if (!e.general && Object.keys(e).length === 0) {
        e.general = t("auth:auth.register.registerFailed");
      }

      setErrors(e);
    }
  }

  return (
    <Screen>
      <StatusBar barStyle={Platform.OS === "ios" ? "dark-content" : "default"} />

      <KeyboardAvoidingView
        behavior="position"
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Background gradient */}
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
              style={[styles.heroCard, { backgroundColor: card, borderColor: primary + "40" }]}
            >
              <View style={styles.topRow}>
                <View style={[styles.badge, { backgroundColor: primary + "1A", borderColor: primary + "33" }]}>
                  <Text style={[styles.badgeText, { color: primary }]}>{t("auth:auth.register.badge")}</Text>
                </View>

                <TouchableOpacity onPress={() => navigation.navigate("Login")} activeOpacity={0.85}>
                  <Text style={{ color: primary, fontWeight: "900" }}>{t("auth:auth.register.login")}</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.title, { color: title }]}>
                {t("auth:auth.register.title")} <Text style={{ color: primary }}>🎉</Text>
              </Text>
              <Text style={[styles.subtitle, { color: text }]}>
                {t("auth:auth.register.subtitle")}
              </Text>

              <View style={{ marginTop: 10, gap: 10 }}>
              <GoogleSignInButton
              />

              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: primary + "22" }]} />
                <Text style={[styles.dividerText, { color: text + "99" }]}>
                  {t("auth:auth.register.orCreateWithEmail")}
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: primary + "22" }]} />
              </View>

                {/* First name */}
                <View>
                  <Text style={[styles.label, { color: text + "CC" }]}>{t("auth:auth.register.firstName")}</Text>
                  <TextInput
                    value={firstName}
                    onChangeText={(v) => {
                      setFirstName(v);
                      clearError("firstName");
                      clearError("general");
                    }}
                    placeholder={t("auth:auth.register.firstNamePlaceholder")}
                    placeholderTextColor={text + "66"}
                    style={[styles.input, { color: title, borderColor: primary + "22", backgroundColor: card }]}
                  />
                  {!!errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                </View>

                {/* Last name */}
                <View>
                  <Text style={[styles.label, { color: text + "CC" }]}>{t("auth:auth.register.lastName")}</Text>
                  <TextInput
                    value={lastName}
                    onChangeText={(v) => {
                      setLastName(v);
                      clearError("general");
                    }}
                    placeholder={t("auth:auth.register.lastNameOptional")}
                    placeholderTextColor={text + "66"}
                    style={[styles.input, { color: title, borderColor: primary + "22", backgroundColor: card }]}
                  />
                </View>

                {/* Email */}
                <View>
                  <Text style={[styles.label, { color: text + "CC" }]}>{t("auth:auth.register.email")}</Text>
                  <TextInput
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      clearError("email");
                      clearError("general");
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder={t("auth:auth.register.emailPlaceholder")}
                    placeholderTextColor={text + "66"}
                    style={[styles.input, { color: title, borderColor: primary + "22", backgroundColor: card }]}
                  />
                  {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                {/* Password */}
                <View>
                  <Text style={[styles.label, { color: text + "CC" }]}>{t("auth:auth.register.password")}</Text>
                  <View style={[styles.inputRow, { borderColor: primary + "22", backgroundColor: card }]}>
                    <TextInput
                      value={password}
                      onChangeText={(v) => {
                        setPassword(v);
                        clearError("password");
                        clearError("general");
                      }}
                      secureTextEntry={!showPassword}
                      placeholder={t("auth:auth.register.passwordPlaceholder")}
                      placeholderTextColor={text + "66"}
                      style={[styles.inputInner, { color: title }]}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword((p) => !p)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={text + "99"}
                      />
                    </TouchableOpacity>
                  </View>
                  {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                </View>

                {/* Confirm password */}
                <View>
                  <Text style={[styles.label, { color: text + "CC" }]}>{t("auth:auth.register.confirmPassword")}</Text>
                  <View style={[styles.inputRow, { borderColor: primary + "22", backgroundColor: card }]}>
                    <TextInput
                      value={password2}
                      onChangeText={(v) => {
                        setPassword2(v);
                        clearError("password2");
                        clearError("general");
                      }}
                      secureTextEntry={!showPassword2}
                      placeholder={t("auth:auth.register.confirmPasswordPlaceholder")}
                      placeholderTextColor={text + "66"}
                      style={[styles.inputInner, { color: title }]}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword2((p) => !p)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={showPassword2 ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={text + "99"}
                      />
                    </TouchableOpacity>
                  </View>
                  {!!errors.password2 && <Text style={styles.errorText}>{errors.password2}</Text>}
                </View>

                {!!errors.general && <Text style={[styles.errorText, { marginTop: 2 }]}>{errors.general}</Text>}

                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={onSubmit}
                  disabled={!canSubmit}
                  style={[styles.primaryBtn, { backgroundColor: btn }, !canSubmit && { opacity: 0.6 }]}
                >
                  <Text style={[styles.primaryBtnText, { color: btnText }]}>
                    {loading ? t("auth:auth.register.creating") : t("auth:auth.register.button")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate("Login")}
                  style={[styles.secondaryBtn, { borderColor: primary + "55", backgroundColor: primary + "10" }]}
                >
                  <Text style={[styles.secondaryBtnText, { color: primary }]}>
                    {t("auth:auth.register.alreadyHaveAccount")}
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <Text style={[styles.footer, { color: text + "AA" }]}>
              {t("auth:auth.register.footer")}
            </Text>
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
    gap: 12,
  },

  heroCard: {
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

  title: {
    fontSize: 24,
    fontWeight: "900",
    marginTop: 2,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
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
  },

  inputRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputInner: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 2,
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
  errorText: {
    marginTop: 6,
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "700",
  },

  primaryBtn: {
    marginTop: 6,
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "900",
  },

  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "900",
  },

  footer: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
});
