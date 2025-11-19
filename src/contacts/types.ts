export type Contact = {
    id: number;
    first_name: string;
    last_name: string;
    birthday?: string | null; 
    email?: string | null;
    phone?: string | null;
    created_at: string;
    notes: string;
  };