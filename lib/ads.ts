// lib/ads.ts
import api from "./api";

export type Ad = {
  id: number;
  user_id?: number;
  title: string;
  description?: string | null;
  price?: number | null;
  type?: "service" | "product" | null;
  location?: string | null;
  image_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

// Liste générale (GET /ads)
export async function listAds(opts?: {
  page?: number;
  limit?: number;
  type?: "service" | "product";
  sort_by?: "created_at" | "price" | "title";
  sort_dir?: "asc" | "desc";
}): Promise<Ad[]> {
  const params = {
    page: opts?.page ?? 1,
    limit: opts?.limit ?? 10,
    type: opts?.type,
    sort_by: opts?.sort_by ?? "created_at",
    sort_dir: opts?.sort_dir ?? "desc",
  };
  const { data } = await api.get("/ads", { params });
  // Ton contrôleur renvoie directement un tableau
  return Array.isArray(data) ? (data as Ad[]) : [];
}

// Recherche (GET /ads/search)
export async function searchAds(opts: {
  q: string;
  page?: number;
  limit?: number;
  type?: "service" | "product";
  sort_by?: "created_at" | "price" | "title";
  sort_dir?: "asc" | "desc";
}): Promise<Ad[]> {
  const params = {
    q: opts.q,
    page: opts.page ?? 1,
    limit: opts.limit ?? 10,
    type: opts.type,
    sort_by: opts.sort_by ?? "created_at",
    sort_dir: opts.sort_dir ?? "desc",
  };
  const { data } = await api.get("/ads/search", { params });
  return Array.isArray(data) ? (data as Ad[]) : [];
}

// Liste par utilisateur (GET /ads/user/:userId)
export async function listAdsByUser(userId: number, opts?: {
  page?: number;
  limit?: number;
  type?: "service" | "product";
  sort_by?: "created_at" | "price" | "title";
  sort_dir?: "asc" | "desc";
}): Promise<Ad[]> {
  const params = {
    page: opts?.page ?? 1,
    limit: opts?.limit ?? 10,
    type: opts?.type,
    sort_by: opts?.sort_by ?? "created_at",
    sort_dir: opts?.sort_dir ?? "desc",
  };
  const { data } = await api.get(`/ads/user/${userId}`, { params });
  return Array.isArray(data) ? (data as Ad[]) : [];
}

// Détail (GET /ads/:id)
export async function getAd(id: number): Promise<Ad | null> {
  const { data } = await api.get(`/ads/${id}`);
  return (data as Ad) ?? null;
}
