"use client";

import { useState } from "react";

export default function ReviewForm(props: {
  mode: "create" | "edit";
  initialRating: number;
  initialComment: string;
  onSubmit: (payload: { rating: number; comment?: string }) => Promise<void> | void;
}) {
  const [rating, setRating] = useState<number>(props.initialRating);
  const [comment, setComment] = useState<string>(props.initialComment ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await props.onSubmit({
            rating,
            comment: comment.trim() ? comment.trim() : undefined,
          });
        } finally {
          setSaving(false);
        }
      }}
    >
      <div>
        <label className="text-sm font-medium">Note</label>
        <div className="mt-2 flex items-center gap-2">
          <select
            className="rounded-lg border px-3 py-2"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} / 5
              </option>
            ))}
          </select>
          <div className="text-sm text-gray-600">
            {props.mode === "create" ? "Nouvel avis" : "Modification"}
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Commentaire (optionnel)</label>
        <textarea
          className="mt-2 w-full rounded-lg border p-3 text-sm"
          rows={3}
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Décrivez votre expérience…"
        />
        <div className="mt-1 text-xs text-gray-500">{comment.length}/500</div>
      </div>

      <button
        className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        type="submit"
        disabled={saving}
      >
        {saving ? "Enregistrement…" : props.mode === "create" ? "Publier" : "Mettre à jour"}
      </button>
    </form>
  );
}
