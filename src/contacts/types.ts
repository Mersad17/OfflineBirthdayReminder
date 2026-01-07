import { EventTypeValue } from "../events/types";

export type Contact = {
  is_favorite: boolean | null;
  id: number;
  first_name: string;
  last_name: string;
  birthday?: string | null; 
  email?: string | null;
  phone?: string | null;
  created_at: string;  
  notes: string;
  photo?: string | null; 
  next_event?: {
    type: EventTypeValue;
    date: string;
  };
  talk_every_days?: number | null;
  talk_last_at?: string | null; // YYYY-MM-DD
  talk_next_at?: string | null; // YYYY-MM-DD
};

export type CreateContactInput = {
  first_name: string;
  is_favorite: boolean| null;
  last_name?: string| null;
  birthday?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  photo_uri?: string | null; 
  talk_every_days?: number | null;
  talk_last_at?: string | null; // YYYY-MM-DD
  talk_next_at?: string | null; // YYYY-MM-DD
};

export type CreateEventInput = {
  contact: number;          
  title?: string;           
  type?: number;            
  start_date: string;             
  time?: string | null;     
  is_recurring?: boolean;   
  
};

export type UpdateContactInput = Partial<CreateContactInput>;
