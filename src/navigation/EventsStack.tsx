import { createNativeStackNavigator } from "@react-navigation/native-stack";

import EventsScreen from "../screens/Events/EventsScreen";
import EventDetails from "../screens/Events/EventDetails";
import EditEventScreen from "../screens/Events/EditEventScreen";
import AddEventScreen from "../screens/Events/AddEventScreen";
import CalendarScreen from "../screens/Events/CalendarScreen";
import RemindersScreen from "../screens/Reminders/RemindersScreen";
import AddSmartReminderScreen from "../screens/Reminders/AddSmartReminderScreen";

import { useAppearance } from "../appearance/AppearanceContext";
import { AppId } from "../contacts/types";

export type EventsStackParamList = {
  CalendarHome: undefined;
  EventsList: undefined;
  AllReminders: undefined;

  AddReminder:
    | {
        contactId?: AppId;
        contactName?: string;
        note?: string;
        mode?: "reminder" | "ask_next_time";
        title?: string;
      }
    | undefined;

  AddEvent:
    | {
        contactId?: AppId;
        contactName?: string;
        initialType?: 1 | 2 | 3 | 4 | 5 | 6;
        initialTitle?: string;
      }
    | undefined;

  EventDetails: {
    eventId: AppId;
    eventTitle?: string;
    from?: string;
    contactId?: AppId;
  };

  EditEvent: {
    eventId: AppId;
    eventTitle?: string;
    from?: string;
    contactId?: AppId;
  };
};

const Stack = createNativeStackNavigator<EventsStackParamList>();

export default function EventsStack() {
  const { settings } = useAppearance();

  return (
    <Stack.Navigator
      initialRouteName="CalendarHome"
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
        name="CalendarHome"
        component={CalendarScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="EventsList"
        component={EventsScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="AllReminders"
        component={RemindersScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="AddReminder"
        component={AddSmartReminderScreen as any}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="AddEvent"
        component={AddEventScreen as any}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="EventDetails"
        component={EventDetails}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="EditEvent"
        component={EditEventScreen}
        options={{ title: "Edit event" }}
      />
    </Stack.Navigator>
  );
}