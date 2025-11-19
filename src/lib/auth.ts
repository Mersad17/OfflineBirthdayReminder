import axios from "axios";
import { API_BASE_URL } from "../config/env";
import { loadTokens, saveTokens, clearTokens } from "./storage";


export async function refreshAccessToken(){
    const {refresh} = await loadTokens();
    if(!refresh) throw new Error("No refresh token available");

     // Make request using *plain axios* (not the interceptors)
     const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
        refresh,
    });
    const newAccess = response.data.access;

    // Save the new access token while keeping the same refresh token
    await saveTokens(newAccess, refresh);

    return newAccess;
}