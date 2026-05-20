// src/auth/types.ts
export type LoginPayload = { email: string; password: string };
export type RegisterPayload = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  timezone: string;
};
export type TokenPair = { access: string; refresh: string };
export type User = {
    id: number;
    email: string;
    first_name?: string;    
    last_name?: string;    
  };
  
export type ChangePasswordPayload={
  current_password:string,
  new_password:string,
}

export type ChangePasswordErrorResponse = {
  current_password?: string[];   // ["Current password is incorrect."]
  new_password?: string[];       // ["This password is too short."]
  non_field_errors?: string[];   // ["Something went wrong"]
  detail?: string;               // "Some error message"
  [key: string]: any;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ForgotPasswordResponse = {
  detail: string;
};

export type ResetPasswordPayload = {
  uid: string;
  token: string;
  new_password: string;
};

export type ResetPasswordResponse = {
  detail: string;
};

export type VerifyEmailPayload = {
  uid: string;
  token: string;
};

export type VerifyEmailResponse = {
  detail: string;
};


export type ResendVerificationEmailPayload = {
  email: string;
};

export type ResendVerificationEmailResponse = {
  detail: string;
};