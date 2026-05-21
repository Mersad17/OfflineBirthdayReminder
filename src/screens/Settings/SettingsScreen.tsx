import React from "react";
import {
  View,
  Text,
  Button,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SettingsStackParamsList } from "../../navigation/SettingsStack";
import { useAuth } from "../../auth/AuthContext";
import { useAppearance } from "../../appearance/AppearanceContext";
import { Screen } from "../../components/Screen";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<SettingsStackParamsList, "SettingsHome">;

export default function SettingsScreen({ navigation }: Props) {
  const { logout } = useAuth();
  const { settings } = useAppearance();

  return (
    <Screen scroll>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
          <Text style={[styles.title, { color: settings.titleColor }]}>
            Settings
          </Text>

          {/* Account */}
          <Text style={[styles.sectionTitle, { color: settings.textColor }]}>
            Account
          </Text>

          <SettingsRow
            icon="person-circle-outline"
            title="Manage Profile"
            onPress={() => navigation.navigate("Profile")}
            settings={settings}
          />

          <SettingsRow
            icon="lock-closed-outline"
            title="Password and Security"
            onPress={() => navigation.navigate("PasswordAndSecurity")}
            settings={settings}
          />

          {/* Appearance */}
          <Text style={[styles.sectionTitle, { color: settings.textColor }]}>
            Appearance
          </Text>

          <SettingsRow
            icon="color-palette-outline"
            title="Theme, colors & background"
            onPress={() => navigation.navigate("Appearance")}
            settings={settings}
          />

          <SettingsRow
            icon="language-outline"
            title="Language"
            onPress={() => navigation.navigate("Language")}
            settings={settings}
          />

          {/* Organization */}
          <Text style={[styles.sectionTitle, { color: settings.textColor }]}>
            Organization
          </Text>

          <SettingsRow
            icon="pricetags-outline"
            title="Groups & Tags"
            subtitle="Manage custom groups and tags"
            onPress={() => navigation.navigate("ManageGroupsTags")}
            settings={settings}
          />

          {/* Notifications */}
          <Text style={[styles.sectionTitle, { color: settings.textColor }]}>
            Notifications
          </Text>

          <SettingsRow
            icon="notifications-outline"
            title="Notification settings"
            onPress={() => navigation.navigate("Notifications")}
            settings={settings}
          />

          {/* Support */}
          <Text style={[styles.sectionTitle, { color: settings.textColor }]}>
            Support
          </Text>

          <SettingsRow
            customIcon={
              <MaterialCommunityIcons
                name="bug-outline"
                size={22}
                color={settings.textColor}
              />
            }
            title="Report a bug"
            onPress={() => navigation.navigate("ReportBug")}
            settings={settings}
          />

          <SettingsRow
            icon="chatbubble-ellipses-outline"
            title="Send feedback"
            onPress={() => navigation.navigate("Feedback")}
            settings={settings}
          />

          {/* App */}
          <Text style={[styles.sectionTitle, { color: settings.textColor }]}>
            App
          </Text>

          <SettingsRow
            icon="information-circle-outline"
            title="About / Version"
            onPress={() => navigation.navigate("AppInfo")}
            settings={settings}
          />

          <View style={styles.logoutWrapper}>
            <Button
              title="Logout"
              onPress={logout}
              color={settings.buttonColor}
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function SettingsRow({
  icon,
  customIcon,
  title,
  subtitle,
  onPress,
  settings,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  customIcon?: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  settings: any;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: settings.cardColor,
          borderColor: settings.textColor + "12",
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.rowLeft}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: settings.primaryColor + "15" },
          ]}
        >
          {customIcon ? (
            customIcon
          ) : (
            <Ionicons
              name={icon || "ellipse-outline"}
              size={22}
              color={settings.primaryColor}
            />
          )}
        </View>

        <View style={styles.rowTextBox}>
          <Text style={[styles.rowTitle, { color: settings.titleColor }]}>
            {title}
          </Text>

          {subtitle ? (
            <Text
              style={[styles.rowSubtitle, { color: settings.textColor + "80" }]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={settings.textColor + "80"}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 20,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 10,
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  row: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTextBox: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: 13,
  },
  logoutWrapper: {
    marginTop: 18,
    marginBottom: 30,
  },
});