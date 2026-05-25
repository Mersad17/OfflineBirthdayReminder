import { contactEvent } from "../db/schema";

export function toDateTime(value: unknown): Date | null {
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

export function toIso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

export function parseTime(time?: string | null) {
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

export function buildDateTime(dateString: string, time?: string | null): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  const { hour, minute } = parseTime(time);

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function getNextEventOccurrence(
  eventRow: typeof contactEvent.$inferSelect
): Date {
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

  if (nextOccurrence.getTime() <= today.getTime()) {
    nextOccurrence.setFullYear(nextOccurrence.getFullYear() + 1);
  }

  return nextOccurrence;
}

export function calculateReminderSendAt(args: {
  eventRow: typeof contactEvent.$inferSelect;
  daysBefore?: number | null;
  absoluteDatetime?: Date | string | null;
  sendAt?: Date | string | null;
  timeOfDay?: string | null;
}): Date | null {
  const now = Date.now();

  /**
   * 1. Existing send_at, if still future.
   */
  const existingSendAt = toDateTime(args.sendAt);

  if (existingSendAt && existingSendAt.getTime() > now) {
    return existingSendAt;
  }

  /**
   * 2. Absolute datetime, if future.
   */
  const absoluteDatetime = toDateTime(args.absoluteDatetime);

  if (absoluteDatetime) {
    return absoluteDatetime.getTime() > now ? absoluteDatetime : null;
  }

  /**
   * 3. Event date - days_before at time_of_day.
   */
  const eventOccurrence = getNextEventOccurrence(args.eventRow);

  const calculated = new Date(eventOccurrence);

  const { hour, minute } = parseTime(
    args.timeOfDay ?? args.eventRow.startTime ?? "09:00"
  );

  calculated.setHours(hour, minute, 0, 0);

  if (args.daysBefore !== null && args.daysBefore !== undefined) {
    calculated.setDate(calculated.getDate() - args.daysBefore);
  }

  if (calculated.getTime() <= now) {
    return null;
  }

  return calculated;
}