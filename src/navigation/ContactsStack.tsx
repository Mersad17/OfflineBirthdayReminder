import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ContactsScreen from "../screens/Contacts/ContactsScreen";
import AddContactScreen from "../screens/Contacts/AddContactScreen";
import ContactDetailScreen from "../screens/Contacts/ContactDetailScreen";
import EventDetails from "../screens/Events/EventDetails";
import AddEventScreen from "../screens/Contacts/AddEventScreen";
import EditEventScreen from "../screens/Events/EditEventScreen";

export type ContactsStackParamList = {
  ContactsList: undefined;
  AddContact: undefined;
  AddEvent: { contactId: number; contactName: string, };
  ContactDetail: { contactId: number; contactName?: string };
  EventDetails: { eventId: number; eventTitle?: string, from:string, contactId: number };
  EditEvent: { eventId: number; eventTitle?: string, from:string, contactId: number };

};

const Stack = createNativeStackNavigator<ContactsStackParamList>();

export default function ContactsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ContactsList" component={ContactsScreen} options={{headerShown:false}} />
      <Stack.Screen name="AddContact" component={AddContactScreen} options={{ title: "Add Contact" }} />
      <Stack.Screen name="AddEvent" component={AddEventScreen} options={{ title: "Add Event" }} />
      <Stack.Screen name="ContactDetail" component={ContactDetailScreen} options={{ title: "Contact" }} />
      <Stack.Screen name="EventDetails" component={EventDetails} options={{ title: "EventDetails" }} />
      <Stack.Screen name="EditEvent" component={EditEventScreen} options={{ title: "Edit Event" }} />

    </Stack.Navigator>
  );
}
