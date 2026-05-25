import { and, asc, eq, isNull } from "drizzle-orm";

import { AppId } from "../contacts/types";
import { db } from "../db/client";
import { contact, contactEvent, reminder } from "../db/schema";
import {
  cancelLocalReminder,
  scheduleLocalReminder,
} from "../notifications/localReminder";
import { REMINDER_STATUS, ReminderDTO } from "../events/types";
import { createId } from "../lib/id";


function now() {
  return new Date();
}

function toDateTime(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  return null;
}

function toIso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

function parseTime(time?: string | null) {
  if (!time) {
    return { hour: 9, minute: 0 };
  }

  const [hourRaw, minuteRaw] = time.split(":");

  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return { hour: 9, minute: 0 };
  }

  return { hour, minute };
}

function buildDateTime(dateString: string, time?: string | null): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  const { hour, minute } = parseTime(time);

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/**
 * For non-recurring event:
 * use original event start date.
 *
 * For recurring event:
 * calculate next yearly occurrence.
 */
function getNextEventOccurrence(eventRow: typeof contactEvent.$inferSelect) {
  const originalDate = buildDateTime(
    eventRow.startDate,
    eventRow.startTime
  );

  if (!eventRow.isRecurring) {
    return originalDate;
  }

  const today = new Date();

  const nextOccurrence = new Date(
    today.getFullYear(),
    originalDate.getMonth(),
    originalDate.getDate(),
    originalDate.getHours(),
    originalDate.getMinutes(),
    0,
    0
  );

  if (nextOccurrence.getTime() < today.getTime()) {
    nextOccurrence.setFullYear(nextOccurrence.getFullYear() + 1);
  }

  return nextOccurrence;
}

/**
 * Priority:
 * 1. payload.send_at
 * 2. payload.absolute_datetime
 * 3. event date - days_before at time_of_day
 */
function calculateSendAt(args: {
  eventRow: typeof contactEvent.$inferSelect;
  daysBefore?: number | null;
  absoluteDatetime?: string | null;
  sendAt?: string | null;
  timeOfDay?: string | null;
}): Date | null {
  if (args.sendAt) {
    return toDateTime(args.sendAt);
  }

  if (args.absoluteDatetime) {
    return toDateTime(args.absoluteDatetime);
  }

  const eventOccurrence = getNextEventOccurrence(args.eventRow);

  const calculated = new Date(eventOccurrence);

  const { hour, minute } = parseTime(
    args.timeOfDay ?? args.eventRow.startTime ?? "09:00"
  );

  calculated.setHours(hour, minute, 0, 0);

  if (args.daysBefore !== null && args.daysBefore !== undefined) {
    calculated.setDate(calculated.getDate() - args.daysBefore);
  }

  return calculated;
}

function mapReminderToApi(row: typeof reminder.$inferSelect): ReminderDTO {
  return {
    id: row.id,

    event: row.eventId,

    days_before: row.daysBefore,

    absolute_datetime: toIso(row.absoluteDatetime),

    time_of_day: row.timeOfDay,

    send_at: toIso(row.sendAt),

    status: row.status,

    is_active: row.isActive,

    notification_id: row.notificationId,

    created_at: toIso(row.createdAt) ?? undefined,
    updated_at: toIso(row.updatedAt) ?? undefined,
  };
}

async function fetchReminderById(id: AppId | number): Promise<ReminderDTO> {
  const reminderId = String(id);

  const rows = await db
    .select()
    .from(reminder)
    .where(
      and(
        eq(reminder.id, reminderId),
        isNull(reminder.deletedAt)
      )
    )
    .limit(1);

  if (!rows[0]) {
    throw new Error("Reminder not found");
  }

  return mapReminderToApi(rows[0]);
}

async function fetchEventWithContact(eventId: AppId | number) {
  const rows = await db
    .select({
      event: contactEvent,
      contactRow: contact,
    })
    .from(contactEvent)
    .innerJoin(contact, eq(contactEvent.contactId, contact.id))
    .where(
      and(
        eq(contactEvent.id, String(eventId)),
        isNull(contactEvent.deletedAt),
        isNull(contact.deletedAt)
      )
    )
    .limit(1);

  if (!rows[0]) {
    throw new Error("Event not found");
  }

  return rows[0];
}

export async function fetchReminders(): Promise<ReminderDTO[]> {
  const rows = await db
    .select()
    .from(reminder)
    .where(isNull(reminder.deletedAt))
    .orderBy(asc(reminder.id));

  return rows.map(mapReminderToApi);
}

