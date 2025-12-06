// src/notifications/api.ts
import { api } from "../lib/api";
export type PushStatusResponse = {
    push_enabled: boolean;
    detail?: string;
  };
export async function fetchPushStatus():Promise <PushStatusResponse> {
    const res = await api.get("/notifications/register-push-token/");
    return res.data;
  }
  
export async function unregisterPushTokens(expoPushToken?: string) {
  return api.delete("/notifications/register-push-token/", {
    data: expoPushToken ? { expo_push_token: expoPushToken } : {},
  });
}

