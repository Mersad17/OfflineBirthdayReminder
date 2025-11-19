import {api} from "../lib/api";
import { Contact } from "./types";

export async function fetchContacts(page = 1) {
    const res = await api.get(`/contacts/?page=${page}`);
    // Return just the results array
    return res.data.results || [];
  }
  



export async function createContact(payload: Contact): Promise<Contact>{
    const res = await api.post<Contact>("/contacts/",payload)
    return res.data;
}

export async function fetchContactById(id: number): Promise<Contact> {
    const res = await api.get<Contact>(`/contacts/${id}/`);
    return res.data;
  }