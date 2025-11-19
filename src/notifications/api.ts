import { api } from "../lib/api"

export async function sendTestPush() {
    const res = await api.post("/push/test/");
    return res.data;
}
