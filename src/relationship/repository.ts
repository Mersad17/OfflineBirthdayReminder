// src/relationships/repository.ts
import { and, desc, eq, isNull, or } from "drizzle-orm";

import { db } from "../db/client";
import { contactRelationship } from "../db/schema";
import { AppId } from "../contacts/types";
import { ContactRelationshipGroup } from "./relationshipOptions";

export type ContactRelationshipDTO = typeof contactRelationship.$inferSelect;

export type CreateContactRelationshipInput = {
  contactId: AppId;
  relatedContactId: AppId;
  relationshipType: string;
  reverseRelationshipType: string;
  relationshipGroup: ContactRelationshipGroup;
  note?: string | null;
};

export async function fetchContactRelationshipsForContact(contactId: AppId) {
  return db
    .select()
    .from(contactRelationship)
    .where(
      and(
        isNull(contactRelationship.deletedAt),
        or(
          eq(contactRelationship.contactId, String(contactId)),
          eq(contactRelationship.relatedContactId, String(contactId))
        )
      )
    )
    .orderBy(desc(contactRelationship.createdAt));
}

export async function createContactRelationship(
  input: CreateContactRelationshipInput
) {
  const contactId = String(input.contactId);
  const relatedContactId = String(input.relatedContactId);

  if (contactId === relatedContactId) {
    throw new Error("A contact cannot be connected to themselves.");
  }

  const now = new Date();
  const pairKey = createPairKey(contactId, relatedContactId);

  const existing = await db
    .select()
    .from(contactRelationship)
    .where(eq(contactRelationship.pairKey, pairKey))
    .limit(1);

  if (existing[0] && !existing[0].deletedAt) {
    throw new Error("These contacts are already connected.");
  }

  if (existing[0]?.deletedAt) {
    await db
      .update(contactRelationship)
      .set({
        contactId,
        relatedContactId,
        relationshipType: input.relationshipType,
        reverseRelationshipType: input.reverseRelationshipType,
        relationshipGroup: input.relationshipGroup,
        note: input.note ?? null,
        updatedAt: now,
        deletedAt: null,
      })
      .where(eq(contactRelationship.id, existing[0].id));

    const restored = await db
      .select()
      .from(contactRelationship)
      .where(eq(contactRelationship.id, existing[0].id))
      .limit(1);

    return restored[0];
  }

  const id = createRelationshipId();

  await db.insert(contactRelationship).values({
    id,
    userId: "local",
    pairKey,
    contactId,
    relatedContactId,
    relationshipType: input.relationshipType,
    reverseRelationshipType: input.reverseRelationshipType,
    relationshipGroup: input.relationshipGroup,
    note: input.note ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  const created = await db
    .select()
    .from(contactRelationship)
    .where(eq(contactRelationship.id, id))
    .limit(1);

  return created[0];
}

export async function deleteContactRelationship(id: AppId) {
  await db
    .update(contactRelationship)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(contactRelationship.id, String(id)));
}

function createPairKey(a: string, b: string) {
  return [a, b].sort().join("__");
}

function createRelationshipId() {
  return `rel_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}