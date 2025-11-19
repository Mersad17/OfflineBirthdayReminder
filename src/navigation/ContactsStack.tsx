import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ContactsScreen from "../screens/Contacts/ContactsScreen";
import AddContactScreen from "../screens/Contacts/AddContactScreen";
import ContactDetailScreen from "../screens/Contacts/ContactDetailScreen";

export type ContactsStackParamList = {
  ContactsList: undefined;
  AddContact: undefined;
  ContactDetail: { contactId: number; contactName?: string };
};

const Stack = createNativeStackNavigator<ContactsStackParamList>();

export default function ContactsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="ContactsList" component={ContactsScreen} options={{ title: "Contacts" }} />
      <Stack.Screen name="AddContact" component={AddContactScreen} options={{ title: "Add Contact" }} />
      <Stack.Screen name="ContactDetail" component={ContactDetailScreen} options={{ title: "Contact" }} />
    </Stack.Navigator>
  );
}
