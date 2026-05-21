import { EventTypeValue } from "../events/types";

export type ContactGroup = {
  id: number;
  name: string;
  color?: string | null;
  icon?: string | null;
  created_at?: string;
};

export type ContactTag = {
  id: number;
  name: string;
  color?: string | null;
  created_at?: string;
};
export type CreateContactGroupInput = {
  name: string;
  color?: string | null;
  icon?: string | null;
};

export type CreateContactTagInput = {
  name: string;
  color?: string | null;
};
export type Contact = {
  is_favorite: boolean | null;
  id: number;
  first_name: string;
  last_name: string;
  birthday?: string | null; 
  email?: string | null;
  phone?: string | null;
  
  group?: number | null;
  group_detail?: ContactGroup | null;

  tags?: number[];
  tags_detail?: ContactTag[];
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
  group?: number | null;

  tag_names?: string[];
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
  start_time?: string | null;     
  end_date?: string |null;             
  end_time?: string | null;     
  is_recurring?: boolean;   
  
};

export type UpdateContactInput = Partial<CreateContactInput>;
