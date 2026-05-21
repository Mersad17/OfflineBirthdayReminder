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
import { resetPassword } from "../../auth/api";
import { useTranslation } from "react-i18next";
type FieldErrors = {
  password?: string;
  password2?: string;
  general?: string;
};

export default function ResetPasswordScreen({ navigation, route }: any) {
  const { t } = useTranslation("auth");
  const { settings } = useAppearance();

  const primary = settings.primaryColor;
  const text = settings.textColor;
  const title = settings.titleColor;
  const card = settings.cardColor;
  const btn = settings.buttonColor;
  const btnText = settings.buttonTextColor;

  const uid = route?.params?.uid;
  const token = route?.params?.token;

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const canSubmit = useMemo(() => {
    return password.length > 0 && password2.length > 0 && !loading;
  }, [password, password2, loading]);

  function validate(): FieldErrors {
    const e: FieldErrors = {};

    if (!uid || !token) {
      e.general = t("auth.resetPassword.invalidLink");
    }

    if (!password) {
      e.password = t("auth.resetPassword.passwordRequired");
    } else if (password.length < 8) {
      e.password = t("auth.resetPassword.passwordMin");
    }

    if (!password2) {
      e.password2 = t("auth.resetPassword.password2Required");
    } else if (password2 !== password) {
      e.password2 = t("auth.resetPassword.passwordsDoNotMatch");
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
      const res = await resetPassword({
        uid,
        token,
        new_password: password,
      });

      setSuccessMessage( t("auth.resetPassword.success"));

      setTimeout(() => {
        navigation.navigate("Login");
      }, 1200);
    } catch (err: any) {
      console.log("Reset password error", err?.response?.data || err);

      const api = err?.response?.data;

      setErrors({
        general: t("auth.resetPassword.failed"),
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
                <Text style={[styles.backText, { color: primary }]}>{t("auth.resetPassword.backToLogin")}</Text>
              </TouchableOpacity>

              <Text style={[styles.title, { color: title }]}>
                {t("auth.resetPassword.titleStart")}{" "}
          <Text style={{ color: primary }}>
            {t("auth.resetPassword.titleHighlight")}
          </Text>
              </Text>

              <Text style={[styles.subtitle, { color: text }]}>
                {t("auth.resetPassword.subtitle")}
              </Text>

              <View style={{ marginTop: 16, gap: 10 }}>
                <View>
                  <Text style={[styles.label, { color: text + "CC" }]}>
                    {t("auth.resetPassword.newPassword")}
                  </Text>

                  <View
                    style={[
                      styles.inputRow,
                      {
                        borderColor: primary + "22",
                        backgroundColor: card,
                      },
                    ]}
                  >
                    <TextInput
                      value={password}
                      onChangeText={(v) => {
                        setPassword(v);
                        if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                        if (errors.general) setErrors((p) => ({ ...p, general: undefined }));
                      }}
                      secureTextEntry={!showPassword}
                      placeholder={t("auth.resetPassword.newPasswordPlaceholder")}
                      placeholderTextColor={text + "66"}
                      style={[styles.inputInner, { color: title }]}
                    />

                    <TouchableOpacity onPress={() => setShowPassword((p) => !p)}>
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={text + "99"}
                      />
                    </TouchableOpacity>
                  </View>

                  {!!errors.password && (
                    <Text style={styles.errorText}>{errors.password}</Text>
                  )}
                </View>

                <View>
                  <Text style={[styles.label, { color: text + "CC" }]}>
                    {t("auth.resetPassword.confirmPassword")}
                  </Text>

                  <View
                    style={[
                      styles.inputRow,
                      {
                        borderColor: primary + "22",
                        backgroundColor: card,
                      },
                    ]}
                  >
                    <TextInput
                      value={password2}
                      onChangeText={(v) => {
                        setPassword2(v);
                        if (errors.password2) setErrors((p) => ({ ...p, password2: undefined }));
                        if (errors.general) setErrors((p) => ({ ...p, general: undefined }));
                      }}
                      secureTextEntry={!showPassword2}
                      placeholder={t("auth.resetPassword.confirmPasswordPlaceholder")}
                      placeholderTextColor={text + "66"}
                      style={[styles.inputInner, { color: title }]}
                    />

                    <TouchableOpacity onPress={() => setShowPassword2((p) => !p)}>
                      <Ionicons
                        name={showPassword2 ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={text + "99"}
                      />
                    </TouchableOpacity>
                  </View>

                  {!!errors.password2 && (
                    <Text style={styles.errorText}>{errors.password2}</Text>
                  )}
                </View>
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
                    {t("auth.resetPassword.button")}
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