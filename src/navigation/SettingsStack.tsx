import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SettingsScreen from "../screens/Settings/SettingsScreen";
import ProfileScreen from "../screens/Settings/ProfileScreen";
import AppereanceScreen from "../screens/Settings/AppereanceScreen";
import NotificationsScreen from "../screens/Settings/NotificationsScreen";
import AppInfoScreen from "../screens/Settings/AppInfoScreen";
import AppearanceScreen from "../screens/Settings/AppearanceScreen";

export type SettingsStackParamsList ={
    Settings: undefined;
    Profile:undefined;
    Appearance: undefined;
    Notifications: undefined;
    AppInfo: undefined;
}

const Stack = createNativeStackNavigator<SettingsStackParamsList>()
export default function SettingsStack(){
    return(
        <Stack.Navigator>
            <Stack.Screen name="Settings" component={SettingsScreen} options={{headerShown:true}}/>
            <Stack.Screen name="Profile" component={ProfileScreen} options={{headerShown:true}}/>
            <Stack.Screen name="Appearance" component={AppearanceScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen}/>
            <Stack.Screen name="AppInfo" component={AppInfoScreen}/> 
        </Stack.Navigator>
    )
}