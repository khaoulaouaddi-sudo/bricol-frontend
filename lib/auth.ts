import api from "./api";
import { setAccessToken } from "./tokenStore";

export type User = { id: number; name: string; email?: string; role: string };

export async function login(email: string, password: string) {
  const { data } = await api.post("/auth/login", { email, password });
  const access = data?.access_token || null;
  setAccessToken(access);
  return { user: data?.user as User | undefined, access };
}

export async function register(name: string, email: string, password: string) {
  const { data } = await api.post("/auth/register", { name, email, password });
  return data?.user as User;
}

export async function logout() {
  try { await api.post("/auth/logout"); } finally { setAccessToken(null); }
}

export async function tryBootstrapSession() {
  try {
    const { data } = await api.post("/auth/refresh", {});
    const access = data?.access_token || null;
    setAccessToken(access);
    return !!access;
  } catch {
    setAccessToken(null);
    return false;
  }
}
