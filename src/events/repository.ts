import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  lt,
  or,
  type SQL,
} from "drizzle-orm";

import { AppId, Contact } from "../contacts/types";
import { db } from "../db/client";
import { contact, contactEvent } from "../db/schema";

import {
  CreateEventInput,
  EventDTO,
  EventTypeValue,
  HomeEventDTO,
  HomeSummaryDTO,
  UpdateEventPayload,
} from "./types";
import { createId } from "../lib/id";

const LOCAL_USER_ID = "local";
const PAGE_SIZE = 50;

export type FetchEventsParams = {
  filter?: "upcoming" | "past" | "no_reminder";
  page?: number;
  q?: string;
  no_reminder?: boolean;
  type?: EventTypeValue[];
  contact_id?: AppId | number;
};

function now() {
  return new Date();
}

function todayDateOnly() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toDateOnly(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return String(value).slice(0, 10);
}

function toIso(value: Date | null | undefined): string {
  if (!value) return new Date().toISOString();
  return value.toISOString();
}

function toId(id: AppId | number | null | undefined): string | null {
  if (id === null || id === undefined || id === "") return null;
  return String(id);
}

function parseDateOnly(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);

  if (!year || !month || !day) {
    return new Date(dateString);
  }

  return new Date(year, month - 1, day);
}

