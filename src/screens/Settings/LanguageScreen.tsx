import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Screen } from "../../components/Screen";
import { useAppearance } from "../../appearance/AppearanceContext";
import {
  LanguagePreference,
} from "../../i18n/languageStorage";
import { useLanguage } from "../../i18n/LanguageContext";

type LanguageOption = {
  labelKey: string;
  subtitleKey: string;
  value: LanguagePreference;
};
const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    labelKey: "language.options.system.label",
    subtitleKey: "language.options.system.subtitle",
    value: "system",
  },
  {
    labelKey: "language.options.en.label",
    subtitleKey: "language.options.en.subtitle",
    value: "en",
  },
  {
    labelKey: "language.options.fr.label",
    subtitleKey: "language.options.fr.subtitle",
    value: "fr",
  },
  {
    labelKey: "language.options.sq.label",
    subtitleKey: "language.options.sq.subtitle",
    value: "sq",
  },
];

export default function LanguageScreen() {
  const { settings } = useAppearance();
  const { languagePreference, setLanguagePreference } = useLanguage();
    const { t } = useTranslation("settings");
  return (
    <Screen scroll>
      <View style={styles.container}>
        <Text style={[styles.title, { color: settings.titleColor }]}>
          {t("language.title")}
        </Text>

        <Text style={[styles.subtitle, { color: settings.textColor }]}>
          {t("language.subtitle")}
        </Text>

        <View style={styles.list}>
          {LANGUAGE_OPTIONS.map((option) => {
            const selected = languagePreference === option.value;

            return (
              <TouchableOpacity
                key={option.value}
                activeOpacity={0.85}
                onPress={() => setLanguagePreference(option.value)}
                style={[
                  styles.row,
                  {
                    backgroundColor: settings.cardColor,
                    borderColor: selected
                      ? settings.primaryColor
                      : settings.primaryColor + "22",
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.label,
                      { color: settings.titleColor },
                    ]}
                  >
                    {t(option.labelKey)}
                  </Text>

                  <Text
                    style={[
                      styles.rowSubtitle,
                      { color: settings.textColor },
                    ]}
                  >
                    {t(option.subtitleKey)}
                  </Text>
                </View>

                {selected ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={settings.primaryColor}
                  />
                ) : (
                  <Ionicons
                    name="ellipse-outline"
                    size={24}
                    color={settings.textColor + "77"}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    opacity: 0.85,
  },
  list: {
    gap: 10,
    marginTop: 8,
  },
  row: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: "800",
  },
  rowSubtitle: {
    fontSize: 13,
    marginTop: 3,
    fontWeight: "600",
    opacity: 0.8,
  },
});