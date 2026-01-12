import { api } from "@/lib/api";

// Forme minimale d'un user d'après ton model
export type AdminUser = {
  id: number;
  name: string | null;
  email: string;
  phone?: string | null;
  role?: "admin" | "worker" | "user" | string | null;
  profile_photo?: string | null;
  created_at?: string;
  // champs sociaux éventuels...
};

export async function fetchUsers(): Promise<AdminUser[]> {
  const res = await api.get("/users");
  // ton backend renvoie un tableau directement
  return Array.isArray(res.data) ? res.data : (res.data?.rows ?? []);
}

export async function fetchUser(id: number): Promise<AdminUser> {
  const res = await api.get(`/users/${id}`);
  return res.data;
}

export async function updateUser(id: number, payload: Partial<AdminUser>): Promise<AdminUser> {
  const res = await api.put(`/users/${id}`, payload);
  return res.data;
}

export async function deleteUser(id: number): Promise<{ msg?: string } | AdminUser> {
  const res = await api.delete(`/users/${id}`);
  return res.data;
}

// Relations (si présentes côté backend — sinon, on gère l'absence)
export async function fetchUserWorkerProfiles(id: number): Promise<any[]> {
  try {
    const res = await api.get(`/users/${id}/worker-profiles`);
    return Array.isArray(res.data) ? res.data : (res.data?.rows ?? []);
  } catch {
    return [];
  }
}
export async function fetchUserAds(id: number): Promise<any[]> {
  try {
    const res = await api.get(`/users/${id}/ads`);
    return Array.isArray(res.data) ? res.data : (res.data?.rows ?? []);
  } catch {
    return [];
  }
}
