import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const REMINDER_CHANNEL_ID = "relationship_reminders";

export type ReminderNotificationKind =
  | "birthday"
  | "anniversary"
  | "important_date"
  | "meeting"
  | "holiday"
  | "event"
  | "check_in"
  | "ask_next_time"
  | "generic"
  | "test";

export type ReminderNotificationArgs = {
  kind?: ReminderNotificationKind;

  contactName?: string | null;
  eventTitle?: string | null;
  message?: string | null;

  reminderId?: string | null;
  eventId?: string | null;
  contactId?: string | null;
};

export type ScheduleReminderNotificationArgs = ReminderNotificationArgs & {
  sendAt: Date | string;
  identifier?: string;
};

const TEST_NOTIFICATION_KINDS: ReminderNotificationKind[] = [
  "test",
  "birthday",
  "anniversary",
  "important_date",
  "meeting",
  "holiday",
  "event",
  "check_in",
  "ask_next_time",
  "generic",
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function configureAndroidChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: "Relationship reminders",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FFFFFF",
    lockscreenVisibility:
      Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  await configureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();

  if (existing.granted || existing.status === "granted") {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });

  return Boolean(requested.granted || requested.status === "granted");
}

export async function scheduleReminderNotification(
  args: ScheduleReminderNotificationArgs
): Promise<string | null> {
  const allowed = await ensureNotificationPermissions();

  if (!allowed) {
    console.log("Notification permission was not granted.");
    return null;
  }

  const date =
    typeof args.sendAt === "string" ? new Date(args.sendAt) : args.sendAt;

  if (Number.isNaN(date.getTime())) {
    console.log("Invalid notification date:", args.sendAt);
    return null;
  }

  if (date.getTime() <= Date.now()) {
    console.log("Notification date is in the past:", date.toISOString());
    return null;
  }

  try {
    return await Notifications.scheduleNotificationAsync({
      identifier: args.identifier,
      content: buildReminderNotificationContent(args),
      trigger: buildDateTrigger(date),
    });
  } catch (error) {
    console.log("Schedule notification failed:", error);
    return null;
  }
}

export async function scheduleTestNotification(
  kind: ReminderNotificationKind = "test"
): Promise<string | null> {
  const allowed = await ensureNotificationPermissions();

  if (!allowed) {
    return null;
  }

  try {
    return await Notifications.scheduleNotificationAsync({
      identifier: `test-${kind}-${Date.now()}`,
      content: buildReminderNotificationContent(getTestNotificationArgs(kind)),
      trigger: buildTimeIntervalTrigger(2),
    });
  } catch (error) {
    console.log("Schedule test notification failed:", error);
    return null;
  }
}

export async function scheduleAllTestNotifications(): Promise<string[]> {
  const allowed = await ensureNotificationPermissions();

  if (!allowed) {
    return [];
  }

  const ids: string[] = [];
  const createdAt = Date.now();

  for (let index = 0; index < TEST_NOTIFICATION_KINDS.length; index += 1) {
    const kind = TEST_NOTIFICATION_KINDS[index];
    const seconds = 2 + index * 4;

    try {
      const id = await Notifications.scheduleNotificationAsync({
        identifier: `test-${kind}-${createdAt}`,
        content: buildReminderNotificationContent(getTestNotificationArgs(kind)),
        trigger: buildTimeIntervalTrigger(seconds),
      });

      ids.push(id);
    } catch (error) {
      console.log(`Schedule ${kind} test notification failed:`, error);
    }
  }

  return ids;
}

export async function cancelReminderNotification(
  notificationId?: string | null
) {
  if (!notificationId) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.log("Cancel notification failed:", error);
  }
}

export async function cancelAllScheduledNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.log("Cancel all scheduled notifications failed:", error);
  }
}

export async function getScheduledReminderNotifications() {
  return Notifications.getAllScheduledNotificationsAsync();
}

export function buildReminderNotificationContent(
  args: ReminderNotificationArgs
): Notifications.NotificationContentInput {
  const kind = args.kind ?? "generic";
  const contactName = cleanName(args.contactName);
  const eventTitle = cleanText(args.eventTitle);
  const message = cleanText(args.message);

  const copy = getNotificationCopy({
    kind,
    contactName,
    eventTitle,
    message,
  });

  return {
    title: limitText(copy.title, 70),
    body: limitText(copy.body, 140),
    sound: true,
    data: {
      type: kind === "test" ? "test_notification" : "relationship_reminder",
      kind,
      reminderId: args.reminderId ?? null,
      eventId: args.eventId ?? null,
      contactId: args.contactId ?? null,
      contactName,
    },
  };
}

