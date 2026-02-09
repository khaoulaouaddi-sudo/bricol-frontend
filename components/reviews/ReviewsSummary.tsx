"use client";

import type { Review } from "@/lib/api/reviews";
import { useLang } from "@/components/LangProvider";

const i18n = {
  fr: { count: (n: number) => `${n} avis`, aria: (v: string) => `Note ${v}/5` },
  ar: { count: (n: number) => `${n} تقييم`, aria: (v: string) => `التقييم ${v}/5` },
} as const;

function avg(reviews: Review[]) {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  return sum / reviews.length;
}

function Stars({ value, ariaLabel }: { value: number; ariaLabel: string }) {
  const full = Math.round(value);
  return (
    <div className="flex items-center gap-1" aria-label={ariaLabel}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < full ? "text-yellow-500" : "text-gray-300"}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function ReviewsSummary({ reviews }: { reviews: Review[] }) {
  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;

  const a = avg(reviews);
  const display = reviews.length === 0 ? "—" : a.toFixed(1);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-gray-50 p-4">
      <div className="text-2xl font-bold">{display}</div>
      <Stars value={a} ariaLabel={t.aria(a.toFixed(1))} />
      <div className="text-sm text-gray-600">{t.count(reviews.length)}</div>
    </div>
  );
}
