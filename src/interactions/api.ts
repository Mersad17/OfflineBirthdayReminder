import { api } from "../lib/api";
import { Interaction, PaginatedResponse ,CreateInteractionPayload, UpdateInteractionPayload} from "./types";


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
  
  
  export async function createInteraction(
    payload: CreateInteractionPayload
  ) {
    return api.post("/interactions/", payload);
  }
  export async function deleteInteraction(id:number) {
    return  api.delete(`/interactions/${id}/`)
  }
  
export function updateInteraction(
  id: number,
  payload: UpdateInteractionPayload
) {
  return api.patch(`/interactions/${id}/`, payload);
}