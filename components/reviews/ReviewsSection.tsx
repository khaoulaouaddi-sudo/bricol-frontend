"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLang } from "@/components/LangProvider";
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

const i18n = {
  fr: {
    error: "Erreur",
    invalidProfileId: "ID profil invalide",
    mustLoginToReview: "Vous devez être connecté pour laisser un avis.",
    title: "Avis",
    loading: "Chargement…",
    ownerHint: "Voici les avis reçus sur votre profil.",
    publicHint: "Les avis sont affichés immédiatement. Un seul avis par utilisateur.",
  },
  ar: {
    error: "خطأ",
    invalidProfileId: "معرّف الملف غير صالح",
    mustLoginToReview: "يجب تسجيل الدخول لترك تقييم.",
    title: "التقييمات",
    loading: "جار التحميل…",
    ownerHint: "هذه هي التقييمات التي تلقاها ملفك.",
    publicHint: "تظهر التقييمات فورًا. تقييم واحد فقط لكل مستخدم.",
  },
} as const;

function toInt(id: string | string[] | undefined) {
  const s = Array.isArray(id) ? id[0] : id;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function extractMsg(err: any, fallback: string) {
  return (
    err?.response?.data?.msg ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

export default function ReviewsSection(props: {
  targetType: ReviewTargetType;
  targetProfileId: number | string;
  mode?: "public" | "owner"; // "owner" = lecture seule (pas de MyReviewPanel)
}) {
  const { user, loading: authLoading } = useAuth();
  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;

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

  const replaceInList = (id: number, next: Review) => {
    setList((prev) => prev.map((r) => (r.id === id ? next : r)));
  };

  const removeFromList = (id: number) => {
    setList((prev) => prev.filter((r) => r.id !== id));
  };

  const addOnTop = (r: Review) => {
    setList((prev) => [r, ...prev]);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!Number.isFinite(profileId)) {
        setError(t.invalidProfileId);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
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
        setError(extractMsg(e, t.error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (!authLoading) load();

    return () => {
      cancelled = true;
    };
  }, [props.targetType, profileId, user, authLoading, isOwnerMode, t.invalidProfileId, t.error]);

  async function onCreate(payload: { rating: number; comment?: string }) {
    if (!user) {
      setError(t.mustLoginToReview);
      return;
    }

    setError(null);

    const tempId = -Date.now();
    const nowIso = new Date().toISOString();

    const optimistic: Review = {
      id: tempId,
      reviewer_id: user.id,
      rating: payload.rating,
      comment: payload.comment ?? null,
      created_at: nowIso,
      updated_at: nowIso,
      reviewer_name: user.name ?? (lang === "ar" ? "أنا" : "Moi"),
      target_worker_profile_id: props.targetType === "worker" ? profileId : null,
      target_company_profile_id: props.targetType === "company" ? profileId : null,
    };

    addOnTop(optimistic);
    setMyReview(optimistic);

    try {
      const created = await createReview(props.targetType, profileId, payload);

      const createdEnriched: Review = {
        ...created,
        reviewer_name: user.name ?? (lang === "ar" ? "أنا" : "Moi"),
      };

      setList((prev) => prev.map((r) => (r.id === tempId ? createdEnriched : r)));
      setMyReview(createdEnriched);
    } catch (e: any) {
      setList((prev) => prev.filter((r) => r.id !== tempId));
      setMyReview(null);
      setError(extractMsg(e, t.error));
    }
  }

  async function onUpdate(
    reviewId: number,
    payload: { rating?: number; comment?: string | null }
  ) {
    setError(null);

    const prevMy = myReview;
    const prevItem = list.find((r) => r.id === reviewId);

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
      if (prevItem) replaceInList(reviewId, prevItem);
      setMyReview(prevMy ?? null);
      setError(extractMsg(e, t.error));
    }
  }

  async function onDelete(reviewId: number) {
    setError(null);

    const prevList = list;
    const prevMy = myReview;

    removeFromList(reviewId);
    if (myReview?.id === reviewId) setMyReview(null);

    try {
      await deleteReview(reviewId);
    } catch (e: any) {
      setList(prevList);
      setMyReview(prevMy);
      setError(extractMsg(e, t.error));
    }
  }

  if (loading) {
    return (
      <section className="mt-6 sm:mt-8 rounded-xl border bg-white p-3 sm:p-4">
        <div className="font-semibold">{t.title}</div>
        <div className="mt-2 text-sm text-gray-600">{t.loading}</div>
      </section>
    );
  }

  return (
    <section className="mt-6 sm:mt-8 rounded-xl border bg-white p-3 sm:p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t.title}</h2>
          <p className="text-sm text-gray-600">
            {isOwnerMode ? t.ownerHint : t.publicHint}
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
