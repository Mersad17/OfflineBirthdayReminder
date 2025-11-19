import { createNativeStackNavigator } from "@react-navigation/native-stack";
import RemindersScreen from "../screens/Reminders/RemindersScreen";
import AddReminderScreen from "../screens/Reminders/AddReminderScreen";

const Stack = createNativeStackNavigator();

export default function RemindersStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="RemindersList" component={RemindersScreen} options={{ title: "Reminders" }} />
      <Stack.Screen name="AddReminder" component={AddReminderScreen} options={{ title: "Add Reminder" }} />
    </Stack.Navigator>
  );
}
