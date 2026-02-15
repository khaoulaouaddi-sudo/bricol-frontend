"use client";

import { useMemo, useState } from "react";
import { useLang } from "@/components/LangProvider";

const i18n = {
  fr: {
    rating: "Note",
    newReview: "Nouvel avis",
    edit: "Modification",
    comment: "Commentaire (optionnel)",
    placeholder: "Décrivez votre expérience…",
    saving: "Enregistrement…",
    publish: "Publier",
    update: "Mettre à jour",
    ratingAria: (n: number) => `Choisir la note ${n} sur 5`,
  },
  ar: {
    rating: "التقييم",
    newReview: "تقييم جديد",
    edit: "تعديل",
    comment: "تعليق (اختياري)",
    placeholder: "صف تجربتك…",
    saving: "جار الحفظ…",
    publish: "نشر",
    update: "تحديث",
    ratingAria: (n: number) => `اختر تقييم ${n} من 5`,
  },
} as const;

function StarPicker(props: {
  value: number;
  onChange: (n: number) => void;
  aria: (n: number) => string;
}) {
  const { value, onChange, aria } = props;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const active = n <= value;
        return (
          <button
            key={n}
            type="button"
            className="rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-black/20"
            onClick={() => onChange(n)}
            aria-label={aria(n)}
          >
            <span className={active ? "text-yellow-500" : "text-gray-300"} aria-hidden="true">
              ★
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function ReviewForm(props: {
  mode: "create" | "edit";
  initialRating: number;
  initialComment: string;
  onSubmit: (payload: { rating: number; comment?: string }) => Promise<void> | void;
}) {
  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;

  const initial = useMemo(() => {
    const n = Number(props.initialRating) || 5;
    return Math.max(1, Math.min(5, Math.round(n)));
  }, [props.initialRating]);

  const [rating, setRating] = useState<number>(initial);
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
        <label className="text-sm font-medium">{t.rating}</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <StarPicker value={rating} onChange={setRating} aria={t.ratingAria} />
          <div className="text-sm text-gray-600">
            {props.mode === "create" ? t.newReview : t.edit}
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">{t.comment}</label>
        <textarea
          className="mt-2 w-full rounded-lg border p-2.5 text-sm sm:p-3"
          rows={3}
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t.placeholder}
        />
        <div className="mt-1 text-xs text-gray-500">{comment.length}/500</div>
      </div>

      <button
        className="w-full rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50 sm:w-auto"
        type="submit"
        disabled={saving}
      >
        {saving ? t.saving : props.mode === "create" ? t.publish : t.update}
      </button>
    </form>
  );
}
