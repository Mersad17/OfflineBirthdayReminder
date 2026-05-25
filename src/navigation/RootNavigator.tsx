// src/navigation/RootNavigator.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AppTabs from "./AppTabs";
import AddContactScreen from "../screens/Contacts/AddContactScreen";
import AddSmartReminderScreen from "../screens/Reminders/AddSmartReminderScreen";
import { AppearanceProvider } from "../appearance/AppearanceContext";
import { useNavigationAppearance } from "../appearance/useNavigationAppearance";
import { AppId } from "../contacts/types";

export type RootStackParamList = {
  MainTabs: undefined;

  GlobalAddContact: undefined;

  GlobalAddReminder:
    | {
        contactId?: AppId;
        contactName?: string;
        note?: string;
      }
    | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <AppearanceProvider>
      <NavigationWithAppearance />
    </AppearanceProvider>
  );
}

function NavigationWithAppearance() {
  const { navTheme } = useNavigationAppearance();

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator>
        <Stack.Screen
          name="MainTabs"
          component={AppTabs}
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="GlobalAddContact"
          component={AddContactScreen}
          options={{
            title: "Add Contact",
            presentation: "modal",
          }}
        />

        <Stack.Screen
          name="GlobalAddReminder"
          component={AddSmartReminderScreen}
          options={{
            title: "Smart Reminder",
            presentation: "modal",
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}