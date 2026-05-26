import { isNull } from "drizzle-orm";

import { db } from "../db/client";
import {
  contact,
  contactGroup,
  contactTag,
  contactTagLink,
  contactMemory,
  contactEvent,
  reminder,
  interaction,
} from "../db/schema";

import {
  BACKUP_VERSION,
  PLAIN_BACKUP_FORMAT,
  BackupMode,
  BackupDataV1,
  PlainBackupV1,
} from "./types";

import {
  readContactPhotosForBackup,
  restoreContactPhotosFromBackup,
} from "./backupMedia";
import { BackupProgressCallback, clampPercent } from "./progress";

const LOCAL_USER_ID = "local";

const VALID_MEMORY_TYPES = new Set([
  "note",
  "important",
  "ask_next_time",
  "date",
]);

const VALID_EVENT_TYPES = new Set([1, 2, 3, 4, 5, 6]);
const VALID_REMINDER_STATUSES = new Set([1, 2, 3, 4]);
const VALID_INTERACTION_TYPES = new Set([1, 2, 3, 4, 5]);

function report(
  onProgress: BackupProgressCallback | undefined,
  percent: number,
  message: string,
  detail?: string
) {
  const safePercent = clampPercent(percent);

  console.log(`[BackupRepository] ${safePercent}% ${message}`, detail ?? "");

  onProgress?.({
    percent: safePercent,
    message,
    detail,
  });
}

function dateToJson(value: any) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function reviveDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date in backup: ${value}`);
  }

  return date;
}

function fallbackDate(value: any) {
  return reviveDate(value) ?? new Date();
}

function serializeRows(rows: any[]) {
  return rows.map((row) => {
    const output: any = {};

    for (const [key, value] of Object.entries(row)) {
      output[key] = dateToJson(value);
    }

    return output;
  });
}

function assertArray(value: unknown, name: string) {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid backup: ${name} must be an array.`);
  }
}

