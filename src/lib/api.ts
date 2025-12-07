// services/api.ts
import axios from "axios";
import { API_BASE_URL } from "../config/env";
import { loadTokens, saveTokens, clearTokens } from "./storage";
import { emitLogout } from "./authEvents";

// ---------------------------------------------------------------------------
// 1. Axios instances
// ---------------------------------------------------------------------------

// Main API client (used everywhere in the app)
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Separate client for refreshing tokens (no interceptors!)
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// ---------------------------------------------------------------------------
// 2. Refresh function (uses plain axios, no interceptors)
// ---------------------------------------------------------------------------

/**
 * Refresh the access token using the refresh token stored in storage.
 * - Calls /api/token/refresh/
 * - Handles ROTATE_REFRESH_TOKENS=True (saves new refresh if returned)
 * - Persists new tokens via saveTokens(access, refresh)
 * - Returns the new access token as a string
 */
const refreshAccessToken = async (): Promise<string> => {
  const { refresh } = await loadTokens();

  if (!refresh) {
    throw new Error("No refresh token available");
  }

  const response = await refreshClient.post("/token/refresh/", {
    refresh,
  });

  // For SimpleJWT with ROTATE_REFRESH_TOKENS=True, response is usually:
  // { access: "...", refresh: "..." }  (refresh might be omitted if not rotated)
  const newAccess: string = response.data.access;
  const newRefresh: string = response.data.refresh ?? refresh;

  // ✅ match your saveTokens(access, refresh) signature
  await saveTokens(newAccess, newRefresh);

  return newAccess;
};

// ---------------------------------------------------------------------------
// 3. Request interceptor – attach access token
// ---------------------------------------------------------------------------

api.interceptors.request.use(async (config) => {
  const { access } = await loadTokens();

  if (access) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${access}`;
  }

  return config;
});

// ---------------------------------------------------------------------------
// 4. Response interceptor – handle 401 & refresh flow
// ---------------------------------------------------------------------------

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If no response at all (network error, timeout), just reject
    if (!error.response) {
      return Promise.reject(error);
    }

    const status = error.response.status;

    // Only handle 401 (Unauthorized) and avoid infinite loops
    if (
      status === 401 &&
      !originalRequest._retry &&
      // don't try to refresh if we're already on login or refresh endpoints
      !originalRequest.url?.includes("/login/") &&
      !originalRequest.url?.includes("/token/refresh/")&&
      !originalRequest.url?.includes("/logout/") 
    ) {
      originalRequest._retry = true;

      try {
        const newAccess = await refreshAccessToken();

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;

        // Retry the original request with the new token
        return api(originalRequest);
      } catch (err) {
        // Refresh failed → clear tokens & force logout
        await clearTokens();
        emitLogout();
        return Promise.reject(err);
      }
    }

    // Any other error: just bubble it up
    return Promise.reject(error);
  }
);
