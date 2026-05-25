// src/navigation/AppTabs.tsx
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import ContactsStack from "./ContactsStack";
import EventsStack from "./EventsStack";
import SettingsStack from "./SettingsStack";
import HomeStackNavigator from "./HomeStackNavigation";
import { useAppearance } from "../appearance/AppearanceContext";

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  const { settings } = useAppearance();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: settings.primaryColor,
        tabBarInactiveTintColor: settings.textColor + "80",
        tabBarStyle: {
          backgroundColor: settings.cardColor,
          borderTopColor: "#E5E7EB",
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Contacts") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "Events") {
            iconName = focused ? "calendar" : "calendar-outline";
          } else {
            iconName = focused ? "settings" : "settings-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />

      <Tab.Screen
        name="Contacts"
        component={ContactsStack}
        options={{ headerShown: false }}
      />

      <Tab.Screen
        name="Events"
        component={EventsStack}
        options={{ headerShown: false }}
      />

      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? "Settings";

          const hideOnScreens = [
            "Profile",
            "Appearance",
            "Notifications",
            "AppInfo",
          ];

          return {
            headerShown: false,
            tabBarStyle: hideOnScreens.includes(routeName)
              ? { display: "none" }
              : {
                  backgroundColor: settings.cardColor,
                  borderTopColor: "#E5E7EB",
                },
          };
        }}
      />
    </Tab.Navigator>
  );
}