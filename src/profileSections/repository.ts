import { eq } from "drizzle-orm";

import { db } from "../db/client";
import { appSetting } from "../db/schema";
import { AppId } from "../contacts/types";
import {
  ContactProfileLayout,
  ContactProfileLayoutItem,
  ResolvedContactProfileLayout,
} from "./types";
import {
  createDefaultContactProfileLayout,
  normalizeContactProfileLayout,
} from "./defaults";

const GLOBAL_LAYOUT_KEY = "contact_profile_layout.global";
const GROUP_LAYOUT_KEY_PREFIX = "contact_profile_layout.group.";
const CONTACT_LAYOUT_KEY_PREFIX = "contact_profile_layout.contact.";

function now() {
  return new Date();
}

function toOptionalId(id: AppId | number | null | undefined) {
  if (id === null || id === undefined || id === "") return null;
  return String(id);
}

function contactLayoutKey(contactId: AppId | number) {
  return `${CONTACT_LAYOUT_KEY_PREFIX}${String(contactId)}`;
}

function groupLayoutKey(groupId: AppId | number) {
  return `${GROUP_LAYOUT_KEY_PREFIX}${String(groupId)}`;
}

function safeParseJson(value: string | null | undefined): unknown | null {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function readSettingJson(key: string): Promise<unknown | null> {
  const rows = await db
    .select()
    .from(appSetting)
    .where(eq(appSetting.key, key))
    .limit(1);

  return safeParseJson(rows[0]?.value);
}

async function writeSettingJson(key: string, value: unknown) {
  const date = now();
  const serialized = JSON.stringify(value);

  const existing = await db
    .select({
      key: appSetting.key,
    })
    .from(appSetting)
    .where(eq(appSetting.key, key))
    .limit(1);

  if (existing[0]) {
    await db
      .update(appSetting)
      .set({
        value: serialized,
        updatedAt: date,
      })
      .where(eq(appSetting.key, key));

    return;
  }

  await db.insert(appSetting).values({
    key,
    value: serialized,
    createdAt: date,
    updatedAt: date,
  });
}

async function deleteSetting(key: string) {
  await db.delete(appSetting).where(eq(appSetting.key, key));
}

export async function fetchGlobalContactProfileLayout(): Promise<ContactProfileLayout> {
  const raw = await readSettingJson(GLOBAL_LAYOUT_KEY);

  if (!raw) {
    return createDefaultContactProfileLayout("global", null);
  }

  return normalizeContactProfileLayout(raw, "global", null);
}

export async function fetchGroupSpecificProfileLayout(
  groupId: AppId | number | null | undefined
): Promise<ContactProfileLayout | null> {
  const id = toOptionalId(groupId);

  if (!id) return null;

  const raw = await readSettingJson(groupLayoutKey(id));

  if (!raw) return null;

  return normalizeContactProfileLayout(raw, "group", id);
}

export async function fetchContactSpecificProfileLayout(
  contactId: AppId | number | null | undefined
): Promise<ContactProfileLayout | null> {
  const id = toOptionalId(contactId);

  if (!id) return null;

  const raw = await readSettingJson(contactLayoutKey(id));

  if (!raw) return null;

  return normalizeContactProfileLayout(raw, "contact", id);
}

export async function fetchResolvedContactProfileLayout(
  contactId: AppId | number | null | undefined,
  groupId?: AppId | number | null
): Promise<ResolvedContactProfileLayout> {
  const contactLayout = await fetchContactSpecificProfileLayout(contactId);

  if (contactLayout) {
    return {
      source: "contact",
      layout: contactLayout,
    };
  }

  const groupLayout = await fetchGroupSpecificProfileLayout(groupId);

  if (groupLayout) {
    return {
      source: "group",
      layout: groupLayout,
    };
  }

  const rawGlobal = await readSettingJson(GLOBAL_LAYOUT_KEY);

  if (rawGlobal) {
    return {
      source: "global",
      layout: normalizeContactProfileLayout(rawGlobal, "global", null),
    };
  }

  return {
    source: "default",
    layout: createDefaultContactProfileLayout("global", null),
  };
}

export async function saveGlobalContactProfileLayout(
  items: ContactProfileLayoutItem[]
): Promise<ContactProfileLayout> {
  const layout = normalizeContactProfileLayout(
    {
      version: 1,
      scope: "global",
      scopeId: null,
      items,
      updatedAt: new Date().toISOString(),
    },
    "global",
    null
  );

  await writeSettingJson(GLOBAL_LAYOUT_KEY, layout);

  return layout;
}

export async function saveGroupContactProfileLayout(
  groupId: AppId | number,
  items: ContactProfileLayoutItem[]
): Promise<ContactProfileLayout> {
  const id = String(groupId);

  const layout = normalizeContactProfileLayout(
    {
      version: 1,
      scope: "group",
      scopeId: id,
      items,
      updatedAt: new Date().toISOString(),
    },
    "group",
    id
  );

  await writeSettingJson(groupLayoutKey(id), layout);

  return layout;
}

export async function saveContactProfileLayout(
  contactId: AppId | number,
  items: ContactProfileLayoutItem[]
): Promise<ContactProfileLayout> {
  const id = String(contactId);

  const layout = normalizeContactProfileLayout(
    {
      version: 1,
      scope: "contact",
      scopeId: id,
      items,
      updatedAt: new Date().toISOString(),
    },
    "contact",
    id
  );

  await writeSettingJson(contactLayoutKey(id), layout);

  return layout;
}

export async function deleteContactProfileLayout(contactId: AppId | number) {
  await deleteSetting(contactLayoutKey(contactId));
}

export async function deleteGroupContactProfileLayout(groupId: AppId | number) {
  await deleteSetting(groupLayoutKey(groupId));
}

export async function saveGroupLayoutAndResetContactLayout(
  contactId: AppId | number,
  groupId: AppId | number,
  items: ContactProfileLayoutItem[]
): Promise<ContactProfileLayout> {
  const groupLayout = await saveGroupContactProfileLayout(groupId, items);

  await deleteContactProfileLayout(contactId);

  return groupLayout;
}

export async function saveGlobalLayoutAndResetContactLayout(
  contactId: AppId | number,
  items: ContactProfileLayoutItem[]
): Promise<ContactProfileLayout> {
  const globalLayout = await saveGlobalContactProfileLayout(items);

  await deleteContactProfileLayout(contactId);

  return globalLayout;
}