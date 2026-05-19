import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/AuthContext";
import { getGoogleIdToken } from "../../auth/googleAuth";



type Props = {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
};

export function GoogleSignInButton({
  backgroundColor = "#FFFFFF",
  textColor = "#111827",
  borderColor = "#E5E7EB",
}: Props) {
  const { loginWithGoogle, loading } = useAuth();
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
          "Google login failed. Please try again."
      );
    }
  }

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.88}
        disabled={loading}
        onPress={onGooglePress}
        style={[
          styles.button,
          {
            backgroundColor,
            borderColor,
            opacity: loading ? 0.6 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color={textColor} />
            <Text style={[styles.text, { color: textColor }]}>
              Continue with Google
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
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  text: {
    fontSize: 15,
    fontWeight: "900",
  },
  error: {
    marginTop: 6,
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "700",
  },
});