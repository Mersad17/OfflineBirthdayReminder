// src/navigation/RootNavigator.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AppTabs from "./AppTabs";
import AddContactScreen from "../screens/Contacts/AddContactScreen";
import AddEventScreen from "../screens/Events/AddEventScreen";
import AddSmartReminderScreen from "../screens/Reminders/AddSmartReminderScreen";

import { AppearanceProvider } from "../appearance/AppearanceContext";
import { useNavigationAppearance } from "../appearance/useNavigationAppearance";
import { AppId } from "../contacts/types";
import { AccessProvider } from "../access/AccessContext";


import { useNotificationTapNavigation } from "../notifications/notificationNavigation";
import { flushPendingNotificationNavigation, navigationRef } from "../notifications/navigationRef";

export type RootStackParamList = {
  MainTabs: undefined;

  GlobalAddContact: undefined;

  GlobalAddReminder:
    | {
        contactId?: AppId;
        contactName?: string;
        note?: string;
        mode?: "reminder" | "ask_next_time";
        title?: string;
      }
    | undefined;

  GlobalAddEvent:
    | {
        contactId?: AppId;
        contactName?: string;
        initialType?: 1 | 2 | 3 | 4 | 5 | 6;
        initialTitle?: string;
      }
    | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <AppearanceProvider>
      <AccessProvider>
        <NavigationWithAppearance />
      </AccessProvider>
    </AppearanceProvider>
  );
}

function NavigationWithAppearance() {
  const { navTheme } = useNavigationAppearance();

  useNotificationTapNavigation();

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      onReady={flushPendingNotificationNavigation}
    >
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
          component={AddSmartReminderScreen as any}
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />

        <Stack.Screen
          name="GlobalAddEvent"
          component={AddEventScreen as any}
          options={{
            headerShown: false,
            presentation: "modal",
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}