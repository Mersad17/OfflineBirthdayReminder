// navigation/HomeStack.tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/Home/HomeScreen";
import ContactsScreen from "../screens/Contacts/ContactsScreen";
import AddContactScreen from "../screens/Contacts/AddContactScreen";
import ContactDetailScreen from "../screens/Contacts/ContactDetailScreen";
import EventDetails from "../screens/Events/EventDetails";
import AddEventScreen from "../screens/Contacts/AddEventScreen";
import EditEventScreen from "../screens/Events/EditEventScreen";
import EditContactScreen from "../screens/Contacts/EditContactScreen";
import LogInteractionScreen from "../screens/Interactions/LogInteractionScreen";
import InteractionsHistoryScreen from "../screens/Interactions/InteractionsHistoryScreen";
import AddSmartReminderScreen from "../screens/Reminders/AddSmartReminderScreen";
import QuickNoteScreen from "../screens/Contacts/QuickNotesScreen";

import { useAppearance } from "../appearance/AppearanceContext";
import { AppId } from "../contacts/types";
import { Interaction } from "../interactions/types";

export type HomeStackParamList = {
  HomeScreen: undefined;

  ContactsList: undefined;
  AddContact: undefined;

  ContactDetail: {
    contactId: AppId;
    contactName?: string;
  };

  EditContact: {
    contactId: AppId;
  };

  AddEvent: {
    contactId: AppId;
    contactName: string;
  };

  EventDetails: {
    eventId: AppId;
    eventTitle?: string;
    from: string;
    contactId: AppId;
  };

  EditEvent: {
    eventId: AppId;
    eventTitle?: string;
    from: string;
    contactId: AppId;
  };

  AddReminder: {
    contactId?: AppId;
    contactName?: string;
    note?: string;
  };

  QuickNote: {
    contactId: AppId;
    contactName?: string;
  };

  LogInteraction: {
    contactId: AppId;
    interaction?: Interaction;
  };

  InteractionsHistory: {
    contactId: AppId;
  };
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  const { settings } = useAppearance();

  return (
    <HomeStack.Navigator
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
      <HomeStack.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{ headerShown: false }}
      />

      <HomeStack.Screen
        name="ContactsList"
        component={ContactsScreen}
        options={{ headerShown: false }}
      />

      <HomeStack.Screen
        name="AddContact"
        component={AddContactScreen}
        options={{ title: "Add Contact" }}
      />

      <HomeStack.Screen
        name="ContactDetail"
        component={ContactDetailScreen}
        options={{ title: "Contact" }}
      />

      <HomeStack.Screen
        name="EditContact"
        component={EditContactScreen}
        options={{ title: "Edit Contact" }}
      />

      <HomeStack.Screen
        name="AddEvent"
        component={AddEventScreen}
        options={{ title: "Add Event" }}
      />

      <HomeStack.Screen
        name="EventDetails"
        component={EventDetails}
        options={{ title: "Event Details" }}
      />

      <HomeStack.Screen
        name="EditEvent"
        component={EditEventScreen}
        options={{ title: "Edit Event" }}
      />

      <HomeStack.Screen
        name="AddReminder"
        component={AddSmartReminderScreen}
        options={{ title: "Smart Reminder" }}
      />

      <HomeStack.Screen
        name="QuickNote"
        component={QuickNoteScreen}
        options={{ title: "Quick note" }}
      />

      <HomeStack.Screen
        name="LogInteraction"
        component={LogInteractionScreen}
        options={{ title: "Log Interaction" }}
      />

      <HomeStack.Screen
        name="InteractionsHistory"
        component={InteractionsHistoryScreen}
        options={{ title: "Interactions" }}
      />
    </HomeStack.Navigator>
  );
}