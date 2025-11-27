import { CreateEventInput } from "../contacts/types";
import { api } from "../lib/api";
import { EventDTO, UpdateEventPayload } from "./types";

export async function fetchEvents(filter: "upcoming" | "past" | "no_reminder" = "upcoming", page = 1) {
    const res = await api.get(`/events/?filter=${filter}&page=${page}`);
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
