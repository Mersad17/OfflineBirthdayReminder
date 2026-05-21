import { api } from "../lib/api";
import {
  ContactMemory,
  CreateContactMemoryInput,
  UpdateContactMemoryInput,
} from "./types";

export async function fetchMemoriesForContact(
  contactId: number
): Promise<ContactMemory[]> {
  const res = await api.get(`/contacts/${contactId}/memories/`);

  return res.data.results ?? res.data;
}

export async function createContactMemory(
  contactId: number,
  payload: CreateContactMemoryInput
): Promise<ContactMemory> {
  const res = await api.post<ContactMemory>(
    `/contacts/${contactId}/memories/`,
    payload
  );

  return res.data;
}

export async function updateContactMemory(
  memoryId: number,
  payload: UpdateContactMemoryInput
): Promise<ContactMemory> {
  const res = await api.patch<ContactMemory>(
    `/memories/${memoryId}/`,
    payload
  );

  return res.data;
}

export async function deleteContactMemory(memoryId: number) {
  return api.delete(`/memories/${memoryId}/`);
}