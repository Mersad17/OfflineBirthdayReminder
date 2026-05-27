import {
  ContactProfileLayout,
  ContactProfileLayoutItem,
  ContactProfileLayoutScope,
  ContactProfileSectionKey,
  ContactProfileSectionVariant,
} from "./types";

export const CONTACT_PROFILE_SECTION_KEYS = [
  "primary_actions",
  "about",
  "ask_next_time",
  "memory_hub",
  "custom_info",
  "events",
  "recent_history",
  "relationship_health",
  "life_circle",
  "photo_albums",
] as const satisfies readonly ContactProfileSectionKey[];

export const CONTACT_PROFILE_SECTION_META: Record<
  ContactProfileSectionKey,
  {
    title: string;
    subtitle: string;
    icon: string;
  }
> = {
  primary_actions: {
    title: "Quick actions",
    subtitle: "Fast actions for this person",
    icon: "flash-outline",
  },
  about: {
    title: "About",
    subtitle: "Basic personal details",
    icon: "person-outline",
  },
  ask_next_time: {
    title: "Ask next time",
    subtitle: "Thoughtful questions to remember",
    icon: "bulb-outline",
  },
  memory_hub: {
    title: "Things to remember",
    subtitle: "Important memories, notes, and asks",
    icon: "albums-outline",
  },
  custom_info: {
    title: "Custom info",
    subtitle: "Your own personal sections",
    icon: "construct-outline",
  },
  events: {
    title: "Events & dates",
    subtitle: "Birthdays, reminders, and important dates",
    icon: "calendar-outline",
  },
  recent_history: {
    title: "Recent history",
    subtitle: "Recent interactions with this person",
    icon: "time-outline",
  },
  relationship_health: {
    title: "Relationship rhythm",
    subtitle: "Check-in rhythm and connection strength",
    icon: "heart-outline",
  },
  life_circle: {
    title: "Life circle",
    subtitle: "People connected to this person",
    icon: "git-network-outline",
  },
  photo_albums: {
    title: "Photo albums",
    subtitle: "Shared memories and photos",
    icon: "images-outline",
  },
};

export const DEFAULT_CONTACT_PROFILE_LAYOUT_ITEMS: ContactProfileLayoutItem[] =
  CONTACT_PROFILE_SECTION_KEYS.map((key, index) => ({
    key,
    visible: true,
    order: index,
    variant: "default",
  }));

export function createDefaultContactProfileLayout(
  scope: ContactProfileLayoutScope = "global",
  scopeId: string | null = null
): ContactProfileLayout {
  return {
    version: 1,
    scope,
    scopeId,
    items: DEFAULT_CONTACT_PROFILE_LAYOUT_ITEMS.map((item) => ({ ...item })),
    updatedAt: new Date().toISOString(),
  };
}

function isSectionKey(value: unknown): value is ContactProfileSectionKey {
  return (
    typeof value === "string" &&
    (CONTACT_PROFILE_SECTION_KEYS as readonly string[]).includes(value)
  );
}

function isVariant(value: unknown): value is ContactProfileSectionVariant {
  return value === "default" || value === "compact" || value === "full";
}

export function normalizeContactProfileLayout(
  raw: unknown,
  scope: ContactProfileLayoutScope,
  scopeId: string | null
): ContactProfileLayout {
  const rawObject =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const rawItems = Array.isArray(rawObject.items) ? rawObject.items : [];

  const storedByKey = new Map<
    ContactProfileSectionKey,
    Partial<ContactProfileLayoutItem>
  >();

  for (const rawItem of rawItems) {
    if (!rawItem || typeof rawItem !== "object") continue;

    const item = rawItem as Record<string, unknown>;

    if (!isSectionKey(item.key)) continue;

    storedByKey.set(item.key, {
      key: item.key,
      visible: typeof item.visible === "boolean" ? item.visible : true,
      order: typeof item.order === "number" ? item.order : undefined,
      variant: isVariant(item.variant) ? item.variant : "default",
    });
  }

  const mergedItems = CONTACT_PROFILE_SECTION_KEYS.map((key, defaultIndex) => {
    const stored = storedByKey.get(key);

    return {
      key,
      visible: stored?.visible ?? true,
      order:
        typeof stored?.order === "number" && Number.isFinite(stored.order)
          ? stored.order
          : defaultIndex,
      variant: stored?.variant ?? "default",
    };
  })
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({
      ...item,
      order: index,
    }));

  return {
    version: 1,
    scope,
    scopeId,
    items: mergedItems,
    updatedAt:
      typeof rawObject.updatedAt === "string"
        ? rawObject.updatedAt
        : new Date().toISOString(),
  };
}

export function normalizeContactProfileLayoutItems(
  items: ContactProfileLayoutItem[]
): ContactProfileLayoutItem[] {
  const raw = {
    items,
    updatedAt: new Date().toISOString(),
  };

  return normalizeContactProfileLayout(raw, "global", null).items;
}