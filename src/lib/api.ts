// services/api.ts
import axios from "axios";
import { API_BASE_URL } from "../config/env";
import { loadTokens, saveTokens, clearTokens } from "./storage";
import { emitLogout } from "./authEvents";

// ---------------------------------------------------------------------------
// 1. Axios instances
// ---------------------------------------------------------------------------

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Separate client for refreshing tokens (no interceptors on it)
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// ---------------------------------------------------------------------------
// 2. Refresh logic with a single shared promise
// ---------------------------------------------------------------------------

let refreshPromise: Promise<string> | null = null;

/**
 * Low-level call to backend refresh endpoint.
 * DO NOT use directly, always go through getRefreshedAccessToken.
 */
const refreshAccessToken = async (): Promise<string> => {
  const { refresh } = await loadTokens();

  if (!refresh) {
    throw new Error("No refresh token available");
  }

  // 👇 Make sure this path matches your Django urls.py
  const response = await refreshClient.post("/token/refresh/", {
    // or "/api/token/refresh/" if that's your actual path
    refresh,
  });

  const newAccess: string = response.data.access;
  const newRefresh: string = response.data.refresh ?? refresh;

  await saveTokens(newAccess, newRefresh);

  return newAccess;
};

/**
 * Wrapper that guarantees only ONE refresh request is in flight.
 * All 401s share the same refreshPromise.
 */
const getRefreshedAccessToken = async (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const token = await refreshAccessToken();
        return token;
      } finally {
        // reset so the next 401 can trigger a new refresh when needed
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
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
// 4. Response interceptor – handle 401 with refresh flow
// ---------------------------------------------------------------------------

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) {
      // network error, timeout, etc.
      return Promise.reject(error);
    }

    const status = error.response.status;

    if (
      status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/login/") &&
      !originalRequest.url?.includes("/token/refresh/") &&
      !originalRequest.url?.includes("/logout/")
    ) {
      originalRequest._retry = true;

      try {
        // 🔁 Wait for the (possibly shared) refresh promise
        const newAccess = await getRefreshedAccessToken();

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;

        // Retry the original request with fresh token
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh itself failed → this is the ONLY place we log out
        console.log("Token refresh failed", refreshError);
        await clearTokens();
        emitLogout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
