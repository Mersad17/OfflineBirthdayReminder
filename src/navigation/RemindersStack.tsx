import { createNativeStackNavigator } from "@react-navigation/native-stack";
import RemindersScreen from "../screens/Reminders/RemindersScreen";
import AddReminderScreen from "../screens/Reminders/AddReminderScreen";
import { useAppearance } from "../appearance/AppearanceContext";

const Stack = createNativeStackNavigator();

export default function RemindersStack() {
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
      <Stack.Screen name="RemindersList" component={RemindersScreen} options={{ title: "Reminders" }} />
      <Stack.Screen name="AddReminder" component={AddReminderScreen} options={{ title: "Add Reminder" }} />
    </Stack.Navigator>
  );
}
