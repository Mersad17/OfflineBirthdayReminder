import { AppId } from "../contacts/types";

export enum InteractionType {
  CALL = 1,
  IN_PERSON = 2,
  MESSAGE = 3,
  VIDEO = 4,
  OTHER = 5,
}

export interface CreateInteractionPayload {
  contact_id: AppId;
  happened_at: string;
  duration_minutes: number | null;
  note: string | null;
  type: InteractionType;
}

export type Interaction = {
  id: AppId;
  happened_at: string;
  duration_minutes: number | null;
  note: string | null;
  type: InteractionType;
  type_label?: string;
  created_at: string;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export function interactionTypeLabel(type?: number) {
  switch (type) {
    case InteractionType.CALL:
      return "Call";
    case InteractionType.IN_PERSON:
      return "In person";
    case InteractionType.MESSAGE:
      return "Text";
    case InteractionType.VIDEO:
      return "Video";
    case InteractionType.OTHER:
    default:
      return "Other";
  }
}

export interface UpdateInteractionPayload {
  happened_at: string;
  duration_minutes: number | null;
  note: string | null;
  type: InteractionType;
}