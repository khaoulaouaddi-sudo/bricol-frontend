// lib/api/reviews.ts
import { api } from "@/lib/api";

export type ReviewTargetType = "worker" | "company";

export type Review = {
  id: number;
  reviewer_id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  reviewer_name?: string | null;

  target_worker_profile_id?: number | null;
  target_company_profile_id?: number | null;
};

export type MineResponse = { review: Review | null };

function targetPath(type: ReviewTargetType) {
  return type === "worker" ? "worker" : "company";
}

export async function listReviews(type: ReviewTargetType, profileId: number) {
  const { data } = await api.get<Review[]>(
    `/reviews/${targetPath(type)}/${profileId}`
  );
  return data;
}

export async function getMyReview(type: ReviewTargetType, profileId: number) {
  const { data } = await api.get<MineResponse>(
    `/reviews/${targetPath(type)}/${profileId}/mine`
  );
  return data.review;
}

export async function createReview(
  type: ReviewTargetType,
  profileId: number,
  payload: { rating: number; comment?: string }
) {
  const { data } = await api.post<Review>(
    `/reviews/${targetPath(type)}/${profileId}`,
    payload
  );
  return data;
}

export async function updateReview(
  reviewId: number,
  payload: { rating?: number; comment?: string | null }
) {
  const { data } = await api.put<Review>(`/reviews/${reviewId}`, payload);
  return data;
}

export async function deleteReview(reviewId: number) {
  const { data } = await api.delete<{ msg: string }>(`/reviews/${reviewId}`);
  return data;
}
