import { AppId } from "../contacts/types";
import { fetchPushStatus } from "./api";
import {
  cancelReminderNotification,
  notificationKindFromEventType,
  scheduleReminderNotification,
} from "./notification";
import type { ReminderNotificationKind } from "./notification";

export type ScheduleLocalReminderArgs = {
  reminderId: AppId | string;
  eventId: AppId | string;
  contactId: AppId | string;

  sendAt: Date | string | null | undefined;

  /**
   * If kind is provided, it wins.
   * If not, we infer from eventType.
   */
  kind?: ReminderNotificationKind;
  eventType?: number | null;

  contactName?: string | null;
  eventTitle?: string | null;
  message?: string | null;

  /**
   * Temporary backward compatibility with current repository calls.
   * Later remove title/body and use eventTitle/message only.
   */
  title?: string | null;
  body?: string | null;
};

export async function scheduleLocalReminder(
  args: ScheduleLocalReminderArgs
): Promise<string | null> {
  const date = normalizeSendAt(args.sendAt);

  if (!date) {
    return null;
  }

  if (date.getTime() <= Date.now()) {
    console.log("Local reminder date is in the past:", date.toISOString());
    return null;
  }

  const status = await fetchPushStatus();

  /**
   * Important:
   * Do NOT block on status.push_enabled here.
   *
   * push_enabled is false when OS permission is not granted yet.
   * If we return here, scheduleReminderNotification() never gets a chance
   * to request permission, so new reminders silently become in-app only.
   *
   * Only block when the user disabled reminders inside the app.
   */
  if (!status.app_enabled) {
    console.log("Local notifications are disabled in app settings.");
    return null;
  }

  const kind = args.kind ?? notificationKindFromEventType(args.eventType);

  return scheduleReminderNotification({
    kind,

    reminderId: String(args.reminderId),
    eventId: String(args.eventId),
    contactId: String(args.contactId),

    contactName: args.contactName,
    eventTitle: args.eventTitle ?? args.title,
    message: args.message ?? args.body,

    sendAt: date,
    identifier: buildReminderIdentifier(args.reminderId),
  });
}

export async function cancelLocalReminder(notificationId?: string | null) {
  await cancelReminderNotification(notificationId);
}

function normalizeSendAt(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    console.log("Invalid local reminder date:", value);
    return null;
  }

  return date;
}

function buildReminderIdentifier(reminderId: AppId | string) {
  return `reminder-${String(reminderId)}`;
}
