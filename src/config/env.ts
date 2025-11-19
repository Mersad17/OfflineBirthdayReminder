// src/config/env.ts
import Constants from "expo-constants";

export const API_BASE_URL =
  (Constants.expoConfig?.extra as any)?.API_BASE_URL ??
  (Constants.manifest?.extra as any)?.API_BASE_URL ??
  "";