export function validatePlainBackup(input: unknown): PlainBackupV1 {
  const backup = input as PlainBackupV1;

  if (!backup || typeof backup !== "object") {
    throw new Error("Invalid backup file.");
  }

  if (backup.format !== PLAIN_BACKUP_FORMAT) {
    throw new Error("This is not a plain Birthdayly backup.");
  }

  if (backup.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${backup.version}.`);
  }

  if (!backup.data || typeof backup.data !== "object") {
    throw new Error("Invalid backup: missing data.");
  }

  assertArray(backup.data.contactGroups, "contactGroups");
  assertArray(backup.data.contactTags, "contactTags");
  assertArray(backup.data.contacts, "contacts");
  assertArray(backup.data.contactTagLinks, "contactTagLinks");
  assertArray(backup.data.contactMemories, "contactMemories");
  assertArray(backup.data.contactEvents, "contactEvents");
  assertArray(backup.data.reminders, "reminders");
  assertArray(backup.data.interactions, "interactions");

  if (
    backup.data.contactPhotos !== undefined &&
    !Array.isArray(backup.data.contactPhotos)
  ) {
    throw new Error("Invalid backup: contactPhotos must be an array.");
  }

  return backup;
}

export async function buildPlainBackup(
  onProgress?: BackupProgressCallback
): Promise<PlainBackupV1> {
  report(onProgress, 3, "Reading groups...");

  const contactGroups = await db
    .select()
    .from(contactGroup)
    .where(isNull(contactGroup.deletedAt));

  report(onProgress, 10, "Reading tags...");

  const contactTags = await db
    .select()
    .from(contactTag)
    .where(isNull(contactTag.deletedAt));

  report(onProgress, 20, "Reading contacts...");

  const contacts = await db
    .select()
    .from(contact)
    .where(isNull(contact.deletedAt));

  report(onProgress, 30, "Reading contact-tag links...");

  const contactTagLinks = await db.select().from(contactTagLink);

  report(onProgress, 42, "Reading memories...");

  const contactMemories = await db
    .select()
    .from(contactMemory)
    .where(isNull(contactMemory.deletedAt));

  report(onProgress, 52, "Reading events...");

  const contactEvents = await db
    .select()
    .from(contactEvent)
    .where(isNull(contactEvent.deletedAt));

  report(onProgress, 62, "Reading reminders...");

  const reminders = await db
    .select()
    .from(reminder)
    .where(isNull(reminder.deletedAt));

  report(onProgress, 72, "Reading interactions...");

  const interactions = await db
    .select()
    .from(interaction)
    .where(isNull(interaction.deletedAt));

  report(onProgress, 82, "Reading contact photos...");

  const contactPhotos = await readContactPhotosForBackup(
    contacts.map((item) => ({
      id: item.id,
      photoUri: item.photoUri,
    })),
    (photoProgress) => {
      report(
        onProgress,
        82 + photoProgress.percent * 0.15,
        photoProgress.message,
        photoProgress.detail
      );
    }
  );

  report(onProgress, 100, "Backup data ready.");

  return {
    format: PLAIN_BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    app: {
      name: "Birthdayly",
    },
    data: {
      contactGroups: serializeRows(contactGroups),
      contactTags: serializeRows(contactTags),
      contacts: serializeRows(contacts),
      contactTagLinks: serializeRows(contactTagLinks),
      contactMemories: serializeRows(contactMemories),
      contactEvents: serializeRows(contactEvents),
      reminders: serializeRows(reminders),
      interactions: serializeRows(interactions),
      contactPhotos,
    },
  };
}

async function clearAllData(tx: any) {
  await tx.delete(contactTagLink);
  await tx.delete(reminder);
  await tx.delete(interaction);
  await tx.delete(contactMemory);
  await tx.delete(contactEvent);
  await tx.delete(contact);
  await tx.delete(contactTag);
  await tx.delete(contactGroup);
}

function hasValue(value: any) {
  return value !== undefined && value !== null && value !== "";
}

function getId(row: any) {
  return row.id ? String(row.id) : null;
}

function normalizeNullableString(value: any) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value);
}

function normalizeRequiredString(value: any) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return null;
}

function normalizeBoolean(value: any, fallback: boolean) {
  if (value === true || value === 1 || value === "1" || value === "true") {
    return true;
  }

  if (value === false || value === 0 || value === "0" || value === "false") {
    return false;
  }

  return fallback;
}

function normalizeNumber(value: any, fallback: number) {
  const num = Number(value);

  if (Number.isNaN(num)) {
    return fallback;
  }

  return num;
}

function normalizeNumberInSet(value: any, allowed: Set<number>, fallback: number) {
  const num = normalizeNumber(value, fallback);
  return allowed.has(num) ? num : fallback;
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function compactValidRows<T>(rows: Array<T | null>, label: string): T[] {
  const valid = rows.filter((row): row is T => row !== null);
  const skipped = rows.length - valid.length;

  if (skipped > 0) {
    console.log(`[Backup import] Skipped ${skipped} invalid ${label} rows`);
  }

  return valid;
}

/**
 * Prevent a contact-shaped row from becoming a group/tag.
 */
function looksLikeContact(row: any) {
  return (
    hasValue(row.firstName) ||
    hasValue(row.first_name) ||
    hasValue(row.birthday) ||
    hasValue(row.phone) ||
    hasValue(row.email) ||
    hasValue(row.photoUri) ||
    hasValue(row.photo_uri) ||
    hasValue(row.talkEveryDays) ||
    hasValue(row.talk_every_days)
  );
}

/**
 * Prevent a group/tag-shaped row from becoming a contact.
 */
function looksLikeGroupOrTagOnly(row: any) {
  return (
    hasValue(row.name) &&
    !hasValue(row.firstName) &&
    !hasValue(row.first_name) &&
    !hasValue(row.birthday) &&
    !hasValue(row.phone) &&
    !hasValue(row.email)
  );
}

function normalizeContactGroupForImport(row: any) {
  const id = getId(row);

  if (!id) return null;
  if (looksLikeContact(row)) return null;

  const name = normalizeRequiredString(row.name);

  if (!name) return null;

  return {
    id,
    userId: row.userId ?? row.user_id ?? LOCAL_USER_ID,
    name,
    normalizedName:
      row.normalizedName ??
      row.normalized_name ??
      normalizeName(name),
    color: row.color ?? null,
    icon: row.icon ?? null,
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
    updatedAt: fallbackDate(row.updatedAt ?? row.updated_at),
    deletedAt: reviveDate(row.deletedAt ?? row.deleted_at),
  };
}

function normalizeContactTagForImport(row: any) {
  const id = getId(row);

  if (!id) return null;
  if (looksLikeContact(row)) return null;

  const name = normalizeRequiredString(row.name);

  if (!name) return null;

  return {
    id,
    userId: row.userId ?? row.user_id ?? LOCAL_USER_ID,
    name,
    normalizedName:
      row.normalizedName ??
      row.normalized_name ??
      normalizeName(name),
    color: row.color ?? null,
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
    updatedAt: fallbackDate(row.updatedAt ?? row.updated_at),
    deletedAt: reviveDate(row.deletedAt ?? row.deleted_at),
  };
}

function normalizeContactForImport(row: any) {
  const id = getId(row);

  if (!id) return null;
  if (looksLikeGroupOrTagOnly(row)) return null;

  const firstName = normalizeRequiredString(
    row.firstName ?? row.first_name
  );

  if (!firstName) return null;

  return {
    id,
    userId: row.userId ?? row.user_id ?? LOCAL_USER_ID,
    firstName,
    lastName: normalizeNullableString(row.lastName ?? row.last_name),
    birthday: row.birthday ?? null,
    phone: normalizeNullableString(row.phone),
    email: normalizeNullableString(row.email),
    groupId: normalizeNullableString(
      row.groupId ?? row.group_id ?? row.group
    ),
    isFavorite: normalizeBoolean(
      row.isFavorite ?? row.is_favorite,
      false
    ),
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
    updatedAt: fallbackDate(row.updatedAt ?? row.updated_at),
    deletedAt: reviveDate(row.deletedAt ?? row.deleted_at),
    talkEveryDays: row.talkEveryDays ?? row.talk_every_days ?? null,
    talkLastAt: row.talkLastAt ?? row.talk_last_at ?? null,
    talkNextAt: row.talkNextAt ?? row.talk_next_at ?? null,
    photoUri: row.photoUri ?? row.photo_uri ?? row.photo ?? null,
    shortDescription: row.shortDescription ?? row.short_description ?? null,
    talkNotifiedAt: row.talkNotifiedAt ?? row.talk_notified_at ?? null,
  };
}

function normalizeContactTagLinkForImport(row: any) {
  const contactId = row.contactId ?? row.contact_id;
  const tagId = row.tagId ?? row.tag_id;

  if (!contactId || !tagId) return null;

  return {
    contactId: String(contactId),
    tagId: String(tagId),
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
  };
}

function normalizeContactMemoryForImport(row: any) {
  const id = getId(row);
  const contactId = row.contactId ?? row.contact_id ?? row.contact;

  if (!id || !contactId) return null;

  const text = normalizeRequiredString(row.text);

  if (!text) return null;

  const memoryType = String(row.memoryType ?? row.memory_type ?? "note");

  return {
    id,
    contactId: String(contactId),
    text,
    memoryType: VALID_MEMORY_TYPES.has(memoryType) ? memoryType : "note",
    date: row.date ?? null,
    isPinned: normalizeBoolean(row.isPinned ?? row.is_pinned, false),
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
    updatedAt: fallbackDate(row.updatedAt ?? row.updated_at),
    deletedAt: reviveDate(row.deletedAt ?? row.deleted_at),
  };
}

function normalizeContactEventForImport(row: any) {
  const id = getId(row);
  const contactId = row.contactId ?? row.contact_id ?? row.contact;

  if (!id || !contactId) return null;

  const startDate = normalizeRequiredString(
    row.startDate ?? row.start_date
  );

  if (!startDate) return null;

  return {
    id,
    userId: row.userId ?? row.user_id ?? LOCAL_USER_ID,
    contactId: String(contactId),
    title: normalizeRequiredString(row.title) ?? "Event",
    type: normalizeNumberInSet(row.type, VALID_EVENT_TYPES, 6),
    startDate,
    startTime: row.startTime ?? row.start_time ?? null,
    endDate: row.endDate ?? row.end_date ?? null,
    endTime: row.endTime ?? row.end_time ?? null,
    isRecurring: normalizeBoolean(
      row.isRecurring ?? row.is_recurring,
      false
    ),
    isActive: normalizeBoolean(
      row.isActive ?? row.is_active,
      true
    ),
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
    updatedAt: fallbackDate(row.updatedAt ?? row.updated_at),
    deletedAt: reviveDate(row.deletedAt ?? row.deleted_at),
  };
}

function normalizeReminderForImport(row: any) {
  const id = getId(row);
  const eventId = row.eventId ?? row.event_id ?? row.event;

  if (!id || !eventId) return null;

  return {
    id,
    eventId: String(eventId),
    daysBefore: row.daysBefore ?? row.days_before ?? null,
    absoluteDatetime: reviveDate(
      row.absoluteDatetime ?? row.absolute_datetime
    ),
    timeOfDay: row.timeOfDay ?? row.time_of_day ?? null,
    status: normalizeNumberInSet(row.status, VALID_REMINDER_STATUSES, 1),
    sendAt: reviveDate(row.sendAt ?? row.send_at),
    isActive: normalizeBoolean(
      row.isActive ?? row.is_active,
      true
    ),
    notificationId: null,
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
    updatedAt: fallbackDate(row.updatedAt ?? row.updated_at),
    deletedAt: reviveDate(row.deletedAt ?? row.deleted_at),
  };
}

function normalizeInteractionForImport(row: any) {
  const id = getId(row);
  const contactId = row.contactId ?? row.contact_id ?? row.contact;

  if (!id || !contactId) return null;

  return {
    id,
    contactId: String(contactId),
    happenedAt: fallbackDate(row.happenedAt ?? row.happened_at),
    durationMinutes: row.durationMinutes ?? row.duration_minutes ?? null,
    note: row.note ?? null,
    type: normalizeNumberInSet(row.type, VALID_INTERACTION_TYPES, 5),
    createdAt: fallbackDate(row.createdAt ?? row.created_at),
    updatedAt: fallbackDate(row.updatedAt ?? row.updated_at),
    deletedAt: reviveDate(row.deletedAt ?? row.deleted_at),
  };
}

function prepareBackupDataForInsert(data: BackupDataV1): BackupDataV1 {
  const contactGroups = compactValidRows(
    data.contactGroups.map(normalizeContactGroupForImport),
    "contact group"
  );

  const groupIds = new Set(contactGroups.map((row) => row.id));

  const contactTags = compactValidRows(
    data.contactTags.map(normalizeContactTagForImport),
    "contact tag"
  );

  const tagIds = new Set(contactTags.map((row) => row.id));

  const contacts = compactValidRows(
    data.contacts.map(normalizeContactForImport),
    "contact"
  ).map((row) => ({
    ...row,
    groupId: row.groupId && groupIds.has(row.groupId) ? row.groupId : null,
  }));

  const contactIds = new Set(contacts.map((row) => row.id));

  const contactTagLinks = compactValidRows(
    data.contactTagLinks.map(normalizeContactTagLinkForImport),
    "contact-tag link"
  ).filter(
    (row) => contactIds.has(row.contactId) && tagIds.has(row.tagId)
  );

  const contactMemories = compactValidRows(
    data.contactMemories.map(normalizeContactMemoryForImport),
    "contact memory"
  ).filter((row) => contactIds.has(row.contactId));

  const contactEvents = compactValidRows(
    data.contactEvents.map(normalizeContactEventForImport),
    "contact event"
  ).filter((row) => contactIds.has(row.contactId));

  const eventIds = new Set(contactEvents.map((row) => row.id));

  const reminders = compactValidRows(
    data.reminders.map(normalizeReminderForImport),
    "reminder"
  ).filter((row) => eventIds.has(row.eventId));

  const interactions = compactValidRows(
    data.interactions.map(normalizeInteractionForImport),
    "interaction"
  ).filter((row) => contactIds.has(row.contactId));

  const contactPhotos = (data.contactPhotos ?? []).filter((photo: any) =>
    contactIds.has(String(photo.contactId))
  );

  return {
    contactGroups,
    contactTags,
    contacts,
    contactTagLinks,
    contactMemories,
    contactEvents,
    reminders,
    interactions,
    contactPhotos,
  };
}

async function insertPreparedBackupData(tx: any, data: BackupDataV1) {
  if (data.contactGroups.length) {
    await tx
      .insert(contactGroup)
      .values(data.contactGroups)
      .onConflictDoNothing();
  }

  if (data.contactTags.length) {
    await tx
      .insert(contactTag)
      .values(data.contactTags)
      .onConflictDoNothing();
  }

  if (data.contacts.length) {
    await tx
      .insert(contact)
      .values(data.contacts)
      .onConflictDoNothing();
  }

  if (data.contactTagLinks.length) {
    await tx
      .insert(contactTagLink)
      .values(data.contactTagLinks)
      .onConflictDoNothing();
  }

  if (data.contactMemories.length) {
    await tx
      .insert(contactMemory)
      .values(data.contactMemories)
      .onConflictDoNothing();
  }

  if (data.contactEvents.length) {
    await tx
      .insert(contactEvent)
      .values(data.contactEvents)
      .onConflictDoNothing();
  }

  if (data.reminders.length) {
    await tx
      .insert(reminder)
      .values(data.reminders)
      .onConflictDoNothing();
  }

  if (data.interactions.length) {
    await tx
      .insert(interaction)
      .values(data.interactions)
      .onConflictDoNothing();
  }
}

export async function importPlainBackupToDatabase(
  backupInput: unknown,
  mode: BackupMode,
  onProgress?: BackupProgressCallback
) {
  const backup = validatePlainBackup(backupInput);

  report(onProgress, 5, "Validated backup file.");

  const preparedData = prepareBackupDataForInsert(backup.data);

  report(
    onProgress,
    10,
    "Prepared backup data.",
    `${preparedData.contacts.length} contacts, ${preparedData.contactGroups.length} groups`
  );

  await db.transaction(async (tx) => {
    if (mode === "replace") {
      report(onProgress, 15, "Clearing existing local data...");
      await clearAllData(tx);
    }

    report(onProgress, 45, "Importing backup data...");
    await insertPreparedBackupData(tx, preparedData);
  });

  report(onProgress, 75, "Restoring contact photos...");

  const restoredPhotos = await restoreContactPhotosFromBackup(
    preparedData.contactPhotos,
    (photoProgress) => {
      report(
        onProgress,
        75 + photoProgress.percent * 0.2,
        photoProgress.message,
        photoProgress.detail
      );
    }
  );

  report(onProgress, 100, "Database import complete.");

  return {
    imported: {
      contactGroups: preparedData.contactGroups.length,
      contactTags: preparedData.contactTags.length,
      contacts: preparedData.contacts.length,
      contactTagLinks: preparedData.contactTagLinks.length,
      contactMemories: preparedData.contactMemories.length,
      contactEvents: preparedData.contactEvents.length,
      reminders: preparedData.reminders.length,
      interactions: preparedData.interactions.length,
      contactPhotos: preparedData.contactPhotos?.length ?? 0,
    },
    restoredPhotos,
  };
}