/**
 * In Django, ids were numbers.
 * In offline-first SQLite, ids are UUID strings.
 *
 * Example:
 * "8b17c6f2-5c7f-4b28-82c5-d1f4a42cfd91"
 */
import { AppId } from "../contacts/types";
export type ContactMemoryType =
  | "note"
  | "important"
  | "ask_next_time"
  | "date";

export type ContactMemory = {
  id: AppId;
  contact: AppId;

  text: string;
  memory_type: ContactMemoryType;

  date?: string | null;

  is_pinned: boolean;

  created_at: string;
  updated_at?: string;
};

export type CreateContactMemoryInput = {
  text: string;
  memory_type?: ContactMemoryType;
  date?: string | null;
  is_pinned?: boolean;
};

export type UpdateContactMemoryInput = Partial<CreateContactMemoryInput>;