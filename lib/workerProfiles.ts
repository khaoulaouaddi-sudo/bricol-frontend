// lib/workerProfiles.ts
import api from "./api";
import { getMe } from "./users";

export type WorkerProfile = {
  id: number;
  user_id: number;
  title: string;
  description?: string | null;
  skills?: string | null;
  experience?: string | null;
  location?: string | null;
  available?: boolean | null;
  verification_status?: "verifie" | "non_verifie" | "verifie_partiellement";
  trust_badge?: boolean | null;
  created_at?: string;
  updated_at?: string;
};

export async function createWorkerProfile(input: Omit<WorkerProfile, "id"|"user_id"|"created_at"|"updated_at"|"verification_status"|"trust_badge">) {
  const me = await getMe(); // récupère l'utilisateur courant
  const body = { ...input, user_id: me.id }; // owner = utilisateur connecté
  const { data } = await api.post("/worker-profiles", body);
  // backend renvoie soit l'objet direct, soit { profile: {...} }
  const profile = (data?.profile ?? data) as WorkerProfile;
  return profile;
}

export async function getWorkerProfile(id: number) {
  const { data } = await api.get(`/worker-profiles/${id}`);
  return (data?.profile ?? data) as WorkerProfile;
}
