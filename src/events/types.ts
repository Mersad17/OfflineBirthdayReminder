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
  contact_first_name:string;
  contact_last_name:string;
  contact_photo:string;
  contact: number;        // FK id
  contact_name:string;
  type: EventType;        // birthday / custom
  start_date: string;           // "YYYY-MM-DD"
  time?: string | null;   // "HH:MM:SS" or null
  is_recurring: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  reminders: ReminderDTO[];
};

export type UpdateEventPayload = {
  title: string;
  start_date?: string;
  time?: string;
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

export type EventTypeValue = 1 | 2 | 3 | 4 | 5 | 6;

export const EVENT_TYPE_META: Record<
  EventTypeValue,
  { icon: string; label: string }
> = {
  1: { icon: "🎂", label: "Birthday" },         // BIRTHDAY
  2: { icon: "💍", label: "Anniversary" },      // ANNIVERSARY
  3: { icon: "⭐", label: "Important date" },   // IMPORTANT_DATE
  4: { icon: "🤝", label: "Meeting" },         // MEETING
  5: { icon: "🏝", label: "Holiday" },         // HOLIDAY
  6: { icon: "✨", label: "Other" },           // OTHER
};


export type HomeEventDTO = {
  id: number;
  contact_id: number;
  contact_name: string;
  type: number;           // EventTypeValue (1..6) côté front
  next_occurrence: string; // ISO date string "2025-03-24"
  days_until: number;      // 0 = today, >0 future, <0 passé
};

export type TypeInsightDTO = {
  type: number;   // EventTypeValue
  count: number;
};

export type HomeSummaryDTO = {
  today: HomeEventDTO[];
  upcoming: HomeEventDTO[];
  recently_celebrated: HomeEventDTO[];
  type_insights: TypeInsightDTO[];
  meta: {
    upcoming_week_count: number;
    total_contacts: number;
  };
};
