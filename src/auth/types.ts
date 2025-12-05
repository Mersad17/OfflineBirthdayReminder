// src/auth/types.ts
export type LoginPayload = { email: string; password: string };
export type RegisterPayload = { email: string; password: string; username?: string };
export type TokenPair = { access: string; refresh: string };
export type User = {
    id: number;
    email: string;
    first_name?: string;    
    last_name?: string;    
  };
  