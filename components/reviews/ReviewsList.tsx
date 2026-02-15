"use client";

import { useMemo, useState } from "react";
import type { Review } from "@/lib/api/reviews";
import { useLang } from "@/components/LangProvider";
import ReviewItem from "./ReviewItem";

const i18n = {
  fr: {
    empty: "Aucun avis pour le moment.",
    sort: "Trier",
    recent: "Plus récents",
    top: "Mieux notés",
    more: "Afficher plus",
    less: "Afficher moins",
  },
  ar: {
    empty: "لا توجد تقييمات حالياً.",
    sort: "الترتيب",
    recent: "الأحدث",
    top: "الأعلى تقييماً",
    more: "عرض المزيد",
    less: "عرض أقل",
  },
} as const;

type SortKey = "recent" | "top";

function toTime(iso: string) {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

export default function ReviewsList(props: {
  reviews: Review[];
  currentUserId: number | null;
  isAdmin: boolean;
  onUpdate: (reviewId: number, payload: { rating?: number; comment?: string | null }) => Promise<void> | void;
  onDelete: (reviewId: number) => Promise<void> | void;
}) {
  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;

  const [sort, setSort] = useState<SortKey>("recent");
  const [visible, setVisible] = useState(10);

  const sorted = useMemo(() => {
    const arr = Array.isArray(props.reviews) ? [...props.reviews] : [];
    if (sort === "top") {
      arr.sort((a, b) => {
        const rb = (Number(b.rating) || 0) - (Number(a.rating) || 0);
        if (rb !== 0) return rb;
        return toTime(b.created_at) - toTime(a.created_at);
      });
      return arr;
    }
    // recent
    arr.sort((a, b) => toTime(b.created_at) - toTime(a.created_at));
    return arr;
  }, [props.reviews, sort]);

  if (!sorted || sorted.length === 0) {
    return <div className="rounded-xl border bg-white p-3 sm:p-4 text-sm text-gray-600">{t.empty}</div>;
  }

  const shown = sorted.slice(0, visible);
  const canShowMore = visible < sorted.length;

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-600">
          {t.sort}:
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <button
            type="button"
            className={
              "flex-1 rounded-lg border px-3 py-2 text-sm sm:flex-none " +
              (sort === "recent" ? "bg-gray-50 font-medium" : "hover:bg-gray-50")
            }
            onClick={() => setSort("recent")}
          >
            {t.recent}
          </button>
          <button
            type="button"
            className={
              "flex-1 rounded-lg border px-3 py-2 text-sm sm:flex-none " +
              (sort === "top" ? "bg-gray-50 font-medium" : "hover:bg-gray-50")
            }
            onClick={() => setSort("top")}
          >
            {t.top}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {shown.map((r) => (
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

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        {canShowMore ? (
          <button
            type="button"
            className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 sm:w-auto"
            onClick={() => setVisible((v) => Math.min(v + 10, sorted.length))}
          >
            {t.more}
          </button>
        ) : sorted.length > 10 ? (
          <button
            type="button"
            className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 sm:w-auto"
            onClick={() => setVisible(10)}
          >
            {t.less}
          </button>
        ) : null}
      </div>
    </div>
  );
}
