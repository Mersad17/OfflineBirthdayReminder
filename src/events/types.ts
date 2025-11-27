export type EventType = number; // your backend uses integer enum; you can refine later

export type ReminderDTO = {
  id: number;
  days_before: number | null;
  absolute_datetime: string | null;
  send_at: string | null;
  status: number;
};

export type EventDTO = {
  next_occurrence: string;
  month_label: string;
  days_until: number;
  has_reminder: boolean;
  reminder_count: number;
  title: string;
  id: number;
  contact: number;        // FK id
  contact_name:string;
  type: EventType;        // birthday / custom
  date: string;           // "YYYY-MM-DD"
  time?: string | null;   // "HH:MM:SS" or null
  is_recurring: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  reminders: ReminderDTO[];
};

export type UpdateEventPayload = {
  title?: string | null;
  date?: string;
  type?: number;
  is_recurring?: boolean;
  is_active?: boolean;
};

export type UpcomingEvent = {
  id: number;
  contactId: number;
  contactName: string;
  type: EventType;
  originalDate: string;         // original event.date (YYYY-MM-DD)
  nextOccurrence: Date;         // computed next occurrence (Date object, year = now or next)
  daysUntil: number;            // 0 = today, 1 = tomorrow, …
  formattedDate: string;        // e.g., "Sat, Oct 25"
  section: "This week" | "Next week" | "Later";
};