export function notificationKindFromEventType(
  eventType?: number | null
): ReminderNotificationKind {
  switch (eventType) {
    case 1:
      return "birthday";
    case 2:
      return "anniversary";
    case 3:
      return "important_date";
    case 4:
      return "meeting";
    case 5:
      return "holiday";
    case 6:
      return "event";
    default:
      return "generic";
  }
}

export function getTestNotificationArgs(
  kind: ReminderNotificationKind
): ReminderNotificationArgs {
  switch (kind) {
    case "birthday":
      return {
        kind,
        contactName: "Sarah",
        eventTitle: "Birthday",
      };

    case "anniversary":
      return {
        kind,
        contactName: "Emma",
        eventTitle: "Work anniversary",
      };

    case "important_date":
      return {
        kind,
        contactName: "Arben",
        eventTitle: "Important appointment",
      };

    case "meeting":
      return {
        kind,
        contactName: "Maria",
        eventTitle: "Coffee tomorrow at 10:00",
      };

    case "holiday":
      return {
        kind,
        contactName: "Luan",
        eventTitle: "Wish a happy holiday",
      };

    case "event":
      return {
        kind,
        contactName: "Alex",
        eventTitle: "Dinner at 20:00",
      };

    case "check_in":
      return {
        kind,
        contactName: "John",
        message: "You planned to check in this week.",
      };

    case "ask_next_time":
      return {
        kind,
        contactName: "Sarah",
        message: "Ask about her new job.",
      };

    case "generic":
      return {
        kind,
        contactName: "Daniel",
        eventTitle: "Follow up reminder",
      };

    case "test":
    default:
      return {
        kind: "test",
      };
  }
}

function buildDateTrigger(date: Date): Notifications.NotificationTriggerInput {
  if (Platform.OS === "android") {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: REMINDER_CHANNEL_ID,
    };
  }

  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date,
  };
}

function buildTimeIntervalTrigger(
  seconds: number
): Notifications.NotificationTriggerInput {
  if (Platform.OS === "android") {
    return {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
      channelId: REMINDER_CHANNEL_ID,
    };
  }

  return {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds,
    repeats: false,
  };
}

function getNotificationCopy(args: {
  kind: ReminderNotificationKind;
  contactName: string;
  eventTitle: string;
  message: string;
}) {
  const name = args.contactName || "Someone";
  const title = args.eventTitle;
  const message = args.message;

  if (args.kind === "birthday") {
    return {
      title: `🎂 ${name}’s birthday today`,
      body: message || "Send a thoughtful message or open the app to prepare.",
    };
  }

  if (args.kind === "anniversary") {
    return {
      title: `💍 Important anniversary for ${name}`,
      body: message || title || "Open the app and remember this moment.",
    };
  }

  if (args.kind === "important_date") {
    return {
      title: `⭐ Important date for ${name}`,
      body: message || title || "Open the app and prepare a thoughtful action.",
    };
  }

  if (args.kind === "meeting") {
    return {
      title: `🤝 Prepare for ${name}`,
      body: message || title || "Review your notes before the meeting.",
    };
  }

  if (args.kind === "holiday") {
    return {
      title: `🏝 Reminder for ${name}`,
      body: message || title || "You saved this moment as important.",
    };
  }

  if (args.kind === "check_in") {
    return {
      title: `💬 Time to check in with ${name}`,
      body: message || "Send a message, call, or log a quick interaction.",
    };
  }

  if (args.kind === "ask_next_time") {
    return {
      title: `❓ Ask ${name} next time`,
      body: message || "You saved something to ask in your next conversation.",
    };
  }

  if (args.kind === "test") {
    return {
      title: "Birthdayly test reminder",
      body: "Your local reminders are working.",
    };
  }

  return {
    title: `Reminder for ${name}`,
    body: message || title || "Open the app and take action.",
  };
}

function cleanName(value?: string | null) {
  const clean = cleanText(value);

  return clean || "Someone";
}

function cleanText(value?: string | null) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function limitText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;

  return `${value.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}
