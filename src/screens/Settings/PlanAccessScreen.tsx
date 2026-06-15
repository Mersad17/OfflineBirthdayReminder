import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import { useAccess } from "../../access/AccessContext";
import {
  ACCESS_PLANS,
  AccessPlanId,
  formatContactLimit,
  getRemainingContacts,
} from "../../access/plans";

type Props = {
  navigation: any;
};

type Colors = {
  background: string;
  card: string;
  title: string;
  text: string;
  primary: string;
  border: string;
  softPrimary: string;
  softCard: string;
  success: string;
  warning: string;
  shadow: string;
};

const PUBLIC_PLAN_IDS: AccessPlanId[] = [
  "free",
  "personal_100",
  "circle_500",
  "unlimited",
];

export default function PlanAccessScreen({ navigation }: Props) {
  const { settings } = useAppearance();
  const { access, activeContactCount, refreshAccess } = useAccess();

  const colors = useMemo(() => makeColors(settings), [settings]);

  useFocusEffect(
    React.useCallback(() => {
      refreshAccess();
    }, [refreshAccess])
  );

  const remaining = getRemainingContacts(access, activeContactCount);

  const usageLabel =
    access.maxContacts === "unlimited"
      ? `${activeContactCount} people saved · Unlimited unlocked`
      : `${activeContactCount}/${access.maxContacts} people saved`;

  const remainingLabel =
    remaining === "unlimited"
      ? "You can add unlimited people."
      : `${remaining} people remaining on this plan.`;

  return (
    <Screen scroll={false}>
      <View style={[styles.page, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[
              styles.backButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={21} color={colors.title} />
          </TouchableOpacity>

          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: colors.title }]}>
              Plan & Access
            </Text>

            <Text style={[styles.headerSubtitle, { color: colors.text }]}>
              Manage your beta access and future public plans.
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View
            style={[
              styles.currentCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <View style={styles.currentTopRow}>
              <View
                style={[
                  styles.currentIcon,
                  { backgroundColor: colors.softPrimary },
                ]}
              >
                <Ionicons
                  name={access.isBeta ? "flask-outline" : "shield-checkmark-outline"}
                  size={24}
                  color={colors.primary}
                />
              </View>

              <View style={styles.currentTitleWrap}>
                <Text style={[styles.currentEyebrow, { color: colors.primary }]}>
                  CURRENT ACCESS
                </Text>

                <Text style={[styles.currentTitle, { color: colors.title }]}>
                  {access.label}
                </Text>
              </View>
            </View>

            <Text style={[styles.currentText, { color: colors.text }]}>
              {access.isBeta
                ? "Full access is unlocked during private beta. No payment, no contact limit, and no subscription is active."
                : "This is your current public plan access."}
            </Text>

            <View
              style={[
                styles.usageBox,
                {
                  backgroundColor: colors.softCard,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.usageLabel, { color: colors.title }]}>
                {usageLabel}
              </Text>

              <Text style={[styles.usageSubtext, { color: colors.text }]}>
                {remainingLabel}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.title }]}>
              Included during private beta
            </Text>

            <View style={styles.featureGrid}>
              <FeaturePill label="Unlimited people" colors={colors} />
              <FeaturePill label="Unlimited memories" colors={colors} />
              <FeaturePill label="Unlimited reminders" colors={colors} />
              <FeaturePill label="Before Meet prep" colors={colors} />
              <FeaturePill label="Photo albums" colors={colors} />
              <FeaturePill label="Life Circle" colors={colors} />
              <FeaturePill label="Family tree" colors={colors} />
              <FeaturePill label="Custom sections" colors={colors} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.title }]}>
              Future public plans preview
            </Text>

            <Text style={[styles.sectionText, { color: colors.text }]}>
              These are not active payments yet. During private beta, everyone has
              full access.
            </Text>

            <View style={styles.planList}>
              {PUBLIC_PLAN_IDS.map((planId) => {
                const plan = ACCESS_PLANS[planId];
                const recommended = planId === "circle_500";

                return (
                  <View
                    key={planId}
                    style={[
                      styles.planCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: recommended ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <View style={styles.planCardTop}>
                      <View>
                        <Text style={[styles.planName, { color: colors.title }]}>
                          {plan.label}
                        </Text>

                        <Text style={[styles.planLimit, { color: colors.text }]}>
                          {formatContactLimit(plan.maxContacts)} people
                        </Text>
                      </View>

                      {recommended ? (
                        <View
                          style={[
                            styles.recommendedBadge,
                            { backgroundColor: colors.softPrimary },
                          ]}
                        >
                          <Text
                            style={[
                              styles.recommendedText,
                              { color: colors.primary },
                            ]}
                          >
                            BEST
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={[styles.planDescription, { color: colors.text }]}>
                      {getPlanDescription(planId)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View
            style={[
              styles.noticeCard,
              {
                backgroundColor: colors.softPrimary,
                borderColor: colors.primary,
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={21}
              color={colors.primary}
            />

            <Text style={[styles.noticeText, { color: colors.title }]}>
              Later, this screen will become the real upgrade screen with App
              Store / Google Play purchases and Restore Purchase.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
}

function FeaturePill({ label, colors }: { label: string; colors: Colors }) {
  return (
    <View
      style={[
        styles.featurePill,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
      <Text style={[styles.featureText, { color: colors.title }]}>{label}</Text>
    </View>
  );
}

function getPlanDescription(planId: AccessPlanId) {
  switch (planId) {
    case "free":
      return "For users testing the app with a small private circle.";
    case "personal_100":
      return "For close friends, family, birthdays, and important people.";
    case "circle_500":
      return "For bigger families, social users, communities, and power users.";
    case "unlimited":
      return "For people who never want to worry about limits.";
    default:
      return "";
  }
}

function makeColors(settings: any): Colors {
  return {
    background: settings.backgroundColor,
    card: settings.cardColor,
    title: settings.titleColor,
    text: settings.textColor,
    primary: settings.primaryColor,
    border: withOpacity(settings.textColor, "18"),
    softPrimary: withOpacity(settings.primaryColor, "16"),
    softCard: withOpacity(settings.textColor, "08"),
    success: "#7DA56D",
    warning: "#EBA55B",
    shadow: settings.themeMode === "dark" ? "#000000" : "#6F3D2E",
  };
}

function withOpacity(hexColor?: string | null, opacityHex = "22") {
  if (!hexColor || typeof hexColor !== "string") {
    return `#000000${opacityHex}`;
  }

  const normalized = hexColor.trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
    return `${normalized}${opacityHex}`;
  }

  return normalized;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  headerTitle: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "900",
    letterSpacing: -0.3,
  },

  headerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 2,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 34,
  },

  currentCard: {
    borderRadius: 30,
    borderWidth: 1,
    padding: 18,
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },

  currentTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  currentIcon: {
    width: 54,
    height: 54,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },

  currentTitleWrap: {
    flex: 1,
    minWidth: 0,
  },

  currentEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  currentTitle: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "900",
    marginTop: 3,
  },

  currentText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    opacity: 0.78,
    marginTop: 16,
  },

  usageBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 13,
    marginTop: 16,
  },

  usageLabel: {
    fontSize: 15,
    fontWeight: "900",
  },

  usageSubtext: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    opacity: 0.72,
    marginTop: 3,
  },

  section: {
    marginTop: 22,
  },

  sectionTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
    marginBottom: 8,
  },

  sectionText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    opacity: 0.74,
    marginBottom: 12,
  },

  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  featurePill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  featureText: {
    fontSize: 12,
    fontWeight: "800",
  },

  planList: {
    gap: 10,
  },

  planCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
  },

  planCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  planName: {
    fontSize: 17,
    fontWeight: "900",
  },

  planLimit: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
    opacity: 0.72,
    marginTop: 2,
  },

  recommendedBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  recommendedText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  planDescription: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    opacity: 0.74,
    marginTop: 10,
  },

  noticeCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    marginTop: 22,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
  },
});