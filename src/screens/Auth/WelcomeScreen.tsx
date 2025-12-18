// src/screens/Auth/WelcomeScreen.tsx
import React, { useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";

export default function WelcomeScreen({ navigation }: any) {
  const { settings } = useAppearance();

  const { width } = Dimensions.get("window");
  const HERO_SIZE = Math.min(360, Math.max(280, width - 48));

  // Subtle floating animation for the hero card
  const floatY = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -6, duration: 1600, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatY]);

  const featureCards = useMemo(
    () => [
      { emoji: "🎂", title: "Birthday reminders", desc: "Get notified before it’s too late." },
      { emoji: "🗓️", title: "Events & notes", desc: "Add custom events, save context, stay thoughtful." },
      { emoji: "💬", title: "Talk cadence", desc: "Set “talk every X days” and keep relationships warm." },
    ],
    []
  );

  const primary = settings.primaryColor;
  const text = settings.textColor;
  const title = settings.titleColor;
  const card = settings.cardColor;
  const btn = settings.buttonColor;
  const btnText = settings.buttonTextColor;

  return (
    <Screen>
      <StatusBar barStyle={Platform.OS === "ios" ? "dark-content" : "default"} />

      <View style={styles.container}>
        {/* Background gradient */}
        <LinearGradient
          colors={[primary + "18", "#00000000", primary + "10"]}
          start={{ x: 0.1, y: 0.0 }}
          end={{ x: 0.9, y: 1.0 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Hero */}
        <Animated.View style={[styles.heroWrap, { transform: [{ translateY: floatY }] }]}>
          <LinearGradient
            colors={[primary + "24", card]}
            start={{ x: 0.0, y: 0.0 }}
            end={{ x: 1.0, y: 1.0 }}
            style={[
              styles.heroCard,
              {
                width: HERO_SIZE,
                borderColor: primary + "40",
                backgroundColor: card,
              },
            ]}
          >
            <View style={styles.heroTopRow}>
              <View style={[styles.badge, { backgroundColor: primary + "1A", borderColor: primary + "33" }]}>
                <Text style={[styles.badgeText, { color: primary }]}>Birthdayly</Text>
              </View>

            
            </View>

            <Text style={[styles.heroTitle, { color: title }]}>
              Never miss a birthday{" "}
              <Text style={{ color: primary }}>again</Text> 🎂
            </Text>

            <Text style={[styles.heroSubtitle, { color: text }]}>
              Keep your people close with reminders, events, and a simple “talk every X days” cadence.
            </Text>

            {/* Mini preview row */}
            <View style={styles.previewRow}>
              <View style={[styles.previewPill, { backgroundColor: primary + "14", borderColor: primary + "2B" }]}>
                <Text style={[styles.previewPillText, { color: primary }]}>Next: Sarah • 2 days</Text>
              </View>
              <View style={[styles.previewPill, { backgroundColor: primary + "10", borderColor: primary + "22" }]}>
                <Text style={[styles.previewPillText, { color: primary }]}>Talk: 7d cadence</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Feature list */}
        <View style={styles.features}>
          {featureCards.map((f) => (
            <View
              key={f.title}
              style={[
                styles.featureCard,
                {
                  backgroundColor: card,
                  borderColor: card + "40",
                },
              ]}
            >
              <View style={[styles.featureIcon, { backgroundColor: primary + "12" }]}>
                <Text style={styles.featureEmoji}>{f.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.featureTitle, { color: title }]}>{f.title}</Text>
                <Text style={[styles.featureDesc, { color: text }]}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: btn }]}
            onPress={() => navigation.navigate("Register")}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryBtnText, { color: btnText }]}>Create account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryBtn,
              { borderColor: primary + "55", backgroundColor: primary + "10" },
            ]}
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryBtnText, { color: primary }]}>I already have an account</Text>
          </TouchableOpacity>

          <Text style={[styles.footerText, { color: text + "AA" }]}>
            By continuing, you agree to receive reminders you configure in the app.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 50,
    paddingBottom: 50,
    justifyContent: "space-between",
  },

  heroWrap: {
    alignItems: "center",
    marginTop: 12,
  },
  heroCard: {
    borderRadius: 26,
    borderWidth: 2,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 6,
  },
  heroTopRow: {
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
 

  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: "600",
    opacity: 0.92,
  },
  previewRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    flexWrap: "wrap",
  },
  previewPill: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  previewPillText: {
    fontSize: 12,
    fontWeight: "800",
  },

  features: {
    marginTop: 14,
    gap: 10,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  featureEmoji: {
    fontSize: 20,
  },
  featureTitle: {
    fontSize: 14.5,
    fontWeight: "900",
  },
  featureDesc: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: "600",
    opacity: 0.9,
    lineHeight: 16.5,
  },

  actions: {
    gap: 10,
    marginTop: 6,
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
  footerText: {
    marginTop: 6,
    fontSize: 11.5,
    textAlign: "center",
    fontWeight: "600",
  },
});
