import { and, asc, eq, gte, isNull, lte, or } from "drizzle-orm";

import { db } from "../db/client";
import {
  contact,
  contactEvent,
  contactMemory,
  reminder,
} from "../db/schema";

export type CalendarItemType =
  | "birthday"
  | "check_in"
  | "event"
  | "meeting"
  | "reminder"
  | "ask_next_time"
  | "memory_date"
  | "before_meet";

export type CalendarItemSource =
  | "contact_birthday"
  | "contact_talk_next"
  | "contact_event"
  | "reminder"
  | "contact_memory"
  | "virtual_before_meet";

export type CalendarItem = {
  id: string;
  source: CalendarItemSource;
  sourceId: string;

  type: CalendarItemType;

  contactId: string;
  contactName: string;
  contactPhotoUri?: string | null;

  title: string;
  subtitle?: string;

  date: string; // YYYY-MM-DD
  time?: string | null; // HH:mm

  isVirtual?: boolean;
  reminderId?: string | null;
  eventId?: string | null;
  memoryId?: string | null;
};

type FetchCalendarItemsParams = {
  userId?: string;
  startDate: string;
  endDate: string;
  forceRefresh?: boolean;
};

const PENDING_REMINDER_STATUS = 1;
const CACHE_TTL_MS = 20_000;

let calendarCache:
  | {
      key: string;
      createdAt: number;
      items: CalendarItem[];
    }
  | null = null;

export async function fetchCalendarItems({
  userId = "local",
  startDate,
  endDate,
  forceRefresh = false,
}: FetchCalendarItemsParams): Promise<CalendarItem[]> {
  const cacheKey = `${userId}:${startDate}:${endDate}`;
  const now = Date.now();

  if (
    !forceRefresh &&
    calendarCache &&
    calendarCache.key === cacheKey &&
    now - calendarCache.createdAt < CACHE_TTL_MS
  ) {
    return calendarCache.items;
  }

  const [contacts, events, reminders, memories] = await Promise.all([
    fetchCalendarContacts(userId),
    fetchCalendarEvents(userId, startDate, endDate),
    fetchCalendarReminders(userId, startDate, endDate),
    fetchCalendarMemories(userId, startDate, endDate),
  ]);

  const items: CalendarItem[] = [];

  for (const person of contacts) {
    const contactName = getContactName(person);

    const birthdayDate = getNextRecurringDateInRange(
      person.birthday,
      startDate,
      endDate
    );

    if (birthdayDate) {
      items.push({
        id: `birthday-${person.id}-${birthdayDate}`,
        source: "contact_birthday",
        sourceId: person.id,
        type: "birthday",
        contactId: person.id,
        contactName,
        contactPhotoUri: person.photoUri,
        title: `${contactName}'s Birthday`,
        subtitle: "Celebrate their special day",
        date: birthdayDate,
        time: null,
      });
    }

    if (person.talkNextAt && isDateInRange(person.talkNextAt, startDate, endDate)) {
      items.push({
        id: `check-in-${person.id}-${person.talkNextAt}`,
        source: "contact_talk_next",
        sourceId: person.id,
        type: "check_in",
        contactId: person.id,
        contactName,
        contactPhotoUri: person.photoUri,
        title: `Reach out to ${contactName}`,
        subtitle: buildCheckInSubtitle(person.talkEveryDays),
        date: person.talkNextAt,
        time: null,
      });
    }
  }

  for (const row of events) {
    const eventDate = getEventDateInRange(
      row.event.startDate,
      Boolean(row.event.isRecurring),
      startDate,
      endDate
    );

    if (!eventDate) continue;

    const contactName = getContactName(row.person);
    const itemType = getCalendarTypeFromEvent(row.event.type);

    const eventItem: CalendarItem = {
      id: `event-${row.event.id}-${eventDate}`,
      source: "contact_event",
      sourceId: row.event.id,
      type: itemType,
      contactId: row.person.id,
      contactName,
      contactPhotoUri: row.person.photoUri,
      title: row.event.title,
      subtitle: buildEventSubtitle(row.event.type, contactName),
      date: eventDate,
      time: row.event.startTime,
      eventId: row.event.id,
    };

    items.push(eventItem);

    if (shouldCreateBeforeMeet(eventItem)) {
      items.push(createBeforeMeetItem(eventItem));
    }
  }

  for (const row of reminders) {
    if (!row.reminder.sendAt) continue;

    const sendDate = normalizeDateObject(row.reminder.sendAt);
    if (!sendDate) continue;

    const reminderDate = toYMD(sendDate);

    items.push({
      id: `reminder-${row.reminder.id}`,
      source: "reminder",
      sourceId: row.reminder.id,
      type: "reminder",
      contactId: row.person.id,
      contactName: getContactName(row.person),
      contactPhotoUri: row.person.photoUri,
      title: row.event.title,
      subtitle: `Reminder for ${getContactName(row.person)}`,
      date: reminderDate,
      time: toHHMM(sendDate),
      reminderId: row.reminder.id,
      eventId: row.event.id,
    });
  }

  for (const row of memories) {
    if (!row.memory.date) continue;

    const contactName = getContactName(row.person);
    const isAskNext = row.memory.memoryType === "ask_next_time";

    items.push({
      id: `memory-${row.memory.id}`,
      source: "contact_memory",
      sourceId: row.memory.id,
      type: isAskNext ? "ask_next_time" : "memory_date",
      contactId: row.person.id,
      contactName,
      contactPhotoUri: row.person.photoUri,
      title: isAskNext
        ? `Ask ${contactName} next time`
        : `Memory with ${contactName}`,
      subtitle: row.memory.text,
      date: row.memory.date,
      time: null,
      memoryId: row.memory.id,
    });
  }

  const finalItems = removeDuplicates(items).sort(sortCalendarItems);

  calendarCache = {
    key: cacheKey,
    createdAt: now,
    items: finalItems,
  };

  return finalItems;
}

