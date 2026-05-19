// src/config/env.ts
import Constants from "expo-constants";

export const API_BASE_URL =
  (Constants.expoConfig?.extra as any)?.API_BASE_URL ??
  // (Constants.manifest?.extra as any)?.API_BASE_URL ??
  "";

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "";

export const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "";

export const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";