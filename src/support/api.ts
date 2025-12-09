import { api } from "../lib/api";


export async function reportBug(payload: {
    title: string;
    description: string;
    app_version?: string;
    platform?: string;
  }) {
    const res = await api.post("/support/report-bug/", payload);
    return res.data;
  }


export async function sendFeedback(payload: {
    message: string;
    app_version?: string;
    platform?: string;
  }) {
    const res = await api.post("/support/feedback/", payload);
    return res.data;
  }