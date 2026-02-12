// lib/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getLang } from "@/lib/lang";

/**
 * Base URL:
 * - Client: NEXT_PUBLIC_API_URL (obligatoire côté browser)
 * - fallback: NEXT_PUBLIC_API_BASE_URL (compat)
 */
const baseURL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:4000";

const api = axios.create({
  baseURL,
  withCredentials: true, // cookie httpOnly refresh
});

// Request: ajoute Authorization + lang + x-bricol-lang si browser
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    // Authorization
    const t = localStorage.getItem("accessToken");
    if (t) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${t}`;
    }

    // ✅ Lang automatique (toutes méthodes) + header pour compat backend
    const lang = getLang(); // "fr" | "ar"

    config.headers = config.headers || {};
    // ne pas écraser si déjà mis explicitement
    if (
      (config.headers as any)["x-bricol-lang"] == null &&
      (config.headers as any)["X-Bricol-Lang"] == null
    ) {
      (config.headers as any)["x-bricol-lang"] = lang;
    }

    // query param ?lang=... si absent
    config.params = { ...(config.params || {}) };
    if ((config.params as any).lang == null) {
      (config.params as any).lang = lang;
    }
  }

  return config;
});

// Response: 401 => tente /auth/refresh puis rejoue 1 fois
let refreshing = false;
type Queued = { original: any; resolve: (v: any) => void; reject: (e: any) => void };
let queue: Queued[] = [];

function flushQueueWithToken(token: string) {
  const pending = queue;
  queue = [];
  pending.forEach(({ original, resolve }) => {
    original.headers = original.headers || {};
    original.headers.Authorization = `Bearer ${token}`;
    resolve(api(original));
  });
}

function flushQueueWithError(e: any) {
  const pending = queue;
  queue = [];
  pending.forEach(({ reject }) => reject(e));
}

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = (err.config || {}) as any;
    const status = err.response?.status;

    // Ne jamais boucler sur refresh/logout
    const url = String(original?.url || "");
    if (url.includes("/auth/refresh") || url.includes("/auth/logout")) {
      return Promise.reject(err);
    }

   const msg = (err.response?.data as any)?.msg;

if (
  (status === 401 || (status === 403 && msg === "Token invalide")) &&
  !original?._retry
) {
      original._retry = true;

      // Si un refresh est déjà en cours, on met en file d'attente
      if (refreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ original, resolve, reject });
        });
      }

      refreshing = true;

      try {
        const { data } = await api.post("/auth/refresh");
        const newAccess = (data as any)?.access_token;

        if (!newAccess) {
          throw new Error("Refresh returned no access_token");
        }

        localStorage.setItem("accessToken", newAccess);
        flushQueueWithToken(newAccess);

        // rejoue la requête initiale
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (e) {
        localStorage.removeItem("accessToken");
        flushQueueWithError(e);

        // Notifier l'app pour déclencher un vrai logout UI
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth-updated"));
        }

        return Promise.reject(err);
      } finally {
        refreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export { api };
export default api;
