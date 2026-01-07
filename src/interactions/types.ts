export enum InteractionType {
  CALL = 1,
  IN_PERSON = 2,
  MESSAGE = 3,
  VIDEO = 4,
  OTHER = 5,
}
export interface CreateInteractionPayload {
  contact_id: number;
  happened_at: string;    
  duration_minutes: number | null;
  note: string | null;
  type: InteractionType;

}

export type Interaction = {
  id: number;
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
      case 1:
        return "Call";
      case 2:
        return "Text";
      case 3:
        return "In person";
      case 4:
        return "Email";
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
  