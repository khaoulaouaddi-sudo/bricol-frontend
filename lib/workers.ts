import { api } from "./api";

export type WorkerDetail = {
  id: number;
  user_id: number;
  title: string | null;
  description: string | null;
  skills: string | null;
  experience: string | null;
  location: string | null;
  available: boolean | null;
  verification_status: string | null;
  trust_badge: boolean | null;
  city_id: number | null;
  sector_id: number | null;
  created_at?: string;
  updated_at?: string;
  user_name?: string | null;
  user_photo?: string | null;
};

export type WorkerPhoto = {
  id: number;
  profile_id: number;
  url: string;
  created_at?: string;
};

export type WorkerReview = {
  id: number;
  target_user_id: number;
  reviewer_id: number | null;
  rating: number | null;
  comment: string | null;
  created_at?: string;
  reviewer_name?: string | null;
};

export async function fetchWorkerDetail(id: number): Promise<WorkerDetail> {
  const res = await api.get(`/worker-profiles/${id}`);
  return res.data as WorkerDetail;
}

export async function fetchWorkerPhotos(id: number): Promise<WorkerPhoto[]> {
  const res = await api.get(`/worker-profiles/${id}/photos`);
  return Array.isArray(res.data) ? res.data : (res.data?.rows ?? []);
}

export async function fetchWorkerReviews(id: number): Promise<WorkerReview[]> {
  const res = await api.get(`/worker-profiles/${id}/reviews`);
  return Array.isArray(res.data) ? res.data : (res.data?.rows ?? []);
}
