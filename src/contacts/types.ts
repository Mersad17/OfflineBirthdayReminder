import { EventTypeValue } from "../events/types";

export type Contact = {
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
        
};

export type CreateContactInput = {
  first_name: string;
  last_name?: string| null;
  birthday?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  photo_uri?: string | null; 
};

export type CreateEventInput = {
  contact: number;          
  title?: string;           
  type?: number;            
  date: string;             
  time?: string | null;     
  is_recurring?: boolean;   
};