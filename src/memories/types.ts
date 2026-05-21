export type MemoryType =
  | "note"
  | "important"
  | "ask_next_time"
  | "date";

export type ContactMemory = {
  id: number;
  contact: number;
  text: string;
  memory_type: MemoryType;
  date?: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateContactMemoryInput = {
  text: string;
  memory_type: MemoryType;
  date?: string | null;
  is_pinned?: boolean;
};

export type UpdateContactMemoryInput = Partial<CreateContactMemoryInput>;