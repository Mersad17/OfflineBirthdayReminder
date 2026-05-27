// src/customInfo/repository.ts

import { and, asc, eq, isNull, or } from "drizzle-orm";
import { createId } from "../lib/id";
import { db } from "../db/client";
import {
  customInfoEntry,
  customInfoField,
  customInfoSection,
  customInfoValue,
} from "../db/schema";

import {
  AppId,
} from "../contacts/types";

import {
  CreateCustomInfoSectionInput,
  CustomInfoEntry,
  CustomInfoField,
  CustomInfoSection,
  CustomInfoValue,
  SaveCustomInfoEntryInput,
  UpdateCustomInfoSectionInput,
} from "./types";

const LOCAL_USER_ID = "local";

function now() {
  return new Date();
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function makeFieldKey(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "");
}

function toIso(value: Date | null | undefined): string {
  if (!value) return new Date().toISOString();
  return value.toISOString();
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

function mapFieldToApi(
  row: typeof customInfoField.$inferSelect
): CustomInfoField {
  return {
    id: row.id,
    section_id: row.sectionId,
    label: row.label,
    field_key: row.fieldKey,
    field_type: row.fieldType as CustomInfoField["field_type"],
    placeholder: row.placeholder,
    options_json: row.optionsJson,
    is_required: row.isRequired,
    sort_order: row.sortOrder,
    created_at: toIso(row.createdAt),
  };
}

function mapValueToApi(
  row: typeof customInfoValue.$inferSelect
): CustomInfoValue {
  return {
    id: row.id,
    entry_id: row.entryId,
    field_id: row.fieldId,
    contact_id: row.contactId,
    value_text: row.valueText,
    value_number: row.valueNumber,
    value_date: row.valueDate,
    value_json: row.valueJson,
    created_at: toIso(row.createdAt),
  };
}

function mapEntryToApi(
  row: typeof customInfoEntry.$inferSelect,
  values: CustomInfoValue[]
): CustomInfoEntry {
  return {
    id: row.id,
    section_id: row.sectionId,
    contact_id: row.contactId,
    sort_order: row.sortOrder,
    created_at: toIso(row.createdAt),

    values: values.reduce((acc, value) => {
      acc[value.field_id] = value;
      return acc;
    }, {} as Record<AppId, CustomInfoValue>),
  };
}

function mapSectionToApi(
  row: typeof customInfoSection.$inferSelect,
  fields: CustomInfoField[],
  entries: CustomInfoEntry[]
): CustomInfoSection {
  return {
    id: row.id,
    name: row.name,
    normalized_name: row.normalizedName,
    icon: row.icon,
    color: row.color,
    scope: row.scope as CustomInfoSection["scope"],
    contact_id: row.contactId,
    is_repeatable: row.isRepeatable,
    sort_order: row.sortOrder,
    created_at: toIso(row.createdAt),
    fields,
    entries,
  };
}

function getTypedValuePatch(fieldType: string, rawValue: string) {
  const value = rawValue.trim();

  if (fieldType === "number") {
    return {
      valueText: null,
      valueNumber: value ? Number(value) : null,
      valueDate: null,
      valueJson: null,
    };
  }

  if (fieldType === "date") {
    return {
      valueText: null,
      valueNumber: null,
      valueDate: toDateOnly(value),
      valueJson: null,
    };
  }

  if (fieldType === "boolean") {
    return {
      valueText: null,
      valueNumber: value === "true" || value === "1" ? 1 : 0,
      valueDate: null,
      valueJson: null,
    };
  }

  return {
    valueText: value || null,
    valueNumber: null,
    valueDate: null,
    valueJson: null,
  };
}

export async function createCustomInfoSection(
  payload: CreateCustomInfoSectionInput
): Promise<CustomInfoSection> {
  const date = now();

  const cleanName = payload.name.trim();

  if (!cleanName) {
    throw new Error("Section name is required.");
  }

  const cleanFields = payload.fields
    .map((field) => ({
      ...field,
      label: field.label.trim(),
    }))
    .filter((field) => field.label);

  if (cleanFields.length === 0) {
    throw new Error("Add at least one field.");
  }

  const sectionId = await createId();

  const sectionRow: typeof customInfoSection.$inferInsert = {
    id: sectionId,
    userId: LOCAL_USER_ID,
    contactId: payload.scope === "contact" ? payload.contact_id : null,
    name: cleanName,
    normalizedName: normalizeName(cleanName),
    icon: payload.icon ?? "sparkles-outline",
    color: payload.color ?? null,
    scope: payload.scope,
    isRepeatable: payload.is_repeatable ?? true,
    sortOrder: 0,
    createdAt: date,
    updatedAt: date,
    deletedAt: null,
  };

  await db.insert(customInfoSection).values(sectionRow);

  for (let index = 0; index < cleanFields.length; index++) {
    const field = cleanFields[index];
    const fieldId = await createId();

    await db.insert(customInfoField).values({
      id: fieldId,
      sectionId,
      label: field.label,
      fieldKey: makeFieldKey(field.label),
      fieldType: field.field_type,
      placeholder: field.placeholder ?? null,
      optionsJson: null,
      isRequired: field.is_required ?? false,
      sortOrder: index,
      createdAt: date,
      updatedAt: date,
      deletedAt: null,
    });
  }

  const sections = await fetchCustomInfoForContact(payload.contact_id);
  const created = sections.find((section) => section.id === sectionId);

  if (!created) {
    throw new Error("Custom info section was created but could not be loaded.");
  }

  return created;
}


export async function updateCustomInfoSection(
  payload: UpdateCustomInfoSectionInput
): Promise<CustomInfoSection> {
  const date = now();
  const contactId = String(payload.contact_id);
  const sectionId = String(payload.section_id);
  const cleanName = payload.name.trim();

  if (!cleanName) {
    throw new Error("Section name is required.");
  }

  const cleanFields = payload.fields
    .map((field) => ({
      ...field,
      label: field.label.trim(),
    }))
    .filter((field) => field.label);

  if (cleanFields.length === 0) {
    throw new Error("Add at least one field.");
  }

  const sectionRows = await db
    .select()
    .from(customInfoSection)
    .where(
      and(
        eq(customInfoSection.id, sectionId),
        eq(customInfoSection.userId, LOCAL_USER_ID),
        isNull(customInfoSection.deletedAt)
      )
    )
    .limit(1);

  if (!sectionRows[0]) {
    throw new Error("Custom info section not found.");
  }

  await db
    .update(customInfoSection)
    .set({
      contactId: payload.scope === "contact" ? contactId : null,
      name: cleanName,
      normalizedName: normalizeName(cleanName),
      icon: payload.icon ?? "sparkles-outline",
      color: payload.color ?? null,
      scope: payload.scope,
      isRepeatable: payload.is_repeatable ?? true,
      updatedAt: date,
    })
    .where(eq(customInfoSection.id, sectionId));

  const existingFields = await db
    .select()
    .from(customInfoField)
    .where(
      and(
        eq(customInfoField.sectionId, sectionId),
        isNull(customInfoField.deletedAt)
      )
    )
    .orderBy(asc(customInfoField.sortOrder));

  for (let index = 0; index < cleanFields.length; index++) {
    const field = cleanFields[index];
    const existing = existingFields[index];

    if (existing) {
      await db
        .update(customInfoField)
        .set({
          label: field.label,
          fieldKey: makeFieldKey(field.label),
          fieldType: field.field_type,
          placeholder: field.placeholder ?? null,
          isRequired: field.is_required ?? false,
          sortOrder: index,
          updatedAt: date,
          deletedAt: null,
        })
        .where(eq(customInfoField.id, existing.id));
    } else {
      await db.insert(customInfoField).values({
        id: await createId(),
        sectionId,
        label: field.label,
        fieldKey: makeFieldKey(field.label),
        fieldType: field.field_type,
        placeholder: field.placeholder ?? null,
        optionsJson: null,
        isRequired: field.is_required ?? false,
        sortOrder: index,
        createdAt: date,
        updatedAt: date,
        deletedAt: null,
      });
    }
  }

  const removedFields = existingFields.slice(cleanFields.length);

  for (const field of removedFields) {
    await db
      .update(customInfoField)
      .set({
        deletedAt: date,
        updatedAt: date,
      })
      .where(eq(customInfoField.id, field.id));
  }

  const sections = await fetchCustomInfoForContact(contactId);
  const updated = sections.find((section) => section.id === sectionId);

  if (!updated) {
    throw new Error("Custom info section was updated but could not be loaded.");
  }

  return updated;
}

export async function deleteCustomInfoSection(sectionId: AppId): Promise<void> {
  const date = now();
  const cleanSectionId = String(sectionId);

  await db
    .update(customInfoSection)
    .set({
      deletedAt: date,
      updatedAt: date,
    })
    .where(eq(customInfoSection.id, cleanSectionId));

  await db
    .update(customInfoField)
    .set({
      deletedAt: date,
      updatedAt: date,
    })
    .where(eq(customInfoField.sectionId, cleanSectionId));

  const entries = await db
    .select()
    .from(customInfoEntry)
    .where(eq(customInfoEntry.sectionId, cleanSectionId));

  for (const entry of entries) {
    await deleteCustomInfoEntry(entry.id);
  }
}

export async function deleteCustomInfoEntry(entryId: AppId): Promise<void> {
  const date = now();
  const cleanEntryId = String(entryId);

  await db
    .update(customInfoEntry)
    .set({
      deletedAt: date,
      updatedAt: date,
    })
    .where(eq(customInfoEntry.id, cleanEntryId));

  await db
    .update(customInfoValue)
    .set({
      deletedAt: date,
      updatedAt: date,
    })
    .where(eq(customInfoValue.entryId, cleanEntryId));
}

export async function fetchCustomInfoForContact(
  contactId: AppId | number
): Promise<CustomInfoSection[]> {
  const cleanContactId = String(contactId);

  const sectionRows = await db
    .select()
    .from(customInfoSection)
    .where(
      and(
        eq(customInfoSection.userId, LOCAL_USER_ID),
        isNull(customInfoSection.deletedAt),
        or(
          eq(customInfoSection.scope, "global"),
          and(
            eq(customInfoSection.scope, "contact"),
            eq(customInfoSection.contactId, cleanContactId)
          )
        )
      )
    )
    .orderBy(
      asc(customInfoSection.sortOrder),
      asc(customInfoSection.createdAt)
    );

  const result: CustomInfoSection[] = [];

  for (const sectionRow of sectionRows) {
    const fieldRows = await db
      .select()
      .from(customInfoField)
      .where(
        and(
          eq(customInfoField.sectionId, sectionRow.id),
          isNull(customInfoField.deletedAt)
        )
      )
      .orderBy(
        asc(customInfoField.sortOrder),
        asc(customInfoField.createdAt)
      );

    const fields = fieldRows.map(mapFieldToApi);

    const entryRows = await db
      .select()
      .from(customInfoEntry)
      .where(
        and(
          eq(customInfoEntry.sectionId, sectionRow.id),
          eq(customInfoEntry.contactId, cleanContactId),
          isNull(customInfoEntry.deletedAt)
        )
      )
      .orderBy(
        asc(customInfoEntry.sortOrder),
        asc(customInfoEntry.createdAt)
      );

    const entries: CustomInfoEntry[] = [];

    for (const entryRow of entryRows) {
      const valueRows = await db
        .select()
        .from(customInfoValue)
        .where(
          and(
            eq(customInfoValue.entryId, entryRow.id),
            isNull(customInfoValue.deletedAt)
          )
        );

      const values = valueRows.map(mapValueToApi);
      entries.push(mapEntryToApi(entryRow, values));
    }

    result.push(mapSectionToApi(sectionRow, fields, entries));
  }

  return result;
}

export async function saveCustomInfoEntry(
  payload: SaveCustomInfoEntryInput
): Promise<CustomInfoEntry> {
  const date = now();
  const contactId = String(payload.contact_id);
  const sectionId = String(payload.section_id);

  const sectionRows = await db
    .select()
    .from(customInfoSection)
    .where(
      and(
        eq(customInfoSection.id, sectionId),
        eq(customInfoSection.userId, LOCAL_USER_ID),
        isNull(customInfoSection.deletedAt)
      )
    )
    .limit(1);

  if (!sectionRows[0]) {
    throw new Error("Custom info section not found.");
  }

  const fields = await db
    .select()
    .from(customInfoField)
    .where(
      and(
        eq(customInfoField.sectionId, sectionId),
        isNull(customInfoField.deletedAt)
      )
    )
    .orderBy(asc(customInfoField.sortOrder));

  const entryId = payload.entry_id ? String(payload.entry_id) : await createId();

  if (!payload.entry_id) {
    await db.insert(customInfoEntry).values({
      id: entryId,
      sectionId,
      contactId,
      sortOrder: 0,
      createdAt: date,
      updatedAt: date,
      deletedAt: null,
    });
  } else {
    await db
      .update(customInfoEntry)
      .set({
        updatedAt: date,
      })
      .where(
        and(
          eq(customInfoEntry.id, entryId),
          eq(customInfoEntry.contactId, contactId),
          isNull(customInfoEntry.deletedAt)
        )
      );
  }

  for (const field of fields) {
    const rawValue = payload.values_by_field_id[field.id] ?? "";

    const existingRows = await db
      .select()
      .from(customInfoValue)
      .where(
        and(
          eq(customInfoValue.entryId, entryId),
          eq(customInfoValue.fieldId, field.id),
          isNull(customInfoValue.deletedAt)
        )
      )
      .limit(1);

    const valuePatch = getTypedValuePatch(field.fieldType, rawValue);

    if (existingRows[0]) {
      await db
        .update(customInfoValue)
        .set({
          ...valuePatch,
          updatedAt: date,
        })
        .where(eq(customInfoValue.id, existingRows[0].id));
    } else {
      await db.insert(customInfoValue).values({
        id: await createId(),
        entryId,
        fieldId: field.id,
        contactId,
        ...valuePatch,
        createdAt: date,
        updatedAt: date,
        deletedAt: null,
      });
    }
  }

  const sections = await fetchCustomInfoForContact(contactId);
  const section = sections.find((item) => item.id === sectionId);
  const entry = section?.entries.find((item) => item.id === entryId);

  if (!entry) {
    throw new Error("Custom info entry was saved but could not be loaded.");
  }

  return entry;
}