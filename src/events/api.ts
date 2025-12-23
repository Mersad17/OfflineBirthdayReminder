import { CreateEventInput } from "../contacts/types";
import { api } from "../lib/api";
import { EventDTO, HomeSummaryDTO, UpdateEventPayload } from "./types";

export async function fetchEvents(params?: {
  filter?: "upcoming" | "past" | "no_reminder";
  page?: number;
  q?: string;
  no_reminder?: boolean;
  type?: number[];
  contact_id?: number;
}) {
  const { filter = "upcoming", page = 1, q, no_reminder, type, contact_id } = params || {};
  const qs = new URLSearchParams();
  qs.set("filter", filter);
  qs.set("page", String(page));
  if (q?.trim()) qs.set("q", q.trim());
  if (no_reminder) qs.set("no_reminder", "true");
  if (Array.isArray(type) && type.length > 0) {
    type.forEach((t) => qs.append("type", String(t)));
  }
  
  if (typeof contact_id === "number") qs.set("contact_id", String(contact_id));

  const res = await api.get(`/events/?${qs.toString()}`);
  return res.data;
}

  export async function fetchAllEvents( page = 1) {
    const res = await api.get(`/events/?page=${page}`);
    return res.data.results || [];
  }
 
export async function createEvent(payload: CreateEventInput):Promise<CreateEventInput>{
  const res = await api.post<EventDTO>('/events/',payload)
  return res.data

}
export async function fetchEventById(id: number): Promise<EventDTO>{
  const res = await api.get<EventDTO>(`/events/${id}/`);
  return res.data;
}

export async function deleteEvent(id: number){
  return api.delete(`/events/${id}/`);
}
export async function updateEvent(id:number,payload: UpdateEventPayload): Promise <EventDTO>{
  const res = await api.patch<EventDTO>(`/events/${id}/`,payload)
  return res.data
}

export async function fetchHomeSummary(): Promise<HomeSummaryDTO>{
  const res = await api.get("/home/")
  return res.data
}