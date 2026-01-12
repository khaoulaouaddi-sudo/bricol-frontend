"use client";

import type { Review } from "@/lib/api/reviews";

function avg(reviews: Review[]) {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  return sum / reviews.length;
}

function Stars({ value }: { value: number }) {
  const full = Math.round(value);
  return (
    <div className="flex items-center gap-1" aria-label={`Note ${value.toFixed(1)}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < full ? "text-yellow-500" : "text-gray-300"}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function ReviewsSummary({ reviews }: { reviews: Review[] }) {
  const a = avg(reviews);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-gray-50 p-4">
      <div className="text-2xl font-bold">{reviews.length === 0 ? "—" : a.toFixed(1)}</div>
      <Stars value={a} />
      <div className="text-sm text-gray-600">
        {reviews.length} avis
      </div>
    </div>
  );
}
