import { EventTypeValue } from "../events/types";

/**
 * In Django, ids were numbers.
 * In offline-first SQLite, ids are UUID strings.
 *
 * Example:
 * "8b17c6f2-5c7f-4b28-82c5-d1f4a42cfd91"
 */
export type AppId = string;

export type ContactGroup = {
  id: AppId;
  name: string;
  normalized_name?: string;
  color?: string | null;
  icon?: string | null;
  created_at?: string;
};

export type ContactFilters = {
  page?: number;
  group?: AppId | null;
  tag?: AppId | null;
  search?: string;
};
export type ContactTag = {
  id: AppId;
  name: string;
  normalized_name?: string;
  color?: string | null;
  created_at?: string;
};

export type CreateContactGroupInput = {
  name: string;
  color?: string | null;
  icon?: string | null;
};

export type CreateContactTagInput = {
  name: string;
  color?: string | null;
};

export type Contact = {
  id: AppId;

  first_name: string;
  last_name?: string | null;

  birthday?: string | null;
  email?: string | null;
  phone?: string | null;
    met_at?: string | null;
    known_since?: string | null;
    relationship_label?: string | null;
  /**
   * Keep same idea as Django API:
   * group = id
   * group_detail = full object
   */
  group?: AppId | null;
  group_detail?: ContactGroup | null;

  /**
   * Keep same idea as Django API:
   * tags = array of ids
   * tags_detail = array of full tag objects
   */
  tags?: AppId[];
  tags_detail?: ContactTag[];

  is_favorite: boolean;

  created_at: string;

  short_description?: string | null;

  /**
   * Old API used `photo`.
   * Your create/update input uses `photo_uri`.
   * We keep both to avoid screen changes.
   */
  photo?: string | null;
  photo_uri?: string | null;

  next_event?: {
    type: EventTypeValue;
    date: string;
  } | null;

  talk_every_days?: number | null;
  talk_last_at?: string | null; // YYYY-MM-DD
  talk_next_at?: string | null; // YYYY-MM-DD
  talk_notified_at?: string | null; // YYYY-MM-DD
};

export type CreateContactInput = {
  first_name: string;
  is_favorite?: boolean | null;

  last_name?: string | null;
  birthday?: string | null;
  email?: string | null;
  phone?: string | null;
met_at?: string | null;
known_since?: string | null;
relationship_label?: string | null;
  /**
   * group is now UUID string instead of number.
   */
  group?: AppId | null;

  /**
   * You currently create tags by names.
   * Example: ["gym", "family", "important"]
   */
  tag_names?: string[];

  /**
   * Optional if later you select existing tags by id.
   */
  tags?: AppId[];

  short_description?: string | null;

  /**
   * Local Expo image URI.
   */
  photo_uri?: string | null;

  talk_every_days?: number | null;
  talk_last_at?: string | null; // YYYY-MM-DD
  talk_next_at?: string | null; // YYYY-MM-DD
  talk_notified_at?: string | null; // YYYY-MM-DD
};

export type UpdateContactInput = Partial<CreateContactInput>;

export type CreateEventInput = {
  /**
   * Contact id is now UUID string.
   */
  contact: AppId;

  title?: string;

  /**
   * Keep this as number for now if your event type still comes from old logic.
   * Later, when we migrate events, we can change this too.
   */
  type?: number;

  start_date: string;
  start_time?: string | null;

  end_date?: string | null;
  end_time?: string | null;

  is_recurring?: boolean;
};
