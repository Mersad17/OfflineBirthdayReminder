import { createNativeStackNavigator } from "@react-navigation/native-stack";
import EventsScreen from "../screens/Events/EventsScreen";
import EventDetails from "../screens/Events/EventDetails";
import EditEventScreen from "../screens/Events/EditEventScreen";
import { useAppearance } from "../appearance/AppearanceContext";

export type EventsStackParamList = {
  EventsList: undefined;
  EventDetails: { eventId: number; eventTitle?: string, from:string, contactId: number };
  EditEvent: { eventId: number; eventTitle?: string, from:string, contactId: number };
};

const Stack = createNativeStackNavigator<EventsStackParamList>();

export default function EventsStack() {
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
      <Stack.Screen name="EventsList" component={EventsScreen}   options={{ headerShown: false }} />
      <Stack.Screen name="EventDetails" component={EventDetails} options={{ title: "EventDetails" }} />
      <Stack.Screen
            name="EditEvent"
            component={EditEventScreen}
            options={{ title: "Edit Event" }}
            />

    </Stack.Navigator>
  );
}
