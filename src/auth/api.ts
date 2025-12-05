import { api } from "../lib/api";
import { LoginPayload,RegisterPayload,TokenPair, User } from "./types";

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

export async function getMe(){
    const res = await api.get("/accounts/me/");
    return res.data
}
// ✅ NEW: update profile
export async function updateProfile(payload: { first_name?: string; last_name?: string }) {
    const res = await api.put("/accounts/me/", payload);
    return res.data; // updated user
  }

  export async function changePassword(payload: {
    current_password: string;
    new_password: string;
  }) {
    const res = await api.post("/accounts/change-password/", payload);
    return res.data;
  }
  