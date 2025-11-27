export type ReminderStatus = number; // pending, sent, skipped

export type ReminderDTO = {
  id: number;
  event: number;
  days_before: number | null;
  absolute_datetime: string | null;
  status: number;
  send_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
