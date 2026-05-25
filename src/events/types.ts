
export type EventTypeValue = 1 | 2 | 3 | 4 | 5 | 6;

export type EventType = EventTypeValue;

import { AppId, Contact } from "../contacts/types";

export type ReminderStatus = number;

export const REMINDER_STATUS = {
  PENDING: 1,
  SENT: 2,
  FAILED: 3,
  CANCELLED: 4,
} as const;

export type ReminderDTO = {
  id: AppId;

  event: AppId;

  days_before: number | null;

  absolute_datetime: string | null;

  time_of_day?: string | null;

  send_at: string | null;

  status: ReminderStatus;

  is_active: boolean;

  notification_id?: string | null;

  created_at?: string;
  updated_at?: string;
};

export type CreateReminderInput = {
  event: AppId;

  days_before?: number | null;
  absolute_datetime?: string | null;
  time_of_day?: string | null;
  send_at?: string | null;

  status?: ReminderStatus;
  is_active?: boolean;
};

export type UpdateReminderInput = Partial<CreateReminderInput>;
export type EventDTO = {
  id: AppId;

  title: string;

  contact: AppId;
    contact_detail?: Contact | null;
  contact_id?: AppId;
  contact_name: string;
  contact_first_name: string;
  contact_last_name: string;
  contact_photo: string | null;

  type: EventTypeValue;

  start_date: string;
  start_time?: string | null;

  end_date?: string | null;
  end_time?: string | null;

  is_recurring: boolean;
  is_active: boolean;

  created_at: string;
  updated_at: string;

  reminders: ReminderDTO[];

  has_reminder: boolean;
  reminder_count: number;

  next_occurrence: string;
  month_label: string;
  days_until: number;
  duration_minutes?: number | null;
};

export type CreateEventInput = {
  contact: AppId;

  title?: string | null;

  type?: EventTypeValue;

  start_date: string;
  start_time?: string | null;

  end_date?: string | null;
  end_time?: string | null;

  is_recurring?: boolean;
  is_active?: boolean;
};

export type UpdateEventPayload = Partial<CreateEventInput>;

export type UpcomingEvent = {
  id: AppId;
  contactId: AppId;
  contactName: string;

  type: EventTypeValue;

  originalDate: string;
  nextOccurrence: Date;
  daysUntil: number;
  formattedDate: string;

  section: "This week" | "Next week" | "Later";
};

export const EVENT_TYPE_META: Record<
  EventTypeValue,
  { icon: string; label: string }
> = {
  1: { icon: "🎂", label: "Birthday" },
  2: { icon: "💍", label: "Anniversary" },
  3: { icon: "⭐", label: "Important date" },
  4: { icon: "🤝", label: "Meeting" },
  5: { icon: "🏝", label: "Holiday" },
  6: { icon: "✨", label: "Other" },
};

export type HomeEventDTO = {
  id: AppId;

  contact_id: AppId;
  contact_name: string;

  type: EventTypeValue;

  next_occurrence: string;
  days_until: number;
};

export type TypeInsightDTO = {
  type: EventTypeValue;
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