export async function completeReminder(reminderId: string) {
  await db
    .update(reminder)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(reminder.id, reminderId));

  clearCalendarCache();
}

export function clearCalendarCache() {
  calendarCache = null;
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                      */
/* -------------------------------------------------------------------------- */

async function fetchCalendarContacts(userId: string) {
  return db
    .select({
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      birthday: contact.birthday,
      talkEveryDays: contact.talkEveryDays,
      talkNextAt: contact.talkNextAt,
      photoUri: contact.photoUri,
    })
    .from(contact)
    .where(and(eq(contact.userId, userId), isNull(contact.deletedAt)));
}

async function fetchCalendarEvents(
  userId: string,
  startDate: string,
  endDate: string
) {
  return db
    .select({
      event: {
        id: contactEvent.id,
        title: contactEvent.title,
        type: contactEvent.type,
        startDate: contactEvent.startDate,
        startTime: contactEvent.startTime,
        isRecurring: contactEvent.isRecurring,
      },
      person: {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        photoUri: contact.photoUri,
      },
    })
    .from(contactEvent)
    .innerJoin(contact, eq(contactEvent.contactId, contact.id))
    .where(
      and(
        eq(contactEvent.userId, userId),
        eq(contactEvent.isActive, true),
        isNull(contactEvent.deletedAt),
        isNull(contact.deletedAt),
        or(
          eq(contactEvent.isRecurring, true),
          and(
            gte(contactEvent.startDate, startDate),
            lte(contactEvent.startDate, endDate)
          )
        )
      )
    )
    .orderBy(asc(contactEvent.startDate));
}

async function fetchCalendarReminders(
  userId: string,
  startDate: string,
  endDate: string
) {
  const start = startOfDay(parseYMD(startDate) ?? new Date());
  const end = endOfDay(parseYMD(endDate) ?? new Date());

  return db
    .select({
      reminder: {
        id: reminder.id,
        sendAt: reminder.sendAt,
      },
      event: {
        id: contactEvent.id,
        title: contactEvent.title,
      },
      person: {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        photoUri: contact.photoUri,
      },
    })
    .from(reminder)
    .innerJoin(contactEvent, eq(reminder.eventId, contactEvent.id))
    .innerJoin(contact, eq(contactEvent.contactId, contact.id))
    .where(
      and(
        eq(contact.userId, userId),
        eq(reminder.isActive, true),
        eq(reminder.status, PENDING_REMINDER_STATUS),
        isNull(reminder.deletedAt),
        isNull(contactEvent.deletedAt),
        isNull(contact.deletedAt),
        gte(reminder.sendAt, start),
        lte(reminder.sendAt, end)
      )
    )
    .orderBy(asc(reminder.sendAt));
}

async function fetchCalendarMemories(
  userId: string,
  startDate: string,
  endDate: string
) {
  return db
    .select({
      memory: {
        id: contactMemory.id,
        text: contactMemory.text,
        memoryType: contactMemory.memoryType,
        date: contactMemory.date,
      },
      person: {
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        photoUri: contact.photoUri,
      },
    })
    .from(contactMemory)
    .innerJoin(contact, eq(contactMemory.contactId, contact.id))
    .where(
      and(
        eq(contact.userId, userId),
        isNull(contactMemory.deletedAt),
        isNull(contact.deletedAt),
        gte(contactMemory.date, startDate),
        lte(contactMemory.date, endDate)
      )
    )
    .orderBy(asc(contactMemory.date));
}

/* -------------------------------------------------------------------------- */
/* Mapping                                                                      */
/* -------------------------------------------------------------------------- */

function getContactName(person: {
  firstName: string;
  lastName?: string | null;
}) {
  return `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim() || "Unknown";
}

function buildCheckInSubtitle(talkEveryDays?: number | null) {
  if (!talkEveryDays) return "Relationship rhythm reminder";

  return `You wanted to stay in touch every ${talkEveryDays} days`;
}

function buildEventSubtitle(type: number, contactName: string) {
  return `${getEventTypeLabel(type)} with ${contactName}`;
}

function getCalendarTypeFromEvent(type: number): CalendarItemType {
  if (type === 1) return "birthday";
  if (type === 4) return "meeting";

  return "event";
}

function getEventTypeLabel(type: number) {
  switch (type) {
    case 1:
      return "Birthday";
    case 2:
      return "Call";
    case 3:
      return "Gift";
    case 4:
      return "Meeting";
    case 5:
      return "Interaction";
    case 6:
      return "Event";
    default:
      return "Moment";
  }
}

function shouldCreateBeforeMeet(item: CalendarItem) {
  if (item.type !== "meeting" && item.type !== "event") return false;

  const itemDate = parseYMD(item.date);
  if (!itemDate) return false;

  const diff = daysBetween(startOfToday(), itemDate);

  return diff >= 0 && diff <= 7;
}

function createBeforeMeetItem(item: CalendarItem): CalendarItem {
  return {
    id: `before-meet-${item.id}`,
    source: "virtual_before_meet",
    sourceId: item.sourceId,
    type: "before_meet",
    contactId: item.contactId,
    contactName: item.contactName,
    contactPhotoUri: item.contactPhotoUri,
    title: `Prepare for ${item.contactName}`,
    subtitle: item.time
      ? `Meeting at ${formatSimpleTime(item.time)}`
      : `Review what to remember before ${item.title}`,
    date: item.date,
    time: subtractOneHour(item.time),
    eventId: item.eventId,
    isVirtual: true,
  };
}

/* -------------------------------------------------------------------------- */
/* Dates                                                                        */
/* -------------------------------------------------------------------------- */

function startOfToday() {
  return startOfDay(new Date());
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  );
}

function normalizeDateObject(value: Date | number | string | null | undefined) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseYMD(value?: string | null) {
  if (!value) return null;

  const [yearRaw, monthRaw, dayRaw] = value.slice(0, 10).split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function toYMD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toHHMM(date: Date) {
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${hour}:${minute}`;
}

function isDateInRange(date: string, startDate: string, endDate: string) {
  return date >= startDate && date <= endDate;
}

function getNextRecurringDateInRange(
  originalDate: string | null,
  startDate: string,
  endDate: string
) {
  if (!originalDate) return null;

  const parsed = parseYMD(originalDate);
  const start = parseYMD(startDate);

  if (!parsed || !start) return null;

  const yearsToCheck = [start.getFullYear(), start.getFullYear() + 1];

  for (const year of yearsToCheck) {
    const candidate = new Date(year, parsed.getMonth(), parsed.getDate());
    const candidateYMD = toYMD(candidate);

    if (candidateYMD >= startDate && candidateYMD <= endDate) {
      return candidateYMD;
    }
  }

  return null;
}

function getEventDateInRange(
  startDateValue: string,
  isRecurring: boolean,
  startDate: string,
  endDate: string
) {
  if (!isRecurring) {
    return isDateInRange(startDateValue, startDate, endDate)
      ? startDateValue
      : null;
  }

  return getNextRecurringDateInRange(startDateValue, startDate, endDate);
}

function daysBetween(from: Date, to: Date) {
  const start = startOfDay(from).getTime();
  const end = startOfDay(to).getTime();

  return Math.round((end - start) / 86_400_000);
}

function subtractOneHour(time?: string | null) {
  if (!time) return null;

  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;

  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setHours(date.getHours() - 1);

  return toHHMM(date);
}

function formatSimpleTime(time: string) {
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;

  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortCalendarItems(a: CalendarItem, b: CalendarItem) {
  if (a.date !== b.date) return a.date.localeCompare(b.date);

  const aTime = a.time ?? "99:99";
  const bTime = b.time ?? "99:99";

  return aTime.localeCompare(bTime);
}

function removeDuplicates(items: CalendarItem[]) {
  const map = new Map<string, CalendarItem>();

  for (const item of items) {
    map.set(item.id, item);
  }

  return Array.from(map.values());
}