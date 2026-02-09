"use client";

import type { Review } from "@/lib/api/reviews";
import { useLang } from "@/components/LangProvider";
import ReviewItem from "./ReviewItem";

const i18n = {
  fr: { empty: "Aucun avis pour le moment." },
  ar: { empty: "لا توجد تقييمات حالياً." },
} as const;

export default function ReviewsList(props: {
  reviews: Review[];
  currentUserId: number | null;
  isAdmin: boolean;
  onUpdate: (reviewId: number, payload: { rating?: number; comment?: string | null }) => Promise<void> | void;
  onDelete: (reviewId: number) => Promise<void> | void;
}) {
  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;

  if (!props.reviews || props.reviews.length === 0) {
    return (
      <div className="rounded-xl border p-4 text-sm text-gray-600">
        {t.empty}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {props.reviews.map((r) => (
        <ReviewItem
          key={r.id}
          review={r}
          canEdit={props.currentUserId != null && r.reviewer_id === props.currentUserId}
          canDelete={props.isAdmin || (props.currentUserId != null && r.reviewer_id === props.currentUserId)}
          onUpdate={props.onUpdate}
          onDelete={props.onDelete}
        />
      ))}
    </div>
  );
}
