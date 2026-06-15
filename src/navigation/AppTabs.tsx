import React from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import ContactsStack from "./ContactsStack";
import EventsStack from "./EventsStack";
import SettingsStack from "./SettingsStack";
import HomeStackNavigator from "./HomeStackNavigation";
import { useAppearance } from "../appearance/AppearanceContext";
import { useAccess } from "../access/AccessContext";

const Tab = createBottomTabNavigator();

type AddMenuColors = {
  card: string;
  title: string;
  text: string;
  primary: string;
  buttonText: string;
  border: string;
  softPrimary: string;
  softCard: string;
};

function EmptyAddScreen() {
  return null;
}

function withAlpha(color: string, alpha: string) {
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return `${color}${alpha}`;
  }

  return color;
}

function makeAddMenuColors(settings: any): AddMenuColors {
  return {
    card: settings.cardColor,
    title: settings.titleColor,
    text: settings.textColor,
    primary: settings.primaryColor,
    buttonText: settings.buttonTextColor || "#FFFFFF",
    border: withAlpha(settings.textColor, "16"),
    softPrimary: withAlpha(settings.primaryColor, "14"),
    softCard: withAlpha(settings.textColor, "08"),
  };
}

export default function AppTabs() {
  const { settings } = useAppearance();
  const { checkCanCreateContact } = useAccess();

  const [addMenuVisible, setAddMenuVisible] = React.useState(false);
  const addTabNavigationRef = React.useRef<any>(null);

  const addMenuColors = React.useMemo(
    () => makeAddMenuColors(settings),
    [settings]
  );

  function openAddMenu(navigation: any) {
    addTabNavigationRef.current = navigation;
    setAddMenuVisible(true);
  }

  function closeAddMenu() {
    setAddMenuVisible(false);
  }

  function getTabNavigation() {
    return addTabNavigationRef.current;
  }

function getRootNavigation() {
  return (
    addTabNavigationRef.current?.getParent?.() ??
    addTabNavigationRef.current
  );
}
  async function goToAddContact() {
    closeAddMenu();

    const result = await checkCanCreateContact();

    if (!result.allowed) {
      Alert.alert(
        "Your memory circle is full",
        result.maxContacts === "unlimited"
          ? "You can add unlimited people."
          : `You have ${result.activeContactCount}/${result.maxContacts} people. Upgrade later to keep adding more people.`,
        [{ text: "OK", style: "default" }]
      );

      return;
    }

    requestAnimationFrame(() => {
      const rootNavigation = getRootNavigation();
      rootNavigation?.navigate?.("GlobalAddContact");
    });
  }

function goToSmartReminder() {
  closeAddMenu();

  requestAnimationFrame(() => {
    const rootNavigation = getRootNavigation();

    rootNavigation?.navigate?.("GlobalAddReminder");
  });
}

function goToAskNextTime() {
  closeAddMenu();

  requestAnimationFrame(() => {
    const rootNavigation = getRootNavigation();

    rootNavigation?.navigate?.("GlobalAddReminder", {
      mode: "ask_next_time",
      title: "Ask next time",
    });
  });
}

function goToAddEvent() {
  closeAddMenu();

  requestAnimationFrame(() => {
    const rootNavigation = getRootNavigation();

    rootNavigation?.navigate?.("GlobalAddEvent");
  });
}

function goToAddBirthday() {
  closeAddMenu();

  requestAnimationFrame(() => {
    const rootNavigation = getRootNavigation();

    rootNavigation?.navigate?.("GlobalAddEvent", {
      initialType: 1,
      initialTitle: "Birthday",
    });
  });
}

  function goToCheckInRhythm() {
    closeAddMenu();

    requestAnimationFrame(() => {
      const tabNavigation = getTabNavigation();

      tabNavigation?.navigate?.("Contacts");

      Alert.alert(
        "Choose a person",
        "Open a person profile, then set their check-in rhythm. Next we can make this open a dedicated check-in screen directly.",
        [{ text: "OK" }]
      );
    });
  }

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: settings.primaryColor,
          tabBarInactiveTintColor: withAlpha(settings.textColor, "80"),
          tabBarStyle: {
            backgroundColor: settings.cardColor,
            borderTopColor: withAlpha(settings.textColor, "14"),
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
          },
          tabBarIcon: ({ color, size, focused }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === "Home") {
              iconName = focused ? "home" : "home-outline";
            } else if (route.name === "Contacts") {
              iconName = focused ? "people" : "people-outline";
            } else if (route.name === "Add") {
              return (
                <View
                  style={[
                    styles.addTabIcon,
                    {
                      backgroundColor: settings.primaryColor,
                      shadowColor: settings.primaryColor,
                    },
                  ]}
                >
                  <Ionicons name="add" size={28} color="#FFFFFF" />
                </View>
              );
            } else if (route.name === "Events") {
              iconName = focused ? "calendar" : "calendar-outline";
            } else {
              iconName = focused ? "settings" : "settings-outline";
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeStackNavigator}
          options={{ tabBarLabel: "Today" }}
        />

        <Tab.Screen
          name="Contacts"
          component={ContactsStack}
          options={{
            headerShown: false,
            tabBarLabel: "People",
          }}
        />

        <Tab.Screen
          name="Add"
          component={EmptyAddScreen}
          options={{
            tabBarLabel: "",
          }}
          listeners={({ navigation }) => ({
            tabPress: (event) => {
              event.preventDefault();
              openAddMenu(navigation);
            },
          })}
        />

        <Tab.Screen
          name="Events"
          component={EventsStack}
          options={{
            headerShown: false,
            tabBarLabel: "Calendar",
          }}
        />

        <Tab.Screen
          name="Settings"
          component={SettingsStack}
          options={({ route }) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? "Settings";

            const hideOnScreens = [
              "Profile",
              "Appearance",
              "Notifications",
              "AppInfo",
            ];

            return {
              headerShown: false,
              tabBarStyle: hideOnScreens.includes(routeName)
                ? { display: "none" }
                : {
                    backgroundColor: settings.cardColor,
                    borderTopColor: withAlpha(settings.textColor, "14"),
                  },
            };
          }}
        />
      </Tab.Navigator>

      <CreateMenuModal
        visible={addMenuVisible}
        onClose={closeAddMenu}
        onAddContact={goToAddContact}
        onSmartReminder={goToSmartReminder}
        onAskNextTime={goToAskNextTime}
        onAddEvent={goToAddEvent}
        onAddBirthday={goToAddBirthday}
        onCheckInRhythm={goToCheckInRhythm}
        colors={addMenuColors}
      />
    </>
  );
}

