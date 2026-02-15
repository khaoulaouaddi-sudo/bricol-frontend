"use client";

import type { Review } from "@/lib/api/reviews";
import { useLang } from "@/components/LangProvider";

const i18n = {
  fr: {
    count: (n: number) => `${n} avis`,
    aria: (v: string) => `Note ${v}/5`,
    stars: (n: number) => `${n} étoile${n > 1 ? "s" : ""}`,
  },
  ar: {
    count: (n: number) => `${n} تقييم`,
    aria: (v: string) => `التقييم ${v}/5`,
    stars: (n: number) => `${n} نجوم`,
  },
} as const;

function avg(reviews: Review[]) {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  return sum / reviews.length;
}

function dist(reviews: Review[]) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  for (const r of reviews) {
    const n = Number(r.rating) || 0;
    const k = (Math.max(1, Math.min(5, Math.round(n))) as 1 | 2 | 3 | 4 | 5);
    counts[k] += 1;
  }
  return counts;
}

function Stars({ value, ariaLabel }: { value: number; ariaLabel: string }) {
  const full = Math.round(value);
  return (
    <div className="flex items-center gap-1" aria-label={ariaLabel}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={i < full ? "text-yellow-500" : "text-gray-300"}
          aria-hidden="true"
        >
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

  const counts = dist(reviews);
  const total = reviews.length || 1;

  return (
    <div className="rounded-xl bg-gray-50 p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold">{display}</div>
          <div className="flex flex-col">
            <Stars value={a} ariaLabel={t.aria(a.toFixed(1))} />
            <div className="mt-1 text-sm text-gray-600">{t.count(reviews.length)}</div>
          </div>
        </div>

        {/* Répartition (compact en mobile, complète en desktop) */}
        <div className="w-full sm:w-auto">
          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map((n) => {
              const c = counts[n as 1 | 2 | 3 | 4 | 5] ?? 0;
              const pct = Math.round((c / total) * 100);
              return (
                <div key={n} className="flex items-center gap-2">
                  <div className="w-10 shrink-0 text-xs text-gray-600">
                    {t.stars(n)}
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 sm:w-40">
                    <div
                      className="h-full rounded-full bg-gray-900"
                      style={{ width: `${pct}%` }}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="w-8 shrink-0 text-right text-xs text-gray-600">
                    {c}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
