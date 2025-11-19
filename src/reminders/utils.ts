import { ReminderDTO } from "./types";

export function formatReminder(r: ReminderDTO) {
  if (r.days_before != null) {
    return `${r.days_before === 0 ? "Same day" : `${r.days_before} day${r.days_before > 1 ? "s" : ""} before`}`;
  }
  if (r.absolute_datetime) {
    return `At ${new Date(r.absolute_datetime).toLocaleString()}`;
  }
  return "Custom reminder";
}

export function formatSendAt(r: ReminderDTO) {
  return r.send_at ? new Date(r.send_at).toLocaleString() : "—";
}
