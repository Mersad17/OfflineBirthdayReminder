import { createNativeStackNavigator } from "@react-navigation/native-stack";

import RemindersScreen from "../screens/Reminders/RemindersScreen";
import AddSmartReminderScreen from "../screens/Reminders/AddSmartReminderScreen";
import { useAppearance } from "../appearance/AppearanceContext";
import { AppId } from "../contacts/types";

export type RemindersStackParamList = {
  RemindersList: undefined;
  AddReminder:
    | {
        contactId?: AppId;
        contactName?: string;
      }
    | undefined;
};

const Stack = createNativeStackNavigator<RemindersStackParamList>();

export default function RemindersStack() {
  const { settings } = useAppearance();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: settings.cardColor,
        },
        headerTintColor: settings.titleColor,
        headerTitleStyle: {
          fontWeight: "700",
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="RemindersList"
        component={RemindersScreen}
        options={{ title: "Reminders" }}
      />

      <Stack.Screen
        name="AddReminder"
        component={AddSmartReminderScreen}
        options={{ title: "Smart Reminder" }}
      />
    </Stack.Navigator>
  );
}