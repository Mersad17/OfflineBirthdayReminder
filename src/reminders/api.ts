import { api } from "../lib/api";
import { ReminderDTO } from "./types";

export async function fetchReminders(): Promise<ReminderDTO[]> {
  const res = await api.get<ReminderDTO[]>("/reminders/");
  return res.data;
}

export type CreateReminderPayload = {
  event: number;
  days_before?: number | null;
  absolute_datetime?: string | null;
};

export async function createReminder(payload: CreateReminderPayload): Promise<ReminderDTO> {
  const res = await api.post<ReminderDTO>("/reminders/", payload);
  return res.data;
}
export async function fetchRemindersByEvent(eventId: number): Promise<ReminderDTO[]> {
    const res = await api.get<ReminderDTO[]>(`/reminders/?event=${eventId}`);
    return res.data;
  }