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
          <Text style={[styles.title, { color: settings.textColor }]}>
            Settings
          </Text>

          {/* Account */}
          <Text style={[styles.sectionTitle, { color: settings.textColor }]}>
            Account
          </Text>

          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("Profile")}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="person-circle-outline" size={22} color={settings.textColor} />
              <Text style={[styles.rowText, { color: settings.textColor }]}>
                Manage Profile
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={settings.textColor}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("PasswordAndSecurity")}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="lock-closed-outline" size={22} color={settings.textColor} />
              <Text style={[styles.rowText, { color: settings.textColor }]}>
                Password and Security
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={settings.textColor}
            />
          </TouchableOpacity>

          {/* Appearance */}
          <Text style={[styles.sectionTitle, { color: settings.textColor }]}>
            Appearance
          </Text>

          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("Appearance")}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="color-palette-outline" size={22} color={settings.textColor} />
              <Text style={[styles.rowText, { color: settings.textColor }]}>
                Theme, colors & background
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={settings.textColor}
            />
          </TouchableOpacity>
    <TouchableOpacity
      style={styles.row}
      onPress={() => navigation.navigate("Language")}
    >
      <View style={styles.rowLeft}>
        <Ionicons
          name="language-outline"
          size={22}
          color={settings.textColor}
        />
        <Text style={[styles.rowText, { color: settings.textColor }]}>
          Language
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={settings.textColor}
      />
    </TouchableOpacity>
          {/* Notifications */}
          <Text style={[styles.sectionTitle, { color: settings.textColor }]}>
            Notifications
          </Text>

          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("Notifications")}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={22} color={settings.textColor} />
              <Text style={[styles.rowText, { color: settings.textColor }]}>
                Notification settings
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={settings.textColor}
            />
          </TouchableOpacity>

          {/* Support */}
          <Text style={[styles.sectionTitle, { color: settings.textColor }]}>
            Support
          </Text>

          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("ReportBug")}
          >
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons
                name="bug-outline"
                size={22}
                color={settings.textColor}
              />
              <Text style={[styles.rowText, { color: settings.textColor }]}>
                Report a bug
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={settings.textColor}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("Feedback")}
          >
            <View style={styles.rowLeft}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={22}
                color={settings.textColor}
              />
              <Text style={[styles.rowText, { color: settings.textColor }]}>
                Send feedback
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={settings.textColor}
            />
          </TouchableOpacity>

          {/* App */}
          <Text style={[styles.sectionTitle, { color: settings.textColor }]}>
            App
          </Text>

          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("AppInfo")}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="information-circle-outline" size={22} color={settings.textColor} />
              <Text style={[styles.rowText, { color: settings.textColor }]}>
                About / Version
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={settings.textColor}
            />
          </TouchableOpacity>

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
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 4,
    fontSize: 16,
    fontWeight: "600",
  },
  row: {
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowText: {
    fontSize: 16,
  },
  logoutWrapper: {
    marginTop: 8,
  },
});