function CreateMenuModal({
  visible,
  onClose,
  onAddContact,
  onSmartReminder,
  onAskNextTime,
  onAddEvent,
  onAddBirthday,
  onCheckInRhythm,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onAddContact: () => void;
  onSmartReminder: () => void;
  onAskNextTime: () => void;
  onAddEvent: () => void;
  onAddBirthday: () => void;
  onCheckInRhythm: () => void;
  colors: AddMenuColors;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.card }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

          <View style={styles.sheetHeader}>
            <View
              style={[
                styles.sheetIcon,
                { backgroundColor: colors.softPrimary },
              ]}
            >
              <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
            </View>

            <View style={styles.sheetTitleWrap}>
              <Text style={[styles.sheetEyebrow, { color: colors.primary }]}>
                ADD MOMENT
              </Text>

              <Text style={[styles.sheetTitle, { color: colors.title }]}>
                What do you want to add?
              </Text>

              <Text style={[styles.sheetSubtitle, { color: colors.text }]}>
                Create a person, reminder, event, birthday, or follow-up from one place.
              </Text>
            </View>
          </View>

          <View style={styles.actionList}>
            <CreateAction
              icon="person-add-outline"
              title="New person"
              subtitle="Create a private memory profile."
              onPress={onAddContact}
              colors={colors}
            />

            <CreateAction
              icon="notifications-outline"
              title="Smart reminder"
              subtitle="Remember to call, ask, follow up, or do something."
              onPress={onSmartReminder}
              colors={colors}
            />

            <CreateAction
              icon="calendar-outline"
              title="Event"
              subtitle="Add a meeting, important date, holiday, or moment."
              onPress={onAddEvent}
              colors={colors}
            />

            <CreateAction
              icon="chatbubble-ellipses-outline"
              title="Ask next time"
              subtitle="Save a question to remember for the next conversation."
              onPress={onAskNextTime}
              colors={colors}
            />

            <View style={styles.twoColumnRow}>
              <SmallCreateAction
                icon="gift-outline"
                title="Birthday"
                subtitle="Add a special date"
                onPress={onAddBirthday}
                colors={colors}
              />

              <SmallCreateAction
                icon="heart-outline"
                title="Check-in"
                subtitle="Stay in touch"
                onPress={onCheckInRhythm}
                colors={colors}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.softCard }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={[styles.cancelText, { color: colors.text }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CreateAction({
  icon,
  title,
  subtitle,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  colors: AddMenuColors;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.actionRow,
        {
          backgroundColor: colors.softPrimary,
          borderColor: withAlpha(colors.primary, "26"),
        },
      ]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <View
        style={[
          styles.actionIcon,
          { backgroundColor: withAlpha(colors.primary, "18") },
        ]}
      >
        <Ionicons name={icon} size={23} color={colors.primary} />
      </View>

      <View style={styles.actionTextWrap}>
        <Text style={[styles.actionTitle, { color: colors.title }]}>
          {title}
        </Text>

        <Text style={[styles.actionSubtitle, { color: colors.text }]}>
          {subtitle}
        </Text>
      </View>

      <View
        style={[
          styles.actionArrow,
          { backgroundColor: withAlpha(colors.primary, "12") },
        ]}
      >
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

function SmallCreateAction({
  icon,
  title,
  subtitle,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  colors: AddMenuColors;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.smallAction,
        {
          backgroundColor: colors.softCard,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <View
        style={[
          styles.smallActionIcon,
          { backgroundColor: colors.softPrimary },
        ]}
      >
        <Ionicons name={icon} size={19} color={colors.primary} />
      </View>

      <Text
        style={[styles.smallActionTitle, { color: colors.title }]}
        numberOfLines={1}
      >
        {title}
      </Text>

      <Text
        style={[styles.smallActionSubtitle, { color: colors.text }]}
        numberOfLines={1}
      >
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  addTabIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Platform.OS === "android" ? 2 : 0,
    shadowOpacity: 0.32,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(20, 14, 10, 0.48)",
    justifyContent: "flex-end",
  },

  sheet: {
    marginHorizontal: 12,
    marginBottom: Platform.OS === "ios" ? 28 : 18,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },

  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    marginBottom: 16,
  },

  sheetHeader: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },

  sheetIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  sheetTitleWrap: {
    flex: 1,
    minWidth: 0,
  },

  sheetEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 5,
  },

  sheetTitle: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "900",
  },

  sheetSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    marginTop: 6,
    opacity: 0.78,
  },

  actionList: {
    gap: 10,
  },

  actionRow: {
    minHeight: 76,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 12,
  },

  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  actionTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  actionTitle: {
    fontSize: 16,
    fontWeight: "900",
  },

  actionSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    marginTop: 3,
    opacity: 0.78,
  },

  actionArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  twoColumnRow: {
    flexDirection: "row",
    gap: 10,
  },

  smallAction: {
    flex: 1,
    minHeight: 104,
    borderRadius: 22,
    borderWidth: 1,
    padding: 12,
  },

  smallActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  smallActionTitle: {
    fontSize: 14,
    fontWeight: "900",
  },

  smallActionSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 3,
    opacity: 0.72,
  },

  cancelButton: {
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  cancelText: {
    fontSize: 14,
    fontWeight: "900",
  },
});