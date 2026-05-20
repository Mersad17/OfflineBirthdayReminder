import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { verifyEmail } from "../../auth/api";

export default function VerifyEmailScreen({ navigation, route }: any) {
  const { settings } = useAppearance();

  const primary = settings.primaryColor;
  const text = settings.textColor;
  const title = settings.titleColor;
  const card = settings.cardColor;
  const btn = settings.buttonColor;
  const btnText = settings.buttonTextColor;

  const uid = route?.params?.uid;
  const token = route?.params?.token;

  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function submitVerification() {
      if (!uid || !token) {
        setErrorMessage("Invalid verification link.");
        setLoading(false);
        return;
      }

      try {
        const res = await verifyEmail({
          uid,
          token,
        });

        setSuccessMessage(res.detail || "Email verified successfully.");
      } catch (err: any) {
        console.log("Verify email error", err?.response?.data || err);

        setErrorMessage(
          err?.response?.data?.detail ||
            "Could not verify email. The link may be expired."
        );
      } finally {
        setLoading(false);
      }
    }

    submitVerification();
  }, [uid, token]);

  return (
    <Screen>
      <StatusBar barStyle={Platform.OS === "ios" ? "dark-content" : "default"} />

      <ScrollView contentContainerStyle={styles.scroll}>
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
            <View style={[styles.iconCircle, { backgroundColor: primary + "14" }]}>
              {loading ? (
                <ActivityIndicator color={primary} />
              ) : successMessage ? (
                <Ionicons name="checkmark-circle-outline" size={42} color={primary} />
              ) : (
                <Ionicons name="alert-circle-outline" size={42} color="#DC2626" />
              )}
            </View>

            <Text style={[styles.title, { color: title }]}>
              {loading
                ? "Verifying email..."
                : successMessage
                ? "Email verified"
                : "Verification failed"}
            </Text>

            <Text style={[styles.subtitle, { color: text }]}>
              {loading
                ? "Please wait while we verify your account."
                : successMessage || errorMessage}
            </Text>

            {!loading && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate("Login")}
                style={[styles.primaryBtn, { backgroundColor: btn }]}
              >
                <Text style={[styles.primaryBtnText, { color: btnText }]}>
                  Back to login
                </Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>
      </ScrollView>
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
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 6,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: "600",
    opacity: 0.92,
    textAlign: "center",
  },
  primaryBtn: {
    marginTop: 18,
    width: "100%",
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "900",
  },
});