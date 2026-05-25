import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { contactMemory } from "../db/schema";
import {
  ContactMemory,
  ContactMemoryType,
  CreateContactMemoryInput,
  UpdateContactMemoryInput,
} from "./types";
import { AppId } from "../contacts/types";
import { createId } from "../lib/id";

function now() {
  return new Date();
}

function toDateOnly(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function toIso(value: Date | null | undefined): string {
  if (!value) return new Date().toISOString();
  return value.toISOString();
}

function mapMemoryToApi(
  row: typeof contactMemory.$inferSelect
): ContactMemory {
  return {
    id: row.id,
    contact: row.contactId,

    text: row.text,

    memory_type: row.memoryType as ContactMemoryType,

    date: row.date,

    is_pinned: row.isPinned,

    created_at: toIso(row.createdAt),
    updated_at: toIso(row.updatedAt),
  };
}

async function fetchContactMemoryById(
  memoryId: AppId | number
): Promise<ContactMemory> {
  const id = String(memoryId);

  const rows = await db
    .select()
    .from(contactMemory)
    .where(
      and(
        eq(contactMemory.id, id),
        isNull(contactMemory.deletedAt)
      )
    )
    .limit(1);

  if (!rows[0]) {
    throw new Error("Memory not found");
  }

  return mapMemoryToApi(rows[0]);
}

export async function fetchMemoriesForContact(
  contactId: AppId | number
): Promise<ContactMemory[]> {
  const id = String(contactId);

  const rows = await db
    .select()
    .from(contactMemory)
    .where(
      and(
        eq(contactMemory.contactId, id),
        isNull(contactMemory.deletedAt)
      )
    )
    .orderBy(
      desc(contactMemory.isPinned),
      desc(contactMemory.createdAt)
    );

  return rows.map(mapMemoryToApi);
}

export async function createContactMemory(
  contactId: AppId | number,
  payload: CreateContactMemoryInput
): Promise<ContactMemory> {
  const date = now();
  const id = await createId();

  const text = payload.text.trim();

  if (!text) {
    throw new Error("Memory text is required.");
  }

  await db.insert(contactMemory).values({
    id,
    contactId: String(contactId),

    text,

    memoryType: payload.memory_type ?? "note",

    date: toDateOnly(payload.date),

    isPinned: payload.is_pinned ?? false,

    createdAt: date,
    updatedAt: date,
    deletedAt: null,
  });

  return fetchContactMemoryById(id);
}

export async function updateContactMemory(
  memoryId: AppId | number,
  payload: UpdateContactMemoryInput
): Promise<ContactMemory> {
  const id = String(memoryId);

  const updateData: Partial<typeof contactMemory.$inferInsert> = {
    updatedAt: now(),
  };

  if (payload.text !== undefined) {
    const cleanText = payload.text.trim();

    if (!cleanText) {
      throw new Error("Memory text cannot be empty.");
    }

    updateData.text = cleanText;
  }

  if (payload.memory_type !== undefined) {
    updateData.memoryType = payload.memory_type;
  }

  if (payload.date !== undefined) {
    updateData.date = toDateOnly(payload.date);
  }

  if (payload.is_pinned !== undefined) {
    updateData.isPinned = payload.is_pinned;
  }

  await db
    .update(contactMemory)
    .set(updateData)
    .where(
      and(
        eq(contactMemory.id, id),
        isNull(contactMemory.deletedAt)
      )
    );

  return fetchContactMemoryById(id);
}

export async function deleteContactMemory(memoryId: AppId | number) {
  const id = String(memoryId);

  await db
    .update(contactMemory)
    .set({
      deletedAt: now(),
      updatedAt: now(),
    })
    .where(
      and(
        eq(contactMemory.id, id),
        isNull(contactMemory.deletedAt)
      )
    );

  return {
    data: null,
    status: 204,
  };
}