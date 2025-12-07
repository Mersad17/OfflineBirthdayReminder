import React from "react";
import {
  View,
  Text,
  Button,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SettingsStackParamsList } from "../../navigation/SettingsStack";
import { useAppearance } from "../../appearance/AppearanceContext";
import { Screen } from "../../components/Screen";
type Props = NativeStackScreenProps<SettingsStackParamsList, "SettingsHome">;

export default function SettingsScreen({ navigation }: Props) {
  const { logout } = useAuth();
  const { settings } = useAppearance();

  return (
    <Screen scroll>
    <ScrollView
      style={[styles.scroll]} // ✅
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.container}>
        <Text
          style={[
            styles.title,
            {
              color: settings.textColor,
            },
          ]}
        >
          Settings
        </Text>

        {/* Account */}
        <Text
          style={[
            styles.sectionTitle,
            {
              color: settings.textColor,
            },
          ]}
        >
          Account
        </Text>

        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate("Profile")}
        >
          <Text
            style={[
              styles.rowText,
              {
                color: settings.textColor,
              },
            ]}
          >
            Manage Profile
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate("PasswordAndSecurity")}
        >
          <Text
            style={[
              styles.rowText,
              {
                color: settings.textColor,
              },
            ]}
          >
            Password and Security
          </Text>
        </TouchableOpacity>

        

        {/* Appearance */}
        <Text
          style={[
            styles.sectionTitle,
            {
              color: settings.textColor,
            },
          ]}
        >
          Appearance
        </Text>

        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate("Appearance")}
        >
          <Text
            style={[
              styles.rowText,
              {
                color: settings.textColor,
              },
            ]}
          >
            Theme, colors & background
          </Text>
        </TouchableOpacity>

        {/* Notifications */}
        <Text
          style={[
            styles.sectionTitle,
            {
              color: settings.textColor,
            },
          ]}
        >
          Notifications
        </Text>

        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate("Notifications")}
        >
          <Text
            style={[
              styles.rowText,
              {
                color: settings.textColor,
              },
            ]}
          >
            Notification settings
          </Text>
        </TouchableOpacity>
        <Text style={[
          styles.sectionTitle,{color:settings.textColor}
        ]}>
        Support
        </Text>
        <TouchableOpacity style={styles.row} onPress={()=> 
          navigation.navigate("ReportBug")}>
            <Text style={[styles.rowText, {
                  color: settings.textColor,
                },]}>
                  Report a bug

            </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.row}
        onPress={()=>navigation.navigate('Feedback')}>
          <Text style={[
            styles.rowText,
            {
              color:settings.textColor,
            },
          ]}></Text>
        </TouchableOpacity>
        
        {/* App */}
        <Text
          style={[
            styles.sectionTitle,
            {
              color: settings.textColor,
            },
          ]}
        >
          App
        </Text>

        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate("AppInfo")}
        >
          <Text
            style={[
              styles.rowText,
              {
                color: settings.textColor,
              },
            ]}
          >
            About / Version
          </Text>
        </TouchableOpacity>
        <View style={styles.logoutWrapper}>
          <Button title="Logout" onPress={logout} color={settings.buttonColor} />
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
  },
  rowText: {
    fontSize: 16,
  },
  logoutWrapper: {
    marginTop: 8,
  },
});
