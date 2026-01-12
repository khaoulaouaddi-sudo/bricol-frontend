"use client";

import { useState } from "react";
import type { Review } from "@/lib/api/reviews";
import ReviewForm from "./ReviewForm";

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

function Stars({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < n ? "text-yellow-500" : "text-gray-300"}>
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
  const r = props.review;
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-semibold">{r.reviewer_name ?? `User #${r.reviewer_id}`}</div>
            <Stars n={Number(r.rating) || 0} />
            <div className="text-xs text-gray-500">{fmtDate(r.created_at)}</div>
          </div>
          {!editing && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
              {r.comment?.trim() ? r.comment : <span className="text-gray-400">(Sans commentaire)</span>}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {props.canEdit && (
            <button
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              type="button"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? "Annuler" : "Modifier"}
            </button>
          )}
          {props.canDelete && (
            <button
              className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
              type="button"
              onClick={() => props.onDelete(r.id)}
            >
              Supprimer
            </button>
          )}
        </div>
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
            }}
          />
        </div>
      )}
    </div>
  );
}
