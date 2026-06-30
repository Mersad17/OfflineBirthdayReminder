// src/reminders/smartReminderRepository.ts
import { AppId, Contact } from "../contacts/types";
import { fetchContactById, updateContact } from "../contacts/repository";
import { createEvent, fetchEventsForContact } from "../events/repository";
import { EventDTO, EventTypeValue } from "../events/types";
import { createReminder } from "./repository";
import { createContactMemory } from "../memories/repository";

const EVENT_TYPE_BIRTHDAY: EventTypeValue = 1;
const EVENT_TYPE_OTHER: EventTypeValue = 6;

const DEFAULT_TIME_OF_DAY = "09:00";

function todayStart() {
  const date = new Date();

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDate(value?: string | null) {
  if (!value) return null;

  const normalized = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);

  copy.setDate(copy.getDate() + days);

  return copy;
}

function toYMD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function normalizeTime(time?: string | null) {
  if (!time) return DEFAULT_TIME_OF_DAY;

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
    return DEFAULT_TIME_OF_DAY;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function buildDateTime(date: Date, time?: string | null) {
  const safeTime = normalizeTime(time);
  const [hour, minute] = safeTime.split(":").map(Number);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hour,
    minute,
    0,
    0
  );
}

function ensureFutureDateTime(date: Date, time?: string | null) {
  const candidate = buildDateTime(date, time);

  if (candidate.getTime() > Date.now()) {
    return candidate;
  }

  return buildDateTime(addDays(todayStart(), 1), time);
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function contactName(contact: Contact) {
  return `${contact.first_name || ""} ${contact.last_name || ""}`.trim();
}

function firstName(contact: Contact) {
  return contact.first_name?.trim() || contactName(contact) || "Contact";
}

async function getEventsArray(contactId: AppId | number): Promise<EventDTO[]> {
  const response = await fetchEventsForContact(contactId, 1);

  if (Array.isArray(response)) {
    return response;
  }

  return response?.results ?? [];
}

async function getOrCreateBirthdayEvent(contact: Contact, timeOfDay: string) {
  if (!contact.birthday) {
    throw new Error("This contact has no birthday.");
  }

  const events = await getEventsArray(contact.id);

  const existingBirthday = events.find(
    (event) =>
      String(event.type) === String(EVENT_TYPE_BIRTHDAY) ||
      event.title?.toLowerCase().includes("birthday")
  );

  if (existingBirthday) {
    return existingBirthday;
  }

  return createEvent({
    contact: contact.id,
    title: `${firstName(contact)}'s birthday`,
    type: EVENT_TYPE_BIRTHDAY,
    start_date: contact.birthday.slice(0, 10),
    start_time: timeOfDay,
    is_recurring: true,
    is_active: true,
  });
}

export async function createRelativeSmartReminder(args: {
  contactId: AppId;
  text: string;
  daysFromNow: number;
  timeOfDay?: string | null;
}) {
  const text = cleanText(args.text);

  if (!text) {
    throw new Error("Write what you want to remember.");
  }

  if (args.daysFromNow < 0) {
    throw new Error("Please choose a future reminder date.");
  }

  const timeOfDay = normalizeTime(args.timeOfDay);
  const sendAt = ensureFutureDateTime(
    addDays(todayStart(), args.daysFromNow),
    timeOfDay
  );

  const event = await createEvent({
    contact: args.contactId,
    title: text,
    type: EVENT_TYPE_OTHER,
    start_date: toYMD(sendAt),
    start_time: timeOfDay,
    is_recurring: false,
    is_active: true,
  });

  return createReminder(event.id, {
    event: event.id,
    send_at: sendAt.toISOString(),
    absolute_datetime: sendAt.toISOString(),
    time_of_day: timeOfDay,
    is_active: true,
  });
}

export async function createCustomDateSmartReminder(args: {
  contactId: AppId;
  text: string;
  date: string;
  timeOfDay?: string | null;
}) {
  const text = cleanText(args.text);

  if (!text) {
    throw new Error("Write what you want to remember.");
  }

  const parsedDate = parseDate(args.date);

  if (!parsedDate) {
    throw new Error("Please enter a valid date.");
  }

  const timeOfDay = normalizeTime(args.timeOfDay);
  const sendAt = ensureFutureDateTime(parsedDate, timeOfDay);

  const event = await createEvent({
    contact: args.contactId,
    title: text,
    type: EVENT_TYPE_OTHER,
    start_date: toYMD(sendAt),
    start_time: timeOfDay,
    is_recurring: false,
    is_active: true,
  });

  return createReminder(event.id, {
    event: event.id,
    send_at: sendAt.toISOString(),
    absolute_datetime: sendAt.toISOString(),
    time_of_day: timeOfDay,
    is_active: true,
  });
}

export async function createBirthdaySmartReminder(args: {
  contactId: AppId | number;
  daysBefore: number;
  timeOfDay?: string | null;
}) {
  if (args.daysBefore < 0) {
    throw new Error("Days before cannot be negative.");
  }

  const contact = await fetchContactById(args.contactId);
  const timeOfDay = normalizeTime(args.timeOfDay);
  const event = await getOrCreateBirthdayEvent(contact, timeOfDay);

  return createReminder(event.id, {
    event: event.id,
    days_before: args.daysBefore,
    time_of_day: timeOfDay,
    is_active: true,
  });
}

export async function createCheckInSmartReminder(args: {
  contactId: AppId;
  everyDays: number;
  timeOfDay?: string | null;
}) {
  if (args.everyDays <= 0) {
    throw new Error("Choose a valid check-in rhythm.");
  }

  const contact = await fetchContactById(args.contactId);
  const timeOfDay = normalizeTime(args.timeOfDay);

  const baseDate = parseDate(contact.talk_last_at) ?? todayStart();
  const nextDate = addDays(baseDate, args.everyDays);
  const sendAt = ensureFutureDateTime(nextDate, timeOfDay);

  await updateContact(args.contactId, {
    talk_every_days: args.everyDays,
    talk_next_at: toYMD(sendAt),
  } as any);

  const name = contactName(contact);

  const event = await createEvent({
    contact: args.contactId,
    title: name ? `Check in with ${name}` : "Check in",
    type: EVENT_TYPE_OTHER,
    start_date: toYMD(sendAt),
    start_time: timeOfDay,
    is_recurring: false,
    is_active: true,
  });

  return createReminder(event.id, {
    event: event.id,
    send_at: sendAt.toISOString(),
    absolute_datetime: sendAt.toISOString(),
    time_of_day: timeOfDay,
    is_active: true,
  });
}

export async function createNextMeetingSmartReminder(args: {
  contactId: AppId | number;
  text: string;
}) {
  const text = cleanText(args.text);

  if (!text) {
    throw new Error("Write what you want to ask next time.");
  }

  return createContactMemory(args.contactId as any, {
    text,
    memory_type: "ask_next_time",
    date: null,
    is_pinned: true,
  });
}