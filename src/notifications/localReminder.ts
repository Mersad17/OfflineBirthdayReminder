import * as Notifications from "expo-notifications";
import { AppId } from "../contacts/types";
import {
  ensureNotificationPermissions,
  REMINDER_CHANNEL_ID,
} from "./notification";

export async function scheduleLocalReminder(args: {
  reminderId: AppId;
  eventId: AppId;
  contactId: AppId;
  title: string;
  body: string;
  sendAt: Date | null;
}): Promise<string | null> {
  if (!args.sendAt) {
    return null;
  }

  if (args.sendAt.getTime() <= Date.now()) {
    return null;
  }

  const granted = await ensureNotificationPermissions();

  if (!granted) {
    return null;
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: args.title,
      body: args.body,
      sound: true,
      data: {
        type: "reminder",
        reminderId: args.reminderId,
        eventId: args.eventId,
        contactId: args.contactId,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: args.sendAt,
      channelId: REMINDER_CHANNEL_ID,
    },
  });

  return notificationId;
}

export async function cancelLocalReminder(notificationId?: string | null) {
  if (!notificationId) return;

  await Notifications.cancelScheduledNotificationAsync(notificationId);
}