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

export type ContactsStackParamList = {
  ContactsList: undefined;
  AddContact: undefined;
  EditContact: { contactId:number; };
  AddEvent: { contactId: number; contactName: string, };
  ContactDetail: { contactId: number; contactName?: string };
  EventDetails: { eventId: number; eventTitle?: string, from:string, contactId: number };
  EditEvent: { eventId: number; eventTitle?: string, from:string, contactId: number };
  LogInteraction: { contactId: number ,  interaction?: Interaction;};
  InteractionsHistory: { contactId: number };
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
      <Stack.Screen
  name="LogInteraction"
  component={LogInteractionScreen}
  options={{ title: "Log Interaction" }}
/>

<Stack.Screen
  name="InteractionsHistory"
  component={InteractionsHistoryScreen}
  options={{ title: "Interactions" }}
/>

    </Stack.Navigator>
  );
}
