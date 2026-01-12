// lib/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

/**
 * Base URL:
 * - Client: NEXT_PUBLIC_API_URL (obligatoire côté browser)
 * - On tolère aussi NEXT_PUBLIC_API_BASE_URL pour compat rétro (si tu l’as déjà utilisé)
 */
const baseURL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:4000";

const api = axios.create({
  baseURL,
  withCredentials: true, // cookie httpOnly refresh
});

// Request: ajoute Authorization si access_token présent (browser seulement)
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("accessToken");
    if (t) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${t}`;
    }
  }
  return config;
});

// Response: 401 => tente /auth/refresh puis rejoue 1 fois
let refreshing = false;
let queue: Array<(t: string) => void> = [];

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as any;

    if (err.response?.status === 401 && !original?._retry) {
      original._retry = true;

      if (!refreshing) {
        refreshing = true;
        try {
          const { data } = await api.post("/auth/refresh");
          const newAccess = (data as any).access_token;

          if (newAccess) {
            localStorage.setItem("accessToken", newAccess);
            queue.forEach((fn) => fn(newAccess));
            queue = [];
            return api(original);
          }
        } catch {
          localStorage.removeItem("accessToken");
        } finally {
          refreshing = false;
        }
      }

      return new Promise((resolve) => {
        queue.push((token: string) => {
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${token}`;
          resolve(api(original));
        });
      });
    }

    return Promise.reject(err);
  }
);

// ✅ export des 2 formes pour compatibilité globale du projet
export { api };
export default api;
