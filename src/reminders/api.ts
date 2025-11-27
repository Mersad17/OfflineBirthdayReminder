import { api } from "../lib/api";
import { ReminderDTO } from "./types";

export async function fetchReminders(): Promise<ReminderDTO[]> {
  const res = await api.get<ReminderDTO[]>("/reminders/");
  return res.data;
}


export async function createReminder(eventId: number, payload: Partial<ReminderDTO>) {
  const res = await api.post("/reminders/", {
    event: eventId,
    ...payload,
  });
  return res.data;
}

export async function updateReminder(id: number, payload: Partial<ReminderDTO>) {
  const res = await api.patch(`/reminders/${id}/`, payload);
  return res.data;
}

export async function deleteReminder(id: number) {
  await api.delete(`/reminders/${id}/`);
  return true;
}


