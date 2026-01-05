export type Interaction = {
    id: number;
    happened_at: string;          // ISO datetime
    duration_minutes: number | null;
    note: string | null;
    created_at: string;
  };
  
  export type PaginatedResponse<T> = {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
  };
  