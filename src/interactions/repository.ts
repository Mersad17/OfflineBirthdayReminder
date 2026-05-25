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

async function fetchInteractionById(id: AppId | number): Promise<Interaction> {
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

export async function createInteraction(payload: CreateInteractionPayload) {
  const date = now();
  const interactionId = await createId();

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
    contactId: String(payload.contact_id),
    happenedAt,
    durationMinutes: payload.duration_minutes,
    note: payload.note?.trim() || null,
    type: payload.type ?? InteractionType.OTHER,
    createdAt: date,
    updatedAt: date,
    deletedAt: null,
  });

  /**
   * Update contact talk_last_at when logging interaction.
   */
  await db
    .update(contact)
    .set({
      talkLastAt: happenedAt.toISOString().slice(0, 10),
      updatedAt: date,
    })
    .where(eq(contact.id, String(payload.contact_id)));

  const data = await fetchInteractionById(interactionId);

  /**
   * Old axios-style return shape:
   * createInteraction(...).then(res => res.data)
   */
  return {
    data,
  };
}

export async function deleteInteraction(id: AppId | number) {
  await db
    .update(interaction)
    .set({
      deletedAt: now(),
      updatedAt: now(),
    })
    .where(
      and(
        eq(interaction.id, String(id)),
        isNull(interaction.deletedAt)
      )
    );

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

  const happenedAt = toDateTime(payload.happened_at);

  if (!happenedAt) {
    throw new Error("Interaction date is required.");
  }

  validateInteraction({
    happenedAt,
    durationMinutes: payload.duration_minutes,
  });

  await db
    .update(interaction)
    .set({
      happenedAt,
      durationMinutes: payload.duration_minutes,
      note: payload.note?.trim() || null,
      type: payload.type,
      updatedAt: now(),
    })
    .where(
      and(
        eq(interaction.id, interactionId),
        isNull(interaction.deletedAt)
      )
    );

  const data = await fetchInteractionById(interactionId);

  /**
   * Old axios-style return shape.
   */
  return {
    data,
  };
}