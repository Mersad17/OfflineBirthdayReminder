import { AppId } from "../contacts/types";

export type ContactProfileSectionKey =
  | "primary_actions"
  | "about"
  | "ask_next_time"
  | "memory_hub"
  | "custom_info"
  | "events"
  | "recent_history"
  | "relationship_health"
  | "life_circle"
  | "photo_albums";

export type ContactProfileSectionVariant = "default" | "compact" | "full";

export type ContactProfileLayoutScope = "global" | "group" | "contact";

export type ContactProfileLayoutSource =
  | "default"
  | "global"
  | "group"
  | "contact";

export type ContactProfileLayoutItem = {
  key: ContactProfileSectionKey;
  visible: boolean;
  order: number;
  variant: ContactProfileSectionVariant;
};

export type ContactProfileLayout = {
  version: 1;
  scope: ContactProfileLayoutScope;
  scopeId: AppId | null;
  items: ContactProfileLayoutItem[];
  updatedAt: string;
};

export type ResolvedContactProfileLayout = {
  source: ContactProfileLayoutSource;
  layout: ContactProfileLayout;
};