import { and, eq, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { contact, contactEvent, reminder } from "../db/schema";
import { scheduleLocalReminder } from "../notifications/localReminder";
import { areLocalNotificationsEnabled } from "../notifications/api";
import { calculateReminderSendAt } from "../reminders/reminderScheduling";
import { REMINDER_STATUS } from "../events/types";

export type RescheduleImportedRemindersResult = {
  scheduled: number;
  skipped: number;
  failed: number;
  notificationsEnabled: boolean;
};

export async function rescheduleActiveImportedReminders(): Promise<RescheduleImportedRemindersResult> {
  const notificationsEnabled = await areLocalNotificationsEnabled();

  const rows = await db
    .select({
      reminderRow: reminder,
      eventRow: contactEvent,
      contactRow: contact,
    })
    .from(reminder)
    .innerJoin(contactEvent, eq(reminder.eventId, contactEvent.id))
    .innerJoin(contact, eq(contactEvent.contactId, contact.id))
    .where(
      and(
        isNull(reminder.deletedAt),
        isNull(contactEvent.deletedAt),
        isNull(contact.deletedAt),
        eq(reminder.isActive, true),
        eq(reminder.status, REMINDER_STATUS.PENDING),
        isNull(reminder.notificationId)
      )
    );

  if (!notificationsEnabled) {
    return {
      scheduled: 0,
      skipped: rows.length,
      failed: 0,
      notificationsEnabled: false,
    };
  }

  let scheduled = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const sendAt = calculateReminderSendAt({
        eventRow: row.eventRow,
        daysBefore: row.reminderRow.daysBefore,
        absoluteDatetime: row.reminderRow.absoluteDatetime,
        sendAt: row.reminderRow.sendAt,
        timeOfDay: row.reminderRow.timeOfDay,
      });

      if (!sendAt) {
        skipped += 1;
        continue;
      }

      const contactName = `${row.contactRow.firstName} ${
        row.contactRow.lastName || ""
      }`.trim();

      const notificationId = await scheduleLocalReminder({
        reminderId: row.reminderRow.id,
        eventId: row.eventRow.id,
        contactId: row.eventRow.contactId,
        title: row.eventRow.title || "Reminder",
        body: contactName
          ? `Remember this for ${contactName}`
          : "You have a reminder.",
        sendAt,
      });

      if (!notificationId) {
        skipped += 1;
        continue;
      }

      await db
        .update(reminder)
        .set({
          sendAt,
          notificationId,
          updatedAt: new Date(),
        })
        .where(eq(reminder.id, row.reminderRow.id));

      scheduled += 1;
    } catch (error) {
      console.log("Failed to reschedule imported reminder", error);
      failed += 1;
    }
  }

  return {
    scheduled,
    skipped,
    failed,
    notificationsEnabled: true,
  };
}