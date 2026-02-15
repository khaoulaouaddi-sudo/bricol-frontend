"use client";

import { useMemo, useState } from "react";
import type { Review } from "@/lib/api/reviews";
import { useLang } from "@/components/LangProvider";
import ReviewForm from "./ReviewForm";

const i18n = {
  fr: {
    userFallback: (id: number) => `User #${id}`,
    noComment: "(Sans commentaire)",
    cancel: "Annuler",
    edit: "Modifier",
    delete: "Supprimer",
    confirmDelete: "Supprimer cet avis ?",
    readMore: "Lire plus",
    readLess: "Réduire",
  },
  ar: {
    userFallback: (id: number) => `مستخدم #${id}`,
    noComment: "(بدون تعليق)",
    cancel: "إلغاء",
    edit: "تعديل",
    delete: "حذف",
    confirmDelete: "هل تريد حذف هذا التقييم؟",
    readMore: "قراءة المزيد",
    readLess: "عرض أقل",
  },
} as const;

function fmtDate(iso: string, lang: "fr" | "ar") {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === "ar" ? "ar-MA" : "fr-FR");
}

function Stars({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < n ? "text-yellow-500" : "text-gray-300"} aria-hidden="true">
          ★
        </span>
      ))}
    </div>
  );
}

export default function ReviewItem(props: {
  review: Review;
  canEdit: boolean;
  canDelete: boolean;
  onUpdate: (reviewId: number, payload: { rating?: number; comment?: string | null }) => Promise<void> | void;
  onDelete: (reviewId: number) => Promise<void> | void;
}) {
  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;

  const r = props.review;
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const rating = useMemo(() => Math.max(0, Math.min(5, Math.round(Number(r.rating) || 0))), [r.rating]);
  const hasComment = Boolean(r.comment?.trim());

  return (
    <div className="rounded-xl border bg-white p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <div className="font-semibold">
              {r.reviewer_name ?? t.userFallback(r.reviewer_id)}
            </div>
            <div className="flex items-center gap-2">
              <Stars n={rating} />
              <div className="text-xs text-gray-500">{fmtDate(r.created_at, lang)}</div>
            </div>
          </div>

          {!editing && (
            <div className="mt-2">
              {hasComment ? (
                <>
                  <p
                    className={
                      "whitespace-pre-wrap text-sm text-gray-700 " +
                      (expanded ? "" : "line-clamp-4 sm:line-clamp-none")
                    }
                  >
                    {r.comment}
                  </p>
                  {/* Lire plus : uniquement utile sur mobile */}
                  <button
                    type="button"
                    className="mt-1 text-sm font-medium text-gray-900 underline underline-offset-4 sm:hidden"
                    onClick={() => setExpanded((v) => !v)}
                  >
                    {expanded ? t.readLess : t.readMore}
                  </button>
                </>
              ) : (
                <p className="text-sm text-gray-400">{t.noComment}</p>
              )}
            </div>
          )}
        </div>

        {(props.canEdit || props.canDelete) && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            {props.canEdit && (
              <button
                className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 sm:w-auto"
                type="button"
                onClick={() => setEditing((v) => !v)}
              >
                {editing ? t.cancel : t.edit}
              </button>
            )}

            {props.canDelete && (
              <button
                className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 sm:w-auto"
                type="button"
                onClick={() => {
                  if (window.confirm(t.confirmDelete)) props.onDelete(r.id);
                }}
              >
                {t.delete}
              </button>
            )}
          </div>
        )}
      </div>

      {editing && props.canEdit && (
        <div className="mt-4 rounded-lg bg-gray-50 p-3">
          <ReviewForm
            mode="edit"
            initialRating={r.rating}
            initialComment={r.comment ?? ""}
            onSubmit={async (payload) => {
              await props.onUpdate(r.id, {
                rating: payload.rating,
                comment: payload.comment ?? null,
              });
              setEditing(false);
              setExpanded(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
