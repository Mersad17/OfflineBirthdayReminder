import { api } from "../lib/api";
import { ChangePasswordErrorResponse, ChangePasswordPayload, LoginPayload,RegisterPayload,TokenPair, User } from "./types";
import axios from "axios";

export async function login(payload:LoginPayload):Promise<TokenPair> {
    const res = await api.post("/login/",payload) // your MyTokenObtainPairView route (often /api/token/)
    return res.data;
}
export async function register(payload:RegisterPayload) {
    const res = await api.post("/accounts/register/",payload);
    return res.data
    
}
export async function logout(refresh:string) {
    // your LogoutView expects { refresh }
  await api.post("/accounts/logout/", { refresh });
}
export async function deleteAccountRequest(password: string) {
  try {
    const res = await api.delete("/accounts/delete-account/", {
      data: { password },
    });
    return res.data; 
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      throw error; 
    }
    throw error;
  }
}

export async function getMe(){
    const res = await api.get("/accounts/me/");
    return res.data
}
// ✅ NEW: update profile
export async function updateProfile(payload: { first_name?: string; last_name?: string }) {
    const res = await api.put("/accounts/me/", payload);
    return res.data; // updated user
  }



export async function changePassword(
  payload: ChangePasswordPayload
): Promise<any> {
  try {
    const res = await api.post("/accounts/change-password/", payload);
    return res.data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      // Throw the raw DRF error body so the caller can inspect fields
      const data = error.response.data as ChangePasswordErrorResponse;
      throw data;
    }

    // Fallback for network or unexpected errors
    const fallback: ChangePasswordErrorResponse = {
      detail: "Network error. Please try again.",
    };
    throw fallback;
  }
}
