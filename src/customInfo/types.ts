// src/customInfo/types.ts
import { AppId } from "../contacts/types";

export type CustomInfoScope = "contact" | "global";

export type CustomInfoFieldType =
  | "text"
  | "long_text"
  | "date"
  | "number"
  | "boolean";

export type CustomInfoField = {
  id: AppId;
  section_id: AppId;
  label: string;
  field_key: string;
  field_type: CustomInfoFieldType;
  placeholder?: string | null;
  options_json?: string | null;
  is_required: boolean;
  sort_order: number;
  created_at: string;
};

export type CustomInfoValue = {
  id: AppId;
  entry_id: AppId;
  field_id: AppId;
  contact_id: AppId;
  value_text?: string | null;
  value_number?: number | null;
  value_date?: string | null;
  value_json?: string | null;
  created_at: string;
};

export type CustomInfoEntry = {
  id: AppId;
  section_id: AppId;
  contact_id: AppId;
  sort_order: number;
  created_at: string;
  values: Record<AppId, CustomInfoValue>;
};

export type CustomInfoSection = {
  id: AppId;
  name: string;
  normalized_name: string;
  icon?: string | null;
  color?: string | null;
  scope: CustomInfoScope;
  contact_id?: AppId | null;
  is_repeatable: boolean;
  sort_order: number;
  created_at: string;
  fields: CustomInfoField[];
  entries: CustomInfoEntry[];
};

export type CreateCustomInfoFieldInput = {
  label: string;
  field_type: CustomInfoFieldType;
  placeholder?: string | null;
  is_required?: boolean;
};

export type CreateCustomInfoSectionInput = {
  contact_id: AppId;
  name: string;
  scope: CustomInfoScope;
  is_repeatable?: boolean;
  icon?: string | null;
  color?: string | null;
  fields: CreateCustomInfoFieldInput[];
};

export type UpdateCustomInfoSectionInput = {
  contact_id: AppId;
  section_id: AppId;
  name: string;
  scope: CustomInfoScope;
  is_repeatable?: boolean;
  icon?: string | null;
  color?: string | null;
  fields: CreateCustomInfoFieldInput[];
};

export type SaveCustomInfoEntryInput = {
  contact_id: AppId;
  section_id: AppId;
  entry_id?: AppId | null;
  values_by_field_id: Record<AppId, string>;
};