export async function createReminder(
  eventId: AppId | number,
  payload: Partial<ReminderDTO>
): Promise<ReminderDTO> {
  const date = now();
  const reminderId = await createId();

  const { event, contactRow } = await fetchEventWithContact(eventId);

  const calculatedSendAt = calculateSendAt({
    eventRow: event,
    daysBefore: payload.days_before ?? null,
    absoluteDatetime: payload.absolute_datetime ?? null,
    sendAt: payload.send_at ?? null,
    timeOfDay: payload.time_of_day ?? null,
  });

  const contactName = `${contactRow.firstName} ${
    contactRow.lastName || ""
  }`.trim();

  const isActive = payload.is_active ?? true;

  const notificationId = isActive
    ? await scheduleLocalReminder({
        reminderId,
        eventId: event.id,
        contactId: event.contactId,
        title: event.title || "Reminder",
        body: contactName
          ? `Remember this for ${contactName}`
          : "You have a reminder.",
        sendAt: calculatedSendAt,
      })
    : null;

  await db.insert(reminder).values({
    id: reminderId,

    eventId: event.id,

    daysBefore: payload.days_before ?? null,

    absoluteDatetime: toDateTime(payload.absolute_datetime),

    timeOfDay: payload.time_of_day ?? null,

    status: payload.status ?? REMINDER_STATUS.PENDING,

    sendAt: calculatedSendAt,

    isActive,

    notificationId,

    createdAt: date,
    updatedAt: date,
    deletedAt: null,
  });

  return fetchReminderById(reminderId);
}

export async function updateReminder(
  id: AppId | number,
  payload: Partial<ReminderDTO>
): Promise<ReminderDTO> {
  const reminderId = String(id);

  const oldRows = await db
    .select()
    .from(reminder)
    .where(
      and(
        eq(reminder.id, reminderId),
        isNull(reminder.deletedAt)
      )
    )
    .limit(1);

  const oldReminder = oldRows[0];

  if (!oldReminder) {
    throw new Error("Reminder not found");
  }

  /**
   * Cancel old scheduled notification before creating a new one.
   */
  await cancelLocalReminder(oldReminder.notificationId);

  const eventId = payload.event ?? oldReminder.eventId;
  const { event, contactRow } = await fetchEventWithContact(eventId);

  const mergedDaysBefore =
    payload.days_before !== undefined
      ? payload.days_before
      : oldReminder.daysBefore;

  const mergedAbsoluteDatetime =
    payload.absolute_datetime !== undefined
      ? payload.absolute_datetime
      : toIso(oldReminder.absoluteDatetime);

  const mergedSendAt =
    payload.send_at !== undefined
      ? payload.send_at
      : toIso(oldReminder.sendAt);

  const mergedTimeOfDay =
    payload.time_of_day !== undefined
      ? payload.time_of_day
      : oldReminder.timeOfDay;

  const mergedIsActive =
    payload.is_active !== undefined
      ? payload.is_active
      : oldReminder.isActive;

  const calculatedSendAt = calculateSendAt({
    eventRow: event,
    daysBefore: mergedDaysBefore,
    absoluteDatetime: mergedAbsoluteDatetime,
    sendAt: mergedSendAt,
    timeOfDay: mergedTimeOfDay,
  });

  const contactName = `${contactRow.firstName} ${
    contactRow.lastName || ""
  }`.trim();

  const newNotificationId = mergedIsActive
    ? await scheduleLocalReminder({
        reminderId,
        eventId: event.id,
        contactId: event.contactId,
        title: event.title || "Reminder",
        body: contactName
          ? `Remember this for ${contactName}`
          : "You have a reminder.",
        sendAt: calculatedSendAt,
      })
    : null;

  const updateData: Partial<typeof reminder.$inferInsert> = {
    updatedAt: now(),
    eventId: event.id,
    sendAt: calculatedSendAt,
    notificationId: newNotificationId,
    isActive: mergedIsActive,
  };

  if (payload.days_before !== undefined) {
    updateData.daysBefore = payload.days_before;
  }

  if (payload.absolute_datetime !== undefined) {
    updateData.absoluteDatetime = toDateTime(payload.absolute_datetime);
  }

  if (payload.time_of_day !== undefined) {
    updateData.timeOfDay = payload.time_of_day;
  }

  if (payload.status !== undefined) {
    updateData.status = payload.status;
  }

  await db
    .update(reminder)
    .set(updateData)
    .where(
      and(
        eq(reminder.id, reminderId),
        isNull(reminder.deletedAt)
      )
    );

  return fetchReminderById(reminderId);
}

export async function deleteReminder(id: AppId | number) {
  const reminderId = String(id);

  const rows = await db
    .select()
    .from(reminder)
    .where(
      and(
        eq(reminder.id, reminderId),
        isNull(reminder.deletedAt)
      )
    )
    .limit(1);

  const existing = rows[0];

  if (existing?.notificationId) {
    await cancelLocalReminder(existing.notificationId);
  }

  await db
    .update(reminder)
    .set({
      deletedAt: now(),
      updatedAt: now(),
      isActive: false,
      notificationId: null,
    })
    .where(
      and(
        eq(reminder.id, reminderId),
        isNull(reminder.deletedAt)
      )
    );

  return true;
}