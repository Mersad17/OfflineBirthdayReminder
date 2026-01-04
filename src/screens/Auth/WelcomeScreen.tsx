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
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";

const ROTATING_WORDS = [
  { text: "birthday" },
  { text: "event" },
  { text: "anniversary" },
  { text: "reminder" },
  { text: "check-in" },
];

export default function WelcomeScreen({ navigation }: any) {
  const { settings } = useAppearance();
  const { width } = Dimensions.get("window");

  const HERO_SIZE = Math.min(360, Math.max(280, width - 48));

  const wordIndex = useRef(0);
  const rotateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const [currentWord, setCurrentWord] = React.useState(ROTATING_WORDS[0]);

  /* ---------------- Floating hero ---------------- */

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
  }, []);

  /* ---------------- Word animation ---------------- */

  React.useEffect(() => {
    let mounted = true;

    const animate = () => {
      if (!mounted) return;

      Animated.parallel([
        Animated.timing(rotateX, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        wordIndex.current = (wordIndex.current + 1) % ROTATING_WORDS.length;
        setCurrentWord(ROTATING_WORDS[wordIndex.current]);

        rotateX.setValue(0);
        opacity.setValue(1);

        setTimeout(animate, 2800); // calm pause
      });
    };

    const start = setTimeout(animate, 2800);
    return () => {
      mounted = false;
      clearTimeout(start);
    };
  }, []);

  const featureCards = useMemo(
    () => [
      {
        icon: "🎂",
        title: "Birthday reminders",
        desc: "Get notified before it’s too late.",
      },
      {
        icon: "🗓️",
        title: "Events & notes",
        desc: "Add custom events, save context, stay thoughtful.",
      },
      {
        icon: "💬",
        title: "Talk cadence",
        desc: "Set “talk every X days” and keep relationships warm.",
      },
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
        {/* Background */}
        <LinearGradient
          colors={[primary + "18", "#00000000", primary + "10"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* HERO */}
        <Animated.View style={{ transform: [{ translateY: floatY }] }}>
          <LinearGradient
            colors={[primary + "24", card]}
            style={[
              styles.heroCard,
              { width: HERO_SIZE, borderColor: primary + "40" },
            ]}
          >
            {/* Badge */}
            <View style={[styles.badge, { borderColor: primary + "33" }]}>
              <Text style={[styles.badgeText, { color: primary }]}>
                Birthdayly
              </Text>
            </View>

            {/* TITLE */}
            <View>
              {/* LINE 1 */}
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[styles.heroTitle, { color: title }]}>
                  Never miss a{" "}
                </Text>

                <Animated.Text
                  style={[
                    styles.heroTitle,
                    {
                      color: primary,
                      opacity,
                      transform: [
                        { perspective: 800 },
                        {
                          rotateX: rotateX.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: ["0deg", "18deg", "0deg"],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {currentWord.text}
                </Animated.Text>
              </View>

              {/* LINE 2 */}
              <Text style={[styles.heroTitle, { color: title, marginTop: -2 }]}>
                again
              </Text>
            </View>

            <Text style={[styles.heroSubtitle, { color: text }]}>
              Keep your people close with reminders, events, and a simple “talk every X days” cadence.
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* FEATURES */}
        <View style={styles.features}>
          {featureCards.map((f) => (
            <View
            key={f.title}
            style={[
              styles.featureCard,
              {
                backgroundColor: card,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              },
            ]}
          >
            {/* ICON */}
            <View
              style={[
                styles.featureIcon,
                { backgroundColor: primary + "12" },
              ]}
            >
              <Text style={styles.featureIconText}>{f.icon}</Text>
            </View>
          
            {/* TEXT */}
            <View style={{ flex: 1 }}>
              <Text style={[styles.featureTitle, { color: title }]}>
                {f.title}
              </Text>
              <Text style={[styles.featureDesc, { color: text }]}>
                {f.desc}
              </Text>
            </View>
          </View>
          
          ))}
        </View>

        {/* ACTIONS */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: btn }]}
            onPress={() => navigation.navigate("Register")}
          >
            <Text style={[styles.primaryBtnText, { color: btnText }]}>
              Create account
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: primary + "55" }]}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={[styles.secondaryBtnText, { color: primary }]}>
              I already have an account
            </Text>
          </TouchableOpacity>
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

  heroCard: {
    borderRadius: 26,
    borderWidth: 2,
    padding: 18,
  },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 12,
  },

  badgeText: {
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.3,
  },

  heroTitle: {
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 30,
    letterSpacing: -0.4,
  },

  heroSubtitle: {
    marginTop: 10,
    fontSize: 14.5,
    fontWeight: "600",
    opacity: 0.92,
  },

  features: {
    marginTop: 14,
    gap: 10,
  },

  featureCard: {
    borderRadius: 16,
    padding: 14,
  },

  featureTitle: {
    fontSize: 14.5,
    fontWeight: "900",
  },featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  
  featureIconText: {
    fontSize: 20,
  },
  

  featureDesc: {
    marginTop: 2,
    fontSize: 12.5,
    fontWeight: "600",
    opacity: 0.9,
  },

  actions: {
    gap: 10,
  },

  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  primaryBtnText: {
    fontSize: 16,
    fontWeight: "900",
  },

  secondaryBtn: {
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
  },

  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "900",
  },
});
