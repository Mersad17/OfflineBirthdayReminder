// src/navigation/AppTabs.tsx
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import HomeScreen from "../screens/Home/HomeScreen";
import ContactsStack from "./ContactsStack";
import EventsStack from "./EventsStack";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import SettingsStack from "./SettingsStack";
import { Ionicons } from "@expo/vector-icons";
const Tab = createBottomTabNavigator();
export default function AppTabs() {
  return (
    <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false, // hide headers for all
      tabBarActiveTintColor: "#007AFF", // iOS blue
      tabBarInactiveTintColor: "#999",
      tabBarIcon: ({ color, size, focused }) => {
        let iconName: keyof typeof Ionicons.glyphMap;
        if (route.name === "Home") {
          iconName = focused ? "home" : "home-outline";
        } else if (route.name === "Contacts") {
          iconName = focused ? "people" : "people-outline";
        } else if (route.name === "Events") {
          iconName = focused ? "notifications" : "notifications-outline";
        } else {
          iconName = focused ? "settings" : "settings-outline";
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
  >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Contacts" component={ContactsStack} options={{ headerShown: false }} />
      <Tab.Screen name="Events" component={EventsStack} options={{ headerShown: false }} />
      <Tab.Screen
  name="Settings"
  component={SettingsStack}
  options={({ route }) => {
    const routeName = getFocusedRouteNameFromRoute(route) ?? "Settings";

    // screens where you want to HIDE the tab bar
    const hideOnScreens = ["Profile", "Appearance", "Notifications", "AppInfo"];

    return {
      headerShown: false,
      tabBarStyle: hideOnScreens.includes(routeName)
        ? { display: "none" }
        : undefined,
    };
  }}
/>
      {/* later: Contacts, Reminders, Settings */}
    </Tab.Navigator>
  );
}
