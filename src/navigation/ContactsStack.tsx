import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ContactsScreen from "../screens/Contacts/ContactsScreen";
import AddContactScreen from "../screens/Contacts/AddContactScreen";
import ContactDetailScreen from "../screens/Contacts/ContactDetailScreen";
import EventDetails from "../screens/Events/EventDetails";
import AddEventScreen from "../screens/Contacts/AddEventScreen";
import EditEventScreen from "../screens/Events/EditEventScreen";
import EditContactScreen from "../screens/Contacts/EditContactScreen";
import LogInteractionScreen from "../screens/Interactions/LogInteractionScreen";
import InteractionsHistoryScreen from "../screens/Interactions/InteractionsHistoryScreen";
import { Interaction } from "../interactions/types";
import { useAppearance } from "../appearance/AppearanceContext";
import { AppId } from "../contacts/types";
import AddSmartReminderScreen from "../screens/Reminders/AddSmartReminderScreen";
import QuickNoteScreen from "../screens/Contacts/QuickNotesScreen";
import AlbumDetailsScreen from "../screens/Albums/AlbumDetailsScreen";
export type ContactsStackParamList = {
  ContactsList: undefined;
  AddContact: undefined;

  EditContact: { contactId: AppId };

  AddEvent: {
    contactId: AppId;
    contactName: string;
  };
 AddReminder: {
  contactId?: AppId;
  contactName?: string;
  note?: string;
};
  ContactDetail: {
    contactId: AppId;
    contactName?: string;
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

  LogInteraction: {
    contactId: AppId;
    interaction?: Interaction;
  };
QuickNote: {
  contactId: string | number;
  contactName?: string;
};
ContactAlbumDetails: {
  contactId: AppId;
  albumId: AppId;
  albumTitle?: string;
};
  InteractionsHistory: {
    contactId: AppId;
  };
 
};

const Stack = createNativeStackNavigator<ContactsStackParamList>();

export default function ContactsStack() {
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
  <Stack.Screen name="ContactsList" component={ContactsScreen} options={{headerShown:false}} />
      <Stack.Screen name="AddContact" component={AddContactScreen} options={{ title: "Add Contact" }} />
      <Stack.Screen name="AddEvent" component={AddEventScreen} options={{ title: "Add Event" }} />
      <Stack.Screen name="ContactDetail" component={ContactDetailScreen} options={{ title: "Contact" }} />
      <Stack.Screen name="EditContact" component={EditContactScreen} options={{title:"Edit Contact"}}/>
      <Stack.Screen name="EventDetails" component={EventDetails} options={{ title: "EventDetails" }} />
      <Stack.Screen name="EditEvent" component={EditEventScreen} options={{ title: "Edit Event" }} />
      <Stack.Screen name="AddReminder" component={AddSmartReminderScreen}  options={{ title: "Smart Reminder" }}/>
      <Stack.Screen name="QuickNote" component={QuickNoteScreen} options={{ title: "Quick note" }} />
      <Stack.Screen name="ContactAlbumDetails" component={AlbumDetailsScreen} options={{ title: "Photo album" }} />
      <Stack.Screen name="LogInteraction" component={LogInteractionScreen} options={{ title: "Log Interaction" }} />

<Stack.Screen
  name="InteractionsHistory"
  component={InteractionsHistoryScreen}
  options={{ title: "Interactions" }}
/>

    </Stack.Navigator>
  );
}
