import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  like,
  or,
  type SQL,
} from "drizzle-orm";
import { createId } from "../lib/id";



import { db } from "../db/client";
import {
  contact,
  contactGroup,
  contactTag,
  contactTagLink,
} from "../db/schema";

import {
  AppId,
  Contact,
  ContactGroup,
  ContactTag,
  CreateContactGroupInput,
  CreateContactInput,
  CreateContactTagInput,
  UpdateContactInput,
} from "./types";

export type ContactFilters = {
  page?: number;
  group?: AppId | number | null;
  tag?: AppId | number | null;
  search?: string;
};

const LOCAL_USER_ID = "local";
const PAGE_SIZE = 50;

function now() {
  return new Date();
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function toId(id: AppId | number | null | undefined) {
  if (id === null || id === undefined || id === "") return null;
  return String(id);
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

function mapGroupToApi(row: typeof contactGroup.$inferSelect): ContactGroup {
  return {
    id: row.id,
    name: row.name,
    normalized_name: row.normalizedName,
    color: row.color,
    icon: row.icon,
    created_at: toIso(row.createdAt),
  };
}

function mapTagToApi(row: typeof contactTag.$inferSelect): ContactTag {
  return {
    id: row.id,
    name: row.name,
    normalized_name: row.normalizedName,
    color: row.color,
    created_at: toIso(row.createdAt),
  };
}

async function getGroupDetail(
  groupId: string | null
): Promise<ContactGroup | null> {
  if (!groupId) return null;

  const rows = await db
    .select()
    .from(contactGroup)
    .where(
      and(
        eq(contactGroup.id, groupId),
        eq(contactGroup.userId, LOCAL_USER_ID),
        isNull(contactGroup.deletedAt)
      )
    )
    .limit(1);

  if (!rows[0]) return null;

  return mapGroupToApi(rows[0]);
}

async function getTagsForContact(contactId: string): Promise<ContactTag[]> {
  const rows = await db
    .select({
      tag: contactTag,
    })
    .from(contactTagLink)
    .innerJoin(contactTag, eq(contactTagLink.tagId, contactTag.id))
    .where(
      and(
        eq(contactTagLink.contactId, contactId),
        eq(contactTag.userId, LOCAL_USER_ID),
        isNull(contactTag.deletedAt)
      )
    )
    .orderBy(asc(contactTag.name));

  return rows.map((row) => mapTagToApi(row.tag));
}

async function mapContactToApi(
  row: typeof contact.$inferSelect
): Promise<Contact> {
  const groupDetail = await getGroupDetail(row.groupId);
  const tagsDetail = await getTagsForContact(row.id);

  return {
    id: row.id,

    first_name: row.firstName,
    last_name: row.lastName,

    birthday: row.birthday,
    email: row.email,
    phone: row.phone,

    group: row.groupId,
    group_detail: groupDetail,

    tags: tagsDetail.map((tag) => tag.id),
    tags_detail: tagsDetail,

    is_favorite: row.isFavorite,

    created_at: toIso(row.createdAt),

    notes: row.notes,

    photo: row.photoUri,
    photo_uri: row.photoUri,

    talk_every_days: row.talkEveryDays,
    talk_last_at: row.talkLastAt,
    talk_next_at: row.talkNextAt,
    talk_notified_at: row.talkNotifiedAt,
  };
}

export async function fetchContactGroups(options?: {
  onlyUsed?: boolean;
}): Promise<ContactGroup[]> {
  let rows = await db
    .select()
    .from(contactGroup)
    .where(
      and(
        eq(contactGroup.userId, LOCAL_USER_ID),
        isNull(contactGroup.deletedAt)
      )
    )
    .orderBy(asc(contactGroup.name));

  if (options?.onlyUsed) {
    const usedRows = await db
      .select({
        groupId: contact.groupId,
      })
      .from(contact)
      .where(
        and(
          eq(contact.userId, LOCAL_USER_ID),
          isNull(contact.deletedAt)
        )
      );

    const usedGroupIds = new Set(
      usedRows
        .map((item) => item.groupId)
        .filter((id): id is string => Boolean(id))
    );

    rows = rows.filter((group) => usedGroupIds.has(group.id));
  }

  return rows.map(mapGroupToApi);
}

export async function createContactGroup(
  payload: CreateContactGroupInput
): Promise<ContactGroup> {
  const date = now();
  const normalizedName = normalizeName(payload.name);

  const existing = await db
    .select()
    .from(contactGroup)
    .where(
      and(
        eq(contactGroup.userId, LOCAL_USER_ID),
        eq(contactGroup.normalizedName, normalizedName)
      )
    )
    .limit(1);

  if (existing[0] && !existing[0].deletedAt) {
    throw new Error("A group with this name already exists.");
  }

  if (existing[0] && existing[0].deletedAt) {
    await db
      .update(contactGroup)
      .set({
        name: payload.name.trim(),
        color: payload.color ?? null,
        icon: payload.icon ?? null,
        deletedAt: null,
        updatedAt: date,
      })
      .where(eq(contactGroup.id, existing[0].id));

    const restored = await db
      .select()
      .from(contactGroup)
      .where(eq(contactGroup.id, existing[0].id))
      .limit(1);

    return mapGroupToApi(restored[0]);
  }

  const groupId = await createId();

  const row = {
    id: groupId,
    userId: LOCAL_USER_ID,
    name: payload.name.trim(),
    normalizedName,
    color: payload.color ?? null,
    icon: payload.icon ?? null,
    createdAt: date,
    updatedAt: date,
    deletedAt: null,
  };

  await db.insert(contactGroup).values(row);

  return mapGroupToApi(row);
}

export async function updateContactGroup(
  id: AppId | number,
  payload: {
    name?: string;
    color?: string | null;
    icon?: string | null;
  }
): Promise<ContactGroup> {
  const groupId = String(id);

  const updateData: Partial<typeof contactGroup.$inferInsert> = {
    updatedAt: now(),
  };

  if (payload.name !== undefined) {
    updateData.name = payload.name.trim();
    updateData.normalizedName = normalizeName(payload.name);
  }

  if (payload.color !== undefined) {
    updateData.color = payload.color;
  }

  if (payload.icon !== undefined) {
    updateData.icon = payload.icon;
  }

  await db
    .update(contactGroup)
    .set(updateData)
    .where(
      and(
        eq(contactGroup.id, groupId),
        eq(contactGroup.userId, LOCAL_USER_ID),
        isNull(contactGroup.deletedAt)
      )
    );

  const rows = await db
    .select()
    .from(contactGroup)
    .where(eq(contactGroup.id, groupId))
    .limit(1);

  if (!rows[0]) {
    throw new Error("Group not found");
  }

  return mapGroupToApi(rows[0]);
}

export async function deleteContactGroup(id: AppId | number) {
  const groupId = String(id);
  const date = now();

  /**
   * Same behavior as Django on_delete=SET_NULL:
   * if group is deleted, contacts keep existing but group becomes null.
   */
  await db
    .update(contact)
    .set({
      groupId: null,
      updatedAt: date,
    })
    .where(eq(contact.groupId, groupId));

  await db
    .update(contactGroup)
    .set({
      deletedAt: date,
      updatedAt: date,
    })
    .where(
      and(
        eq(contactGroup.id, groupId),
        eq(contactGroup.userId, LOCAL_USER_ID)
      )
    );

  return {
    data: null,
    status: 204,
  };
}

export async function fetchContactTags(): Promise<ContactTag[]> {
  const rows = await db
    .select()
    .from(contactTag)
    .where(
      and(
        eq(contactTag.userId, LOCAL_USER_ID),
        isNull(contactTag.deletedAt)
      )
    )
    .orderBy(asc(contactTag.name));

  return rows.map(mapTagToApi);
}

export async function createContactTag(
  payload: CreateContactTagInput
): Promise<ContactTag> {
  const date = now();
  const normalizedName = normalizeName(payload.name);

  const existing = await db
    .select()
    .from(contactTag)
    .where(
      and(
        eq(contactTag.userId, LOCAL_USER_ID),
        eq(contactTag.normalizedName, normalizedName)
      )
    )
    .limit(1);

  if (existing[0] && !existing[0].deletedAt) {
    throw new Error("A tag with this name already exists.");
  }

  if (existing[0] && existing[0].deletedAt) {
    await db
      .update(contactTag)
      .set({
        name: payload.name.trim(),
        color: payload.color ?? null,
        deletedAt: null,
        updatedAt: date,
      })
      .where(eq(contactTag.id, existing[0].id));

    const restored = await db
      .select()
      .from(contactTag)
      .where(eq(contactTag.id, existing[0].id))
      .limit(1);

    return mapTagToApi(restored[0]);
  }
  const tagId = await createId();

  const row = {
    id: tagId,
    userId: LOCAL_USER_ID,
    name: payload.name.trim(),
    normalizedName,
    color: payload.color ?? null,
    createdAt: date,
    updatedAt: date,
    deletedAt: null,
  };

  await db.insert(contactTag).values(row);

  return mapTagToApi(row);
}

export async function updateContactTag(
  id: AppId | number,
  payload: {
    name?: string;
    color?: string | null;
  }
): Promise<ContactTag> {
  const tagId = String(id);

  const updateData: Partial<typeof contactTag.$inferInsert> = {
    updatedAt: now(),
  };

  if (payload.name !== undefined) {
    updateData.name = payload.name.trim();
    updateData.normalizedName = normalizeName(payload.name);
  }

  if (payload.color !== undefined) {
    updateData.color = payload.color;
  }

  await db
    .update(contactTag)
    .set(updateData)
    .where(
      and(
        eq(contactTag.id, tagId),
        eq(contactTag.userId, LOCAL_USER_ID),
        isNull(contactTag.deletedAt)
      )
    );

  const rows = await db
    .select()
    .from(contactTag)
    .where(eq(contactTag.id, tagId))
    .limit(1);

  if (!rows[0]) {
    throw new Error("Tag not found");
  }

  return mapTagToApi(rows[0]);
}

export async function deleteContactTag(id: AppId | number) {
  const tagId = String(id);
  const date = now();

  await db
    .delete(contactTagLink)
    .where(eq(contactTagLink.tagId, tagId));

  await db
    .update(contactTag)
    .set({
      deletedAt: date,
      updatedAt: date,
    })
    .where(
      and(
        eq(contactTag.id, tagId),
        eq(contactTag.userId, LOCAL_USER_ID)
      )
    );

  return {
    data: null,
    status: 204,
  };
}

async function findOrCreateTagByName(name: string): Promise<string> {
  const cleanName = name.trim();
  const normalizedName = normalizeName(cleanName);

  const existing = await db
    .select()
    .from(contactTag)
    .where(
      and(
        eq(contactTag.userId, LOCAL_USER_ID),
        eq(contactTag.normalizedName, normalizedName)
      )
    )
    .limit(1);

  if (existing[0] && !existing[0].deletedAt) {
    return existing[0].id;
  }

  if (existing[0] && existing[0].deletedAt) {
    await db
      .update(contactTag)
      .set({
        name: cleanName,
        deletedAt: null,
        updatedAt: now(),
      })
      .where(eq(contactTag.id, existing[0].id));

    return existing[0].id;
  }

  const date = now();
 const tagId = await createId();

  await db.insert(contactTag).values({
    id: tagId,
    userId: LOCAL_USER_ID,
    name: cleanName,
    normalizedName,
    color: null,
    createdAt: date,
    updatedAt: date,
    deletedAt: null,
  });

  return tagId;
}

async function replaceContactTags(
  contactId: string,
  payload: CreateContactInput | UpdateContactInput
) {
  const tagNames = payload.tag_names;
  const tagIds = payload.tags;

  if (tagNames === undefined && tagIds === undefined) {
    return;
  }

  await db
    .delete(contactTagLink)
    .where(eq(contactTagLink.contactId, contactId));

  const finalTagIds: string[] = [];

  if (Array.isArray(tagNames)) {
    for (const name of tagNames) {
      if (!name.trim()) continue;

      const tagId = await findOrCreateTagByName(name);
      finalTagIds.push(tagId);
    }
  }

  if (Array.isArray(tagIds)) {
    for (const tagId of tagIds) {
      finalTagIds.push(String(tagId));
    }
  }

  const uniqueTagIds = [...new Set(finalTagIds)];

  if (uniqueTagIds.length === 0) {
    return;
  }

  await db.insert(contactTagLink).values(
    uniqueTagIds.map((tagId) => ({
      contactId,
      tagId,
      createdAt: now(),
    }))
  );
}

export async function fetchContacts(
  filtersOrPage: ContactFilters | number = {}
) {
  const filters =
    typeof filtersOrPage === "number"
      ? { page: filtersOrPage }
      : filtersOrPage;

  const page = filters.page ?? 1;

  const conditions: SQL[] = [
    eq(contact.userId, LOCAL_USER_ID),
    isNull(contact.deletedAt),
  ];

  const groupId = toId(filters.group);
  const tagId = toId(filters.tag);

  if (groupId) {
    conditions.push(eq(contact.groupId, groupId));
  }

  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;

    conditions.push(
      or(
        like(contact.firstName, search),
        like(contact.lastName, search),
        like(contact.phone, search),
        like(contact.email, search),
        like(contact.notes, search)
      ) as SQL
    );
  }

  if (tagId) {
    const linkedRows = await db
      .select({
        contactId: contactTagLink.contactId,
      })
      .from(contactTagLink)
      .where(eq(contactTagLink.tagId, tagId));

    const contactIds = linkedRows.map((item) => item.contactId);

    if (contactIds.length === 0) {
      return {
        count: 0,
        next: null,
        previous: null,
        results: [],
      };
    }

    conditions.push(inArray(contact.id, contactIds));
  }

  const rows = await db
    .select()
    .from(contact)
    .where(and(...conditions))
    .orderBy(
      desc(contact.isFavorite),
      asc(contact.firstName),
      asc(contact.lastName)
    );

  const start = (page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  const results = await Promise.all(pageRows.map(mapContactToApi));

  /**
   * Same shape as DRF paginated response.
   * Your screens can keep using data.results.
   */
  return {
    count: rows.length,
    next: rows.length > start + PAGE_SIZE ? page + 1 : null,
    previous: page > 1 ? page - 1 : null,
    results,
  };
}

export async function createContact(
  payload: CreateContactInput
): Promise<Contact> {
  const date = now();
  const contactId = await createId();
  if (!payload.first_name.trim()) {
      throw new Error("First name is required.");
    }

  const row = {
    id: contactId,
    userId: LOCAL_USER_ID,

    firstName: payload.first_name.trim(),
    lastName: payload.last_name?.trim() || null,

    birthday: toDateOnly(payload.birthday),

    phone: payload.phone?.trim() || null,
    email: payload.email?.trim() || null,

    groupId: toId(payload.group),

    isFavorite: payload.is_favorite ?? false,

    createdAt: date,
    updatedAt: date,
    deletedAt: null,

    talkEveryDays: payload.talk_every_days ?? null,
    talkLastAt: toDateOnly(payload.talk_last_at),
    talkNextAt: toDateOnly(payload.talk_next_at),

    photoUri: payload.photo_uri ?? null,

    notes: payload.notes ?? null,

    talkNotifiedAt: toDateOnly(payload.talk_notified_at),
  };

  await db.insert(contact).values(row);

  await replaceContactTags(contactId, payload);

  return fetchContactById(contactId);
}

export async function fetchContactById(
  id: AppId | number
): Promise<Contact> {
  const contactId = String(id);

  const rows = await db
    .select()
    .from(contact)
    .where(
      and(
        eq(contact.id, contactId),
        eq(contact.userId, LOCAL_USER_ID),
        isNull(contact.deletedAt)
      )
    )
    .limit(1);

  if (!rows[0]) {
    throw new Error("Contact not found");
  }

  return mapContactToApi(rows[0]);
}

export async function updateContact(
  id: AppId | number,
  payload: UpdateContactInput
): Promise<Contact> {
  const contactId = String(id);

  const updateData: Partial<typeof contact.$inferInsert> = {
    updatedAt: now(),
  };

  if (payload.first_name !== undefined) {
    updateData.firstName = payload.first_name.trim();
  }

  if (payload.last_name !== undefined) {
    updateData.lastName = payload.last_name?.trim() || null;
  }

  if (payload.birthday !== undefined) {
    updateData.birthday = toDateOnly(payload.birthday);
  }

  if (payload.phone !== undefined) {
    updateData.phone = payload.phone?.trim() || null;
  }

  if (payload.email !== undefined) {
    updateData.email = payload.email?.trim() || null;
  }

  if (payload.group !== undefined) {
    updateData.groupId = toId(payload.group);
  }

  if (payload.is_favorite !== undefined) {
    updateData.isFavorite = payload.is_favorite ?? false;
  }

  if (payload.talk_every_days !== undefined) {
    updateData.talkEveryDays = payload.talk_every_days;
  }

  if (payload.talk_last_at !== undefined) {
    updateData.talkLastAt = toDateOnly(payload.talk_last_at);
  }

  if (payload.talk_next_at !== undefined) {
    updateData.talkNextAt = toDateOnly(payload.talk_next_at);
  }

  if (payload.talk_notified_at !== undefined) {
    updateData.talkNotifiedAt = toDateOnly(payload.talk_notified_at);
  }

  /**
   * Same behavior as old API:
   * undefined = do not change photo
   * null = remove photo
   * string = save photo uri
   */
  if (payload.photo_uri !== undefined) {
    updateData.photoUri = payload.photo_uri;
  }

  if (payload.notes !== undefined) {
    updateData.notes = payload.notes;
  }

  await db
    .update(contact)
    .set(updateData)
    .where(
      and(
        eq(contact.id, contactId),
        eq(contact.userId, LOCAL_USER_ID),
        isNull(contact.deletedAt)
      )
    );

  await replaceContactTags(contactId, payload);

  return fetchContactById(contactId);
}

export async function deleteContact(id: AppId | number) {
  const contactId = String(id);

  await db
    .update(contact)
    .set({
      deletedAt: now(),
      updatedAt: now(),
    })
    .where(
      and(
        eq(contact.id, contactId),
        eq(contact.userId, LOCAL_USER_ID),
        isNull(contact.deletedAt)
      )
    );

  return {
    data: null,
    status: 204,
  };
}