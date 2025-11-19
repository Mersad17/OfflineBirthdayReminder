import axios from "axios";
import { API_BASE_URL } from "../config/env";
import { loadTokens,saveTokens, clearTokens } from "./storage";
import { refreshAccessToken } from "./auth";
import { emitLogout } from "./authEvents";

//  Create an Axios instance
export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
})
// Attach Access Token to Every Request
// You automatically add the Authorization header before every request.
// loadTokens() gets the access token from SecureStore or memory.
// If there's no token (not logged in), we don’t attach anything.
// This is a clean, modular way to handle auth across your app.
api.interceptors.request.use( async(config) => {
    const {access} = await loadTokens();
    if (access){
        config.headers =config.headers ??{};
        config.headers.Authorization = `Bearer ${access}`;
    }
    return config
})

//  add refresh-token logic later if needed;

// Handle expired access tokens
api.interceptors.response.use(
    (response) => response, // no issue, move on
    async (error) => {
        const originalRequest = error.config;

        // If unauthorized and not already retried, attempt refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true; // prevent infinite retry loop

            try {
                const newAccess = await refreshAccessToken(); 

                // Attach new token and retry the request
                originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                return api(originalRequest);
            } catch (err) {
                // Refresh token failed → logout user
                await clearTokens();
                emitLogout();
                return Promise.reject(err); // let app redirect to login
            }
        }

        return Promise.reject(error);
    }
);