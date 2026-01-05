import { api } from "../lib/api";
import { Interaction, PaginatedResponse } from "./types";


export async function fetchInteractionForContact(
  contactId: number
): Promise<Interaction[]> {
  const res = await api.get(
    `/contacts/${contactId}/interactions/?limit=5`
  );

  // backend returns ARRAY when limit is used
  if (Array.isArray(res.data)) {
    return res.data;
  }

  // fallback safety (in case pagination is re-enabled later)
  return res.data.results ?? [];
}

  

export async function fetchInteractionsPaginated(
    contactId: number,
    page = 1
  ): Promise<PaginatedResponse<Interaction>> {
    const res = await api.get(
      `/contacts/${contactId}/interactions/?page=${page}`
    );
    return res.data;
  }
  

export async function createInteraction(payload: {
    contact_id: number;
    duration_minutes: number | null;
    happened_at: string;
    note: string | null;
  }) {
    return api.post("/interactions/", payload);
  }
  