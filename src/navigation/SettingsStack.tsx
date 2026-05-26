import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SettingsScreen from "../screens/Settings/SettingsScreen";
import NotificationsScreen from "../screens/Settings/NotificationsScreen";
import AppInfoScreen from "../screens/Settings/AppInfoScreen";
import AppearanceScreen from "../screens/Settings/AppearanceScreen";
import ReportBugScreen from "../screens/Settings/ReportBugScreen";
import FeedbackScreen from "../screens/Settings/FeedBackScreen";
import { useAppearance } from "../appearance/AppearanceContext";
import LanguageScreen from "../screens/Settings/LanguageScreen";
import ManageGroupsTagsScreen from "../screens/Settings/ManageGroupsTagsScreen";
import BackupScreen from "../screens/Settings/BackupScreen";
import LocalFirstScreen from "../screens/Settings/LocalFirstScreen";
export type SettingsStackParamsList ={
    SettingsHome: undefined;
    Profile:undefined;
    PasswordAndSecurity:undefined;
    Appearance: undefined;
    Notifications: undefined;
    AppInfo: undefined;
    ReportBug: undefined;
    Language: undefined;
    Feedback: undefined;
    ManageGroupsTags: undefined;
    Backup: undefined;
    LocalFirst: undefined;
}

const Stack = createNativeStackNavigator<SettingsStackParamsList>()
export default function SettingsStack(){
    const { settings } = useAppearance();
  return (
    <Stack.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: settings.cardColor, // 👈 HEADER BACKGROUND
      },
      headerTintColor: settings.titleColor,   // 👈 back button + title
      headerTitleStyle: {
        fontWeight: "700",
      },
      headerShadowVisible: false, // optional (iOS)
    }}
  >   
            <Stack.Screen name="SettingsHome" component={SettingsScreen} options={{headerShown:false}}/>
            <Stack.Screen name="Appearance" component={AppearanceScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen}/>
            <Stack.Screen name="ReportBug" component={ReportBugScreen}/> 
            <Stack.Screen name="Feedback" component={FeedbackScreen}/> 
            <Stack.Screen name="AppInfo" component={AppInfoScreen}/> 
            <Stack.Screen name="Backup" component={BackupScreen} options={{ title: "Backup & restore" }}/>
            <Stack.Screen name="LocalFirst" component={LocalFirstScreen} options={{ title: "Local First" }}/>
            <Stack.Screen name="Language" component={LanguageScreen}/> 
            <Stack.Screen name="ManageGroupsTags" component={ManageGroupsTagsScreen}/> 
        </Stack.Navigator>
    )
}