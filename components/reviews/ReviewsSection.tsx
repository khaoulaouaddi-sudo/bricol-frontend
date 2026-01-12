"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { Review, ReviewTargetType } from "@/lib/api/reviews";
import {
  createReview,
  deleteReview,
  getMyReview,
  listReviews,
  updateReview,
} from "@/lib/api/reviews";

import ReviewsSummary from "./ReviewsSummary";
import MyReviewPanel from "./MyReviewPanel";
import ReviewsList from "./ReviewsList";

function toInt(id: string | string[] | undefined) {
  const s = Array.isArray(id) ? id[0] : id;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function extractMsg(err: any) {
  return (
    err?.response?.data?.msg ||
    err?.response?.data?.error ||
    err?.message ||
    "Erreur"
  );
}

export default function ReviewsSection(props: {
  targetType: ReviewTargetType;
  targetProfileId: number | string;
  mode?: "public" | "owner"; // ✅ NEW: "owner" = lecture seule (pas de MyReviewPanel)
}) {
  const { user, loading: authLoading } = useAuth();

  const mode = props.mode ?? "public";
  const isOwnerMode = mode === "owner";

  const profileId = useMemo(() => {
    if (typeof props.targetProfileId === "number") return props.targetProfileId;
    return toInt(props.targetProfileId);
  }, [props.targetProfileId]);

  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  // helper: replace one review in list
  const replaceInList = (id: number, next: Review) => {
    setList((prev) => prev.map((r) => (r.id === id ? next : r)));
  };

  // helper: remove from list
  const removeFromList = (id: number) => {
    setList((prev) => prev.filter((r) => r.id !== id));
  };

  // helper: add on top (newest first)
  const addOnTop = (r: Review) => {
    setList((prev) => [r, ...prev]);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!Number.isFinite(profileId)) {
        setError("ID profil invalide");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // ✅ En mode owner: pas besoin d’appeler /mine
        const [all, mine] = await Promise.all([
          listReviews(props.targetType, profileId),
          !isOwnerMode && user
            ? getMyReview(props.targetType, profileId)
            : Promise.resolve(null),
        ]);

        if (cancelled) return;

        setList(Array.isArray(all) ? all : []);
        setMyReview(mine);
      } catch (e: any) {
        if (cancelled) return;
        setError(extractMsg(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // attendre la fin du chargement auth pour savoir si on doit appeler /mine
    if (!authLoading) load();

    return () => {
      cancelled = true;
    };
  }, [props.targetType, profileId, user, authLoading, isOwnerMode]);

  async function onCreate(payload: { rating: number; comment?: string }) {
    if (!user) {
      setError("Vous devez être connecté pour laisser un avis.");
      return;
    }

    setError(null);

    // optimistic item
    const tempId = -Date.now();
    const nowIso = new Date().toISOString();

    const optimistic: Review = {
      id: tempId,
      reviewer_id: user.id,
      rating: payload.rating,
      comment: payload.comment ?? null,
      created_at: nowIso,
      updated_at: nowIso,
      reviewer_name: user.name ?? "Moi",
      target_worker_profile_id:
        props.targetType === "worker" ? profileId : null,
      target_company_profile_id:
        props.targetType === "company" ? profileId : null,
    };

    addOnTop(optimistic);
    setMyReview(optimistic);

    try {
      const created = await createReview(props.targetType, profileId, payload);

      // enrich for UI: reviewer_name not returned by backend on create
      const createdEnriched: Review = {
        ...created,
        reviewer_name: user.name ?? "Moi",
      };

      // replace temp in list
      setList((prev) =>
        prev.map((r) => (r.id === tempId ? createdEnriched : r))
      );
      setMyReview(createdEnriched);
    } catch (e: any) {
      // rollback
      setList((prev) => prev.filter((r) => r.id !== tempId));
      setMyReview(null);
      setError(extractMsg(e));
    }
  }

  async function onUpdate(
    reviewId: number,
    payload: { rating?: number; comment?: string | null }
  ) {
    setError(null);

    const prevMy = myReview;
    const prevItem = list.find((r) => r.id === reviewId);

    // optimistic update
    if (prevItem) {
      const next: Review = {
        ...prevItem,
        rating: payload.rating ?? prevItem.rating,
        comment: payload.comment ?? prevItem.comment,
        updated_at: new Date().toISOString(),
      };
      replaceInList(reviewId, next);
      if (myReview?.id === reviewId) setMyReview(next);
    }

    try {
      const updated = await updateReview(reviewId, payload);
      const updatedEnriched: Review = {
        ...updated,
        reviewer_name: prevItem?.reviewer_name ?? myReview?.reviewer_name,
      };
      replaceInList(reviewId, updatedEnriched);
      if (myReview?.id === reviewId) setMyReview(updatedEnriched);
    } catch (e: any) {
      // rollback
      if (prevItem) replaceInList(reviewId, prevItem);
      setMyReview(prevMy ?? null);
      setError(extractMsg(e));
    }
  }

  async function onDelete(reviewId: number) {
    setError(null);

    const prevList = list;
    const prevMy = myReview;

    // optimistic delete
    removeFromList(reviewId);
    if (myReview?.id === reviewId) setMyReview(null);

    try {
      await deleteReview(reviewId);
    } catch (e: any) {
      // rollback
      setList(prevList);
      setMyReview(prevMy);
      setError(extractMsg(e));
    }
  }

  if (loading) {
    return (
      <section className="mt-8 rounded-xl border p-4">
        <div className="font-semibold">Avis</div>
        <div className="mt-2 text-sm text-gray-600">Chargement…</div>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-xl border p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Avis</h2>
          <p className="text-sm text-gray-600">
            {isOwnerMode
              ? "Voici les avis reçus sur votre profil."
              : "Les avis sont affichés immédiatement. Un seul avis par utilisateur."}
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4">
        <ReviewsSummary reviews={list} />
      </div>

      {/* ✅ En mode owner: lecture seule => on cache le panneau "Votre avis" */}
      {!isOwnerMode && (
        <div className="mt-6">
          <MyReviewPanel
            user={user}
            myReview={myReview}
            onCreate={onCreate}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </div>
      )}

      <div className={!isOwnerMode ? "mt-6" : "mt-4"}>
        <ReviewsList
          reviews={list}
          currentUserId={user?.id ?? null}
          isAdmin={isAdmin}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      </div>
    </section>
  );
}
