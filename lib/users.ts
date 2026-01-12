// lib/users.ts
import api from "./api";

export type User = {
  id: number;
  name: string;
  email?: string;
  role: "admin" | "worker" | "company";
  is_active?: boolean | null;
  created_at?: string;
};

export type Me = User;

export async function getMe(): Promise<Me> {
  const { data } = await api.get("/users/me");
  return data as Me;
}

type ListParams = {
  search?: string;
  role?: "admin" | "worker" | "company";
  page?: number;
  limit?: number;
};

export type UsersList = {
  items: User[];
  total: number;
  page: number;
  limit: number;
};

// essaie d'abord /users avec params; si la réponse est un tableau, on pagine côté front
export async function listUsers(params: ListParams = {}): Promise<UsersList> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;

  try {
    const { data } = await api.get("/users", {
      params: {
        search: params.search || undefined,
        role: params.role || undefined,
        page,
        limit,
      },
    });
    if (Array.isArray(data)) {
      // fallback pagination locale
      const filtered = data
        .filter((u: any) =>
          !params.search
            ? true
            : ((u.name || "").toLowerCase().includes(params.search!.toLowerCase()) ||
               (u.email || "").toLowerCase().includes(params.search!.toLowerCase()))
        )
        .filter((u: any) => (!params.role ? true : u.role === params.role));
      const total = filtered.length;
      const start = (page - 1) * limit;
      const items = filtered.slice(start, start + limit);
      return { items, total, page, limit };
    }
    // format { items, total, page, limit } (ou proche)
    const items =
      Array.isArray(data?.items) ? data.items :
      Array.isArray(data?.data) ? data.data :
      Array.isArray(data?.results) ? data.results :
      [];
    const total = typeof data?.total === "number" ? data.total : items.length;
    return { items, total, page, limit };
  } catch (e) {
    // dernier fallback: GET /users sans params (certaines implémentations rejettent les params inconnus)
    const { data } = await api.get("/users");
    const arr: User[] = Array.isArray(data) ? data : [];
    const filtered = arr
      .filter((u) =>
        !params.search
          ? true
          : ((u.name || "").toLowerCase().includes((params.search || "").toLowerCase()) ||
             (u.email || "").toLowerCase().includes((params.search || "").toLowerCase()))
      )
      .filter((u) => (!params.role ? true : u.role === params.role));
    const total = filtered.length;
    const start = (page - 1) * limit;
    const items = filtered.slice(start, start + limit);
    return { items, total, page, limit };
  }
}

export async function getUser(id: number): Promise<User> {
  const { data } = await api.get(`/users/${id}`);
  return data as User;
}

export async function updateUser(id: number, patch: Partial<Pick<User, "role" | "is_active" | "name" | "email">>) {
  // n'envoie que les clés définies
  const body: any = {};
  for (const k of Object.keys(patch) as (keyof typeof patch)[]) {
    if (typeof patch[k] !== "undefined") body[k] = patch[k];
  }
  const { data } = await api.put(`/users/${id}`, body);
  return data as User;
}

// Profils liés à un user
export type WorkerProfile = {
  id: number;
  user_id: number;
  title: string;
  description?: string | null;
  skills?: string | null;
  experience?: string | null;
  location?: string | null;
  available?: boolean | null;
  verification_status?: "verifie" | "non_verifie" | "verifie_partiellement" | null;
  trust_badge?: boolean | null;
};

export type CompanyProfile = {
  id: number;
  user_id: number;
  name: string;
  description?: string | null;
  sector_main?: string | null;
  location?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
};

export async function getUserProfiles(userId: number): Promise<{
  workers: WorkerProfile[];
  companies: CompanyProfile[];
}> {
  // endpoint prévu dans ton projet: /users/:id/profiles
  const { data } = await api.get(`/users/${userId}/profiles`);
  const workers =
    Array.isArray(data?.worker_profiles) ? data.worker_profiles :
    Array.isArray(data?.workers) ? data.workers : [];
  const companies =
    Array.isArray(data?.company_profiles) ? data.company_profiles :
    Array.isArray(data?.companies) ? data.companies : [];
  return { workers, companies };
}

// Admin : MAJ champs de vérification/Badge (worker profile)
export async function adminUpdateWorkerProfile(profileId: number, patch: Partial<Pick<WorkerProfile, "verification_status" | "trust_badge">>) {
  const body: any = {};
  if (typeof patch.verification_status !== "undefined") body.verification_status = patch.verification_status;
  if (typeof patch.trust_badge !== "undefined") body.trust_badge = patch.trust_badge;
  const { data } = await api.put(`/worker-profiles/${profileId}`, body);
  return data;
}
