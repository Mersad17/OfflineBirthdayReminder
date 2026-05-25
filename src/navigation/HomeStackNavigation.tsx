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
import { useAppearance } from "../appearance/AppearanceContext";
import { AppId } from "../contacts/types";

export type HomeStackParamList = {
    HomeScreen: undefined;
  ContactsList: undefined;
  AddContact: undefined;
  EditContact: { contactId: AppId };
  AddEvent: { contactId: AppId; contactName: string };
  ContactDetail: { contactId: AppId; contactName?: string };
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
        headerShadowVisible: false, // iOS: cleaner look
      }}
    >
      {/* 👇 point d’entrée de ce stack */}
      <HomeStack.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{ headerShown: false }}
      />

      {/* Tu peux aussi permettre d’aller à la liste de contacts depuis Home */}
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
        name="AddEvent"
        component={AddEventScreen}
        options={{ title: "Add Event" }}
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
        name="EventDetails"
        component={EventDetails}
        options={{ title: "EventDetails" }}
      />
      <HomeStack.Screen
        name="EditEvent"
        component={EditEventScreen}
        options={{ title: "Edit Event" }}
      />
    </HomeStack.Navigator>
  );
}
