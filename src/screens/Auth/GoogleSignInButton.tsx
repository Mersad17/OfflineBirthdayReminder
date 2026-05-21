import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../auth/AuthContext";
import { getGoogleIdToken } from "../../auth/googleAuth";

export function GoogleSignInButton() {
  const { loginWithGoogle, loading } = useAuth();
  const { t } = useTranslation("auth");
  const [error, setError] = useState<string | null>(null);

  async function onGooglePress() {
    try {
      setError(null);

      const idToken = await getGoogleIdToken();

      await loginWithGoogle(idToken);
    } catch (e: any) {
      console.log("Google login error", e?.response?.data || e);

      setError(
        e?.response?.data?.detail ||
          e?.message ||
          t("auth.google.loginFailed")
      );
    }
  }

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.88}
        disabled={loading}
        onPress={onGooglePress}
        style={[styles.button, loading && styles.disabled]}
      >
        {loading ? (
          <ActivityIndicator color="#1F1F1F" />
        ) : (
          <>
            <Image
              source={require("../../../assets/google-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.text}>
              {t("auth.google.continue")}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#FFFFFF",
    borderColor: "#DADCE0",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 2,
  },

  disabled: {
    opacity: 0.6,
  },

  logo: {
    width: 20,
    height: 20,
  },

  text: {
    color: "#1F1F1F",
    fontSize: 15,
    fontWeight: "800",
  },

  error: {
    marginTop: 6,
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "700",
  },
});