import { api } from "../lib/api";
import { LoginPayload,RegisterPayload,TokenPair } from "./types";

export async function login(payload:LoginPayload):Promise<TokenPair> {
    const res = await api.post("/login/",payload) // your MyTokenObtainPairView route (often /api/token/)
    return res.data;
}
export async function register(payload:RegisterPayload) {
    const res = await api.post("/accounts/register/",payload);
    console.log(res.data)
    return res.data
    
}
export async function logout(refresh:string) {
    // your LogoutView expects { refresh }
  await api.post("/logout/", { refresh });
}