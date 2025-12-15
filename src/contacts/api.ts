import { api } from "../lib/api";
import { Contact, CreateContactInput } from "./types";

export async function fetchContacts(page = 1) {
  const res = await api.get(`/contacts/?page=${page}`);
  return res.data.results || [];
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
    form.append(key, String(value));
  });

  // ✅ Only attach photo when it's a local file:// (upload)
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

export async function createContact(payload: CreateContactInput): Promise<Contact> {
  const form = buildContactFormData(payload);

  const res = await api.post<Contact>("/contacts/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function fetchContactById(id: number): Promise<Contact> {
  const res = await api.get<Contact>(`/contacts/${id}/`);
  return res.data;
}

export async function updateContact(id: number, payload: CreateContactInput): Promise<Contact> {
  const { photo_uri, ...rest } = payload;

  // ✅ No photo change → JSON PATCH
  if (photo_uri === undefined) {
    const res = await api.patch<Contact>(`/contacts/${id}/`, rest);
    return res.data;
  }

  // ✅ Remove photo → JSON PATCH with photo:null (works reliably with DRF)
  if (photo_uri === null) {
    const res = await api.patch<Contact>(`/contacts/${id}/`, {
      ...rest,
      photo: null,
    });
    return res.data;
  }

  // ✅ New photo picked (file://) → multipart PATCH
  // (If photo_uri is a remote url, treat it as "no change")
  if (isRemoteUrl(photo_uri)) {
    const res = await api.patch<Contact>(`/contacts/${id}/`, rest);
    return res.data;
  }

  const form = buildContactFormData(payload);

  const res = await api.patch<Contact>(`/contacts/${id}/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function deleteContact(id: number) {
  return api.delete(`/contacts/${id}/`);
}
