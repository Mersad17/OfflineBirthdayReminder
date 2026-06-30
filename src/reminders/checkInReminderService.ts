import { AppId } from "../contacts/types";
import {
  cancelLocalReminder,
  scheduleLocalReminder,
} from "../notifications/localReminder";

export function buildCheckInNotificationId(contactId: AppId | string) {
  return `reminder-checkin-${String(contactId)}`;
}

export async function cancelCheckInReminder(contactId: AppId | string) {
  await cancelLocalReminder(buildCheckInNotificationId(contactId));
}

export async function scheduleCheckInReminderForContact(args: {
  contactId: AppId | string;
  contactName?: string | null;
  nextTalkAt?: string | null;
}) {
  const sendAt = buildCheckInSendAt(args.nextTalkAt);

  if (!sendAt) {
    console.log("Check-in reminder not scheduled: missing nextTalkAt");
    return null;
  }

  await cancelCheckInReminder(args.contactId);

  return scheduleLocalReminder({
    reminderId: `checkin-${String(args.contactId)}`,
    eventId: `checkin-${String(args.contactId)}`,
    contactId: String(args.contactId),
    kind: "check_in",
    contactName: args.contactName || "Someone",
    message: `Keep it up — check in with ${
      args.contactName || "this person"
    }.`,
    sendAt,
  });
}

function buildCheckInSendAt(value?: string | null): Date | null {
  if (!value) return null;

  const date = parseDateOnly(value);

  if (!date) return null;

  date.setHours(9, 0, 0, 0);

  if (date.getTime() <= Date.now()) {
    return new Date(Date.now() + 5 * 60 * 1000);
  }

  return date;
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  return new Date(year, month - 1, day);
}