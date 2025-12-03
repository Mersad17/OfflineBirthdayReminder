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

export type CreateContactInput = {
  first_name: string;
  last_name?: string| null;
  birthday?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

export type CreateEventInput = {
  contact: number;          
  title?: string;           
  type?: number;            
  date: string;             
  time?: string | null;     
  is_recurring?: boolean;   
};