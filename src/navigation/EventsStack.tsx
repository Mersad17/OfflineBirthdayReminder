import { createNativeStackNavigator } from "@react-navigation/native-stack";
import EventsScreen from "../screens/Events/EventsScreen";
import EventDetails from "../screens/Events/EventDetails";

export type EventsStackParamList = {
  EventsList: undefined;
  EventDetails: { eventId: number; eventName?: string };
};

const Stack = createNativeStackNavigator<EventsStackParamList>();

export default function EventsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="EventsList" component={EventsScreen}   options={{ headerShown: false }} />
      <Stack.Screen name="EventDetails" component={EventDetails} options={{ title: "EventDetails" }} />
    </Stack.Navigator>
  );
}
