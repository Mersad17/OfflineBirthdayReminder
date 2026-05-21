import { api } from "../lib/api";
import {
  Contact,
  ContactGroup,
  ContactTag,
  CreateContactInput,
  UpdateContactInput,
} from "./types";
export type ContactFilters = {
  page?: number;
  group?: number | null;
  tag?: number | null;
  search?: string;
};

export async function fetchContacts(
  filtersOrPage: ContactFilters | number = {}
) {
  const filters =
    typeof filtersOrPage === "number"
      ? { page: filtersOrPage }
      : filtersOrPage;

  const res = await api.get("/contacts/", {
    params: {
      page: filters.page ?? 1,
      group: filters.group || undefined,
      tag: filters.tag || undefined,
      search: filters.search || undefined,
    },
  });

  return res.data;
}
export async function fetchContactGroups(options?: {
  onlyUsed?: boolean;
}): Promise<ContactGroup[]> {
  const res = await api.get("/groups/", {
    params: {
      only_used: options?.onlyUsed ? "true" : undefined,
    },
  });

  return res.data.results ?? res.data;
}
export async function createContactGroup(payload: {
  name: string;
  color?: string | null;
  icon?: string | null;
}): Promise<ContactGroup> {
  const res = await api.post<ContactGroup>("/groups/", payload);
  return res.data;
}

export async function updateContactGroup(
  id: number,
  payload: {
    name?: string;
    color?: string | null;
    icon?: string | null;
  }
): Promise<ContactGroup> {
  const res = await api.patch<ContactGroup>(
    `/groups/${id}/`,
    payload
  );

  return res.data;
}

export async function deleteContactGroup(id: number) {
  return api.delete(`/groups/${id}/`);
}

export async function createContactTag(payload: {
  name: string;
  color?: string | null;
}): Promise<ContactTag> {
  const res = await api.post<ContactTag>("/tags/", payload);
  return res.data;
}

export async function updateContactTag(
  id: number,
  payload: {
    name?: string;
    color?: string | null;
  }
): Promise<ContactTag> {
  const res = await api.patch<ContactTag>(
    `/tags/${id}/`,
    payload
  );

  return res.data;
}

export async function deleteContactTag(id: number) {
  return api.delete(`/tags/${id}/`);
}

export async function fetchContactTags(): Promise<ContactTag[]> {
  const res = await api.get("/tags/");

  // Works with paginated or non-paginated DRF responses
  return res.data.results ?? res.data;
}



function isRemoteUrl(uri: string) {
  return uri.startsWith("http://") || uri.startsWith("https://");
}

function guessMimeType(uri: string) {
  const ext = uri.split(".").pop()?.toLowerCase();

  if (ext === "png") return "image/png";
  if (ext === "heic") return "image/heic";
  if (ext === "heif") return "image/heif";

  return "image/jpeg";
}

function buildContactFormData(payload: CreateContactInput): FormData {
  const form = new FormData();
  const { photo_uri, ...rest } = payload;

  Object.entries(rest).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    // Important for tag_names: ["gym", "important"]
    // Sends:
    // tag_names=gym
    // tag_names=important
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item === undefined || item === null) return;

        const cleanValue = String(item).trim();

        if (!cleanValue) return;

        form.append(key, cleanValue);
      });

      return;
    }

    form.append(key, String(value));
  });

  // Only attach photo when it is a local file:// upload
  if (photo_uri && !isRemoteUrl(photo_uri)) {
    const fileName = photo_uri.split("/").pop() || "photo.jpg";

    const file: any = {
      uri: photo_uri,
      name: fileName,
      type: guessMimeType(photo_uri),
    };

    form.append("photo", file);
  }

  return form;
}

export async function createContact(
  payload: CreateContactInput
): Promise<Contact> {
  const form = buildContactFormData(payload);

  const res = await api.post<Contact>("/contacts/", form, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
}

export async function fetchContactById(id: number): Promise<Contact> {
  const res = await api.get<Contact>(`/contacts/${id}/`);
  return res.data;
}

export async function updateContact(
  id: number,
  payload: UpdateContactInput
): Promise<Contact> {
  const { photo_uri, ...rest } = payload;

  // No photo change → normal JSON PATCH
  // This is best for group/tag updates too.
  if (photo_uri === undefined) {
    const res = await api.patch<Contact>(`/contacts/${id}/`, rest);
    return res.data;
  }

  // Remove photo → JSON PATCH with photo:null
  if (photo_uri === null) {
    const res = await api.patch<Contact>(`/contacts/${id}/`, {
      ...rest,
      photo: null,
    });

    return res.data;
  }

  // Remote photo URL means existing image, no upload change
  if (isRemoteUrl(photo_uri)) {
    const res = await api.patch<Contact>(`/contacts/${id}/`, rest);
    return res.data;
  }

  // New local photo picked → multipart PATCH
  const form = buildContactFormData(payload as CreateContactInput);

  const res = await api.patch<Contact>(`/contacts/${id}/`, form, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
}

export async function deleteContact(id: number) {
  return api.delete(`/contacts/${id}/`);
}