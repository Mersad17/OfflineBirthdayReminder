import {api} from "../lib/api";
import { Contact, CreateContactInput } from "./types";

export async function fetchContacts(page = 1) {
    const res = await api.get(`/contacts/?page=${page}`);
    // Return just the results array
    return res.data.results || [];
  }
  


export async function createContact(payload: CreateContactInput): Promise<CreateContactInput>{
    const res = await api.post<CreateContactInput>("/contacts/",payload)
    return res.data;
}

export async function fetchContactById(id: number): Promise<Contact> {
    const res = await api.get<Contact>(`/contacts/${id}/`);
    return res.data;
}

export async function updateContact(id:number,payload:CreateContactInput): Promise<CreateContactInput> {
  const res = await api.patch<CreateContactInput>(`/contacts/${id}/`,payload);
  return res.data;
}

export async function deleteContact(id:number){
  return api.delete(`/contacts/${id}/`);
}