function daysBetweenToday(dateString: string) {
  const today = new Date();
  const target = parseDateOnly(dateString);

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diff = target.getTime() - today.getTime();

  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function getMonthLabel(dateString: string) {
  const date = parseDateOnly(dateString);

  return date.toLocaleDateString(undefined, {
    month: "long",
  });
}

function getDurationMinutes(args: {
  startDate: string;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
}) {
  if (!args.startTime || !args.endTime) return null;

  const start = new Date(`${args.startDate}T${args.startTime}`);
  const end = new Date(`${args.endDate || args.startDate}T${args.endTime}`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const diff = end.getTime() - start.getTime();

  if (diff <= 0) return null;

  return Math.round(diff / 60000);
}

function mapContactMini(row: typeof contact.$inferSelect | null) {
  if (!row) return null;

  return {
    id: row.id,
    first_name: row.firstName,
    last_name: row.lastName,
    birthday: row.birthday,
    email: row.email,
    phone: row.phone,
    group: row.groupId,
    is_favorite: row.isFavorite,
    created_at: toIso(row.createdAt),
    short_description: row.shortDescription,
    photo: row.photoUri,
    photo_uri: row.photoUri,
    talk_every_days: row.talkEveryDays,
    talk_last_at: row.talkLastAt,
    talk_next_at: row.talkNextAt,
    talk_notified_at: row.talkNotifiedAt,
  };
}

function mapEventToApi(row: {
  event: typeof contactEvent.$inferSelect;
  contactRow?: typeof contact.$inferSelect | null;
}): EventDTO {
  const contactName = row.contactRow
    ? `${row.contactRow.firstName} ${row.contactRow.lastName || ""}`.trim()
    : "";

  const daysUntil = daysBetweenToday(row.event.startDate);

  return {
    id: row.event.id,

    title: row.event.title,

    contact: row.event.contactId,
    contact_id: row.event.contactId,
    contact_detail: mapContactMini(row.contactRow ?? null) as Contact | null,

    contact_name: contactName || "Unknown contact",
    contact_first_name: row.contactRow?.firstName ?? "",
    contact_last_name: row.contactRow?.lastName ?? "",
    contact_photo: row.contactRow?.photoUri ?? null,

    type: row.event.type as EventTypeValue,

    start_date: row.event.startDate,
    start_time: row.event.startTime,

    end_date: row.event.endDate,
    end_time: row.event.endTime,

    is_recurring: row.event.isRecurring,
    is_active: row.event.isActive,

    created_at: toIso(row.event.createdAt),
    updated_at: toIso(row.event.updatedAt),

    reminders: [],
    has_reminder: false,
    reminder_count: 0,

    next_occurrence: row.event.startDate,
    month_label: getMonthLabel(row.event.startDate),
    days_until: daysUntil,
    duration_minutes: getDurationMinutes({
      startDate: row.event.startDate,
      startTime: row.event.startTime,
      endDate: row.event.endDate,
      endTime: row.event.endTime,
    }),
  };
}

function mapHomeEventToApi(row: {
  event: typeof contactEvent.$inferSelect;
  contactRow: typeof contact.$inferSelect;
}): HomeEventDTO {
  const contactName = `${row.contactRow.firstName} ${
    row.contactRow.lastName || ""
  }`.trim();

  return {
    id: row.event.id,
    contact_id: row.event.contactId,
    contact_name: contactName || "Unknown contact",
    type: row.event.type as EventTypeValue,
    next_occurrence: row.event.startDate,
    days_until: daysBetweenToday(row.event.startDate),
  };
}

async function fetchEventRowById(id: AppId | number) {
  const eventId = String(id);

  const rows = await db
    .select({
      event: contactEvent,
      contactRow: contact,
    })
    .from(contactEvent)
    .leftJoin(contact, eq(contactEvent.contactId, contact.id))
    .where(
      and(
        eq(contactEvent.id, eventId),
        eq(contactEvent.userId, LOCAL_USER_ID),
        isNull(contactEvent.deletedAt)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function fetchEvents(params?: FetchEventsParams) {
  const {
    filter = "upcoming",
    page = 1,
    q,
    no_reminder,
    type,
    contact_id,
  } = params || {};

  const today = todayDateOnly();

  const conditions: SQL[] = [
    eq(contactEvent.userId, LOCAL_USER_ID),
    eq(contactEvent.isActive, true),
    isNull(contactEvent.deletedAt),
  ];

  const contactId = toId(contact_id);

  if (contactId) {
    conditions.push(eq(contactEvent.contactId, contactId));
  }

  if (Array.isArray(type) && type.length > 0) {
    conditions.push(inArray(contactEvent.type, type));
  }

  if (filter === "upcoming") {
    conditions.push(gte(contactEvent.startDate, today));
  }

  if (filter === "past") {
    conditions.push(lt(contactEvent.startDate, today));
  }

  if (filter === "no_reminder" || no_reminder) {
    // Later we can filter using the reminder table.
  }

  if (q?.trim()) {
    const search = `%${q.trim()}%`;

    conditions.push(
      or(
        like(contactEvent.title, search),
        like(contact.firstName, search),
        like(contact.lastName, search)
      ) as SQL
    );
  }

  const rows = await db
    .select({
      event: contactEvent,
      contactRow: contact,
    })
    .from(contactEvent)
    .leftJoin(contact, eq(contactEvent.contactId, contact.id))
    .where(and(...conditions))
    .orderBy(
      filter === "past"
        ? desc(contactEvent.startDate)
        : asc(contactEvent.startDate),
      asc(contactEvent.startTime)
    );

  const start = (page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  return {
    count: rows.length,
    next: rows.length > start + PAGE_SIZE ? page + 1 : null,
    previous: page > 1 ? page - 1 : null,
    results: pageRows.map(mapEventToApi),
  };
}

export async function createEvent(
  payload: CreateEventInput
): Promise<EventDTO> {
  const date = now();
  const eventId = await createId();

  const contactId = toId(payload.contact);

  if (!contactId) {
    throw new Error("Contact is required.");
  }

  const startDate = toDateOnly(payload.start_date);

  if (!startDate) {
    throw new Error("Start date is required.");
  }

  await db.insert(contactEvent).values({
    id: eventId,
    userId: LOCAL_USER_ID,

    contactId,

    title: payload.title?.trim() || "Event",

    type: payload.type ?? 6,

    startDate,
    startTime: payload.start_time ?? null,

    endDate: toDateOnly(payload.end_date),
    endTime: payload.end_time ?? null,

    isRecurring: payload.is_recurring ?? false,
    isActive: payload.is_active ?? true,

    createdAt: date,
    updatedAt: date,
    deletedAt: null,
  });

  return fetchEventById(eventId);
}

export async function fetchEventById(
  id: AppId | number
): Promise<EventDTO> {
  const row = await fetchEventRowById(id);

  if (!row) {
    throw new Error("Event not found");
  }

  return mapEventToApi(row);
}

export async function fetchEventsForContact(
  contactId: AppId | number,
  page = 1
) {
  return fetchEvents({
    contact_id: contactId,
    page,
    filter: "upcoming",
  });
}

export async function deleteEvent(id: AppId | number) {
  const eventId = String(id);

  await db
    .update(contactEvent)
    .set({
      deletedAt: now(),
      updatedAt: now(),
      isActive: false,
    })
    .where(
      and(
        eq(contactEvent.id, eventId),
        eq(contactEvent.userId, LOCAL_USER_ID),
        isNull(contactEvent.deletedAt)
      )
    );

  return {
    data: null,
    status: 204,
  };
}

export async function updateEvent(
  id: AppId | number,
  payload: UpdateEventPayload
): Promise<EventDTO> {
  const eventId = String(id);

  const updateData: Partial<typeof contactEvent.$inferInsert> = {
    updatedAt: now(),
  };

  if (payload.contact !== undefined) {
    const contactId = toId(payload.contact);

    if (!contactId) {
      throw new Error("Contact is required.");
    }

    updateData.contactId = contactId;
  }

  if (payload.title !== undefined) {
    updateData.title = payload.title?.trim() || "Event";
  }

  if (payload.type !== undefined) {
    updateData.type = payload.type;
  }

  if (payload.start_date !== undefined) {
    const startDate = toDateOnly(payload.start_date);

    if (!startDate) {
      throw new Error("Start date is required.");
    }

    updateData.startDate = startDate;
  }

  if (payload.start_time !== undefined) {
    updateData.startTime = payload.start_time;
  }

  if (payload.end_date !== undefined) {
    updateData.endDate = toDateOnly(payload.end_date);
  }

  if (payload.end_time !== undefined) {
    updateData.endTime = payload.end_time;
  }

  if (payload.is_recurring !== undefined) {
    updateData.isRecurring = payload.is_recurring;
  }

  if (payload.is_active !== undefined) {
    updateData.isActive = payload.is_active;
  }

  await db
    .update(contactEvent)
    .set(updateData)
    .where(
      and(
        eq(contactEvent.id, eventId),
        eq(contactEvent.userId, LOCAL_USER_ID),
        isNull(contactEvent.deletedAt)
      )
    );

  return fetchEventById(eventId);
}

export async function fetchHomeSummary(): Promise<HomeSummaryDTO> {
  const today = todayDateOnly();

  const baseConditions = and(
    eq(contactEvent.userId, LOCAL_USER_ID),
    eq(contactEvent.isActive, true),
    isNull(contactEvent.deletedAt),
    isNull(contact.deletedAt)
  );

  const todayRows = await db
    .select({
      event: contactEvent,
      contactRow: contact,
    })
    .from(contactEvent)
    .innerJoin(contact, eq(contactEvent.contactId, contact.id))
    .where(and(baseConditions, eq(contactEvent.startDate, today)))
    .orderBy(asc(contactEvent.startTime));

  const upcomingRows = await db
    .select({
      event: contactEvent,
      contactRow: contact,
    })
    .from(contactEvent)
    .innerJoin(contact, eq(contactEvent.contactId, contact.id))
    .where(and(baseConditions, gte(contactEvent.startDate, today)))
    .orderBy(asc(contactEvent.startDate), asc(contactEvent.startTime));

  const recentlyCelebratedRows = await db
    .select({
      event: contactEvent,
      contactRow: contact,
    })
    .from(contactEvent)
    .innerJoin(contact, eq(contactEvent.contactId, contact.id))
    .where(and(baseConditions, lt(contactEvent.startDate, today)))
    .orderBy(desc(contactEvent.startDate))
    .limit(5);

  const activeContacts = await db
    .select()
    .from(contact)
    .where(
      and(
        eq(contact.userId, LOCAL_USER_ID),
        isNull(contact.deletedAt)
      )
    );

  const todayItems = todayRows.map(mapHomeEventToApi);
  const upcomingItems = upcomingRows.map(mapHomeEventToApi);
  const recentlyCelebratedItems =
    recentlyCelebratedRows.map(mapHomeEventToApi);

  const upcomingWeekCount = upcomingItems.filter(
    (item) => item.days_until >= 0 && item.days_until <= 7
  ).length;

  const typeCountMap: Record<EventTypeValue, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  };

  upcomingItems.forEach((item) => {
    typeCountMap[item.type] = (typeCountMap[item.type] ?? 0) + 1;
  });

  const typeInsights = Object.entries(typeCountMap)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => ({
      type: Number(type) as EventTypeValue,
      count,
    }));

  return {
    today: todayItems,
    upcoming: upcomingItems,
    recently_celebrated: recentlyCelebratedItems,
    type_insights: typeInsights,
    meta: {
      upcoming_week_count: upcomingWeekCount,
      total_contacts: activeContacts.length,
    },
  };
}