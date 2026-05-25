import { and, desc, eq, isNull } from "drizzle-orm";

import { AppId } from "../contacts/types";
import { db } from "../db/client";
import { contact, interaction } from "../db/schema";

import {
  CreateInteractionPayload,
  Interaction,
  InteractionType,
  PaginatedResponse,
  UpdateInteractionPayload,
  interactionTypeLabel,
} from "./types";
import { createId } from "../lib/id";

const PAGE_SIZE = 20;

type FlexibleCreateInteractionPayload = Omit<
  CreateInteractionPayload,
  "contact_id"
> & {
  contact_id?: AppId | number | null;
  contact?: AppId | number | null;
};

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

function toIso(value: Date | null | undefined): string {
  if (!value) return new Date().toISOString();
  return value.toISOString();
}

function toYMD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getPayloadContactId(payload: {
  contact?: AppId | number | null;
  contact_id?: AppId | number | null;
}) {
  const value = payload.contact_id ?? payload.contact;

  if (value === null || value === undefined || String(value).trim() === "") {
    throw new Error("Contact is required.");
  }

  return String(value);
}

function validateInteraction(args: {
  happenedAt?: Date | null;
  durationMinutes?: number | null;
}) {
  if (
    args.durationMinutes !== null &&
    args.durationMinutes !== undefined &&
    args.durationMinutes <= 0
  ) {
    throw new Error("Duration must be greater than 0 minutes.");
  }

  if (args.happenedAt && args.happenedAt.getTime() > Date.now()) {
    throw new Error("Interaction time cannot be in the future.");
  }
}

function mapInteractionToApi(
  row: typeof interaction.$inferSelect
): Interaction {
  const type = row.type as InteractionType;

  return {
    id: row.id,
    happened_at: toIso(row.happenedAt),
    duration_minutes: row.durationMinutes,
    note: row.note,
    type,
    type_label: interactionTypeLabel(type),
    created_at: toIso(row.createdAt),
  };
}

export async function fetchInteractionById(
  id: AppId | number
): Promise<Interaction> {
  const interactionId = String(id);

  const rows = await db
    .select()
    .from(interaction)
    .where(
      and(
        eq(interaction.id, interactionId),
        isNull(interaction.deletedAt)
      )
    )
    .limit(1);

  if (!rows[0]) {
    throw new Error("Interaction not found");
  }

  return mapInteractionToApi(rows[0]);
}

async function syncContactTalkDates(contactId: string) {
  const date = now();

  const contactRows = await db
    .select()
    .from(contact)
    .where(eq(contact.id, contactId))
    .limit(1);

  const contactRow = contactRows[0];

  if (!contactRow) return;

  const latestRows = await db
    .select()
    .from(interaction)
    .where(
      and(
        eq(interaction.contactId, contactId),
        isNull(interaction.deletedAt)
      )
    )
    .orderBy(desc(interaction.happenedAt))
    .limit(1);

  const latestInteraction = latestRows[0];

  if (!latestInteraction?.happenedAt) {
    await db
      .update(contact)
      .set({
        talkLastAt: null,
        talkNextAt: null,
        updatedAt: date,
      })
      .where(eq(contact.id, contactId));

    return;
  }

  const talkLastAt = toYMD(latestInteraction.happenedAt);

  const talkEveryDays =
    typeof contactRow.talkEveryDays === "number"
      ? contactRow.talkEveryDays
      : null;

  const talkNextAt =
    talkEveryDays && talkEveryDays > 0
      ? toYMD(addDays(latestInteraction.happenedAt, talkEveryDays))
      : null;

  await db
    .update(contact)
    .set({
      talkLastAt,
      talkNextAt,
      updatedAt: date,
    })
    .where(eq(contact.id, contactId));
}

export async function fetchInteractionForContact(
  contactId: AppId
): Promise<Interaction[]> {
  const rows = await db
    .select()
    .from(interaction)
    .where(
      and(
        eq(interaction.contactId, String(contactId)),
        isNull(interaction.deletedAt)
      )
    )
    .orderBy(desc(interaction.happenedAt))
    .limit(5);

  return rows.map(mapInteractionToApi);
}

export async function fetchInteractionsPaginated(
  contactId: AppId,
  page = 1
): Promise<PaginatedResponse<Interaction>> {
  const rows = await db
    .select()
    .from(interaction)
    .where(
      and(
        eq(interaction.contactId, String(contactId)),
        isNull(interaction.deletedAt)
      )
    )
    .orderBy(desc(interaction.happenedAt));

  const start = (page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  return {
    count: rows.length,
    next: rows.length > start + PAGE_SIZE ? String(page + 1) : null,
    previous: page > 1 ? String(page - 1) : null,
    results: pageRows.map(mapInteractionToApi),
  };
}

export async function createInteraction(payload: FlexibleCreateInteractionPayload) {
  const date = now();
  const interactionId = await createId();
  const contactId = getPayloadContactId(payload);

  const happenedAt = toDateTime(payload.happened_at);

  if (!happenedAt) {
    throw new Error("Interaction date is required.");
  }

  validateInteraction({
    happenedAt,
    durationMinutes: payload.duration_minutes,
  });

  await db.insert(interaction).values({
    id: interactionId,
    contactId,
    happenedAt,
    durationMinutes: payload.duration_minutes ?? null,
    note: payload.note?.trim() || null,
    type: payload.type ?? InteractionType.OTHER,
    createdAt: date,
    updatedAt: date,
    deletedAt: null,
  });

  await syncContactTalkDates(contactId);

  const data = await fetchInteractionById(interactionId);

  return {
    data,
  };
}

export async function deleteInteraction(id: AppId | number) {
  const interactionId = String(id);

  const rows = await db
    .select()
    .from(interaction)
    .where(
      and(
        eq(interaction.id, interactionId),
        isNull(interaction.deletedAt)
      )
    )
    .limit(1);

  const existing = rows[0];

  await db
    .update(interaction)
    .set({
      deletedAt: now(),
      updatedAt: now(),
    })
    .where(
      and(
        eq(interaction.id, interactionId),
        isNull(interaction.deletedAt)
      )
    );

  if (existing?.contactId) {
    await syncContactTalkDates(existing.contactId);
  }

  return {
    data: null,
    status: 204,
  };
}

export async function updateInteraction(
  id: AppId | number,
  payload: UpdateInteractionPayload
) {
  const interactionId = String(id);

  const rows = await db
    .select()
    .from(interaction)
    .where(
      and(
        eq(interaction.id, interactionId),
        isNull(interaction.deletedAt)
      )
    )
    .limit(1);

  const existing = rows[0];

  if (!existing) {
    throw new Error("Interaction not found");
  }

  const happenedAt =
    payload.happened_at !== undefined
      ? toDateTime(payload.happened_at)
      : existing.happenedAt;

  if (!happenedAt) {
    throw new Error("Interaction date is required.");
  }

  const durationMinutes =
    payload.duration_minutes !== undefined
      ? payload.duration_minutes
      : existing.durationMinutes;

  validateInteraction({
    happenedAt,
    durationMinutes,
  });

  await db
    .update(interaction)
    .set({
      happenedAt,
      durationMinutes,
      note:
        payload.note !== undefined
          ? payload.note?.trim() || null
          : existing.note,
      type:
        payload.type !== undefined
          ? payload.type
          : existing.type,
      updatedAt: now(),
    })
    .where(
      and(
        eq(interaction.id, interactionId),
        isNull(interaction.deletedAt)
      )
    );

  await syncContactTalkDates(existing.contactId);

  const data = await fetchInteractionById(interactionId);

  return {
    data,
  };
}