import * as SecureStore from "expo-secure-store"

const ACCESS_KEY = "access_token";
const REFRESH_TOKEN = "refresh_token";

// tiny in-memory cache to avoid async read on every request
let memory = { access: "", refresh: "" };

export async function saveTokens(acces: string,refresh:string){
    memory.access = acces;
    memory.refresh = refresh;
    await SecureStore.setItemAsync(ACCESS_KEY,acces);
    await SecureStore.setItemAsync(REFRESH_TOKEN,refresh);
}

export async function loadTokens(){
    if(!memory.access){
        memory.access =(await SecureStore.getItemAsync(ACCESS_KEY))||"";
        memory.refresh = (await SecureStore.getItemAsync(REFRESH_TOKEN))||"";
    }
    return {access: memory.access, refresh: memory.refresh}
}

export async function clearTokens(){
    memory = {access:"",refresh:""};
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN);
}
