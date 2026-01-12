"use client";

import type { Review } from "@/lib/api/reviews";
import ReviewForm from "./ReviewForm";

type User = { id: number; name: string | null; email: string; role: string } | null;

export default function MyReviewPanel(props: {
  user: User;
  myReview: Review | null;
  onCreate: (payload: { rating: number; comment?: string }) => Promise<void> | void;
  onUpdate: (reviewId: number, payload: { rating?: number; comment?: string | null }) => Promise<void> | void;
  onDelete: (reviewId: number) => Promise<void> | void;
}) {
  const { user, myReview } = props;

  if (!user) {
    return (
      <div className="rounded-xl border p-4">
        <div className="font-semibold">Votre avis</div>
        <p className="mt-1 text-sm text-gray-600">
          Connectez-vous pour laisser un avis.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">Votre avis</div>
          <div className="text-sm text-gray-600">
            {myReview ? "Vous avez déjà laissé un avis. Vous pouvez le modifier ou le supprimer." : "Laissez un avis."}
          </div>
        </div>
        {myReview && (
          <button
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => props.onDelete(myReview.id)}
            type="button"
          >
            Supprimer
          </button>
        )}
      </div>

      <div className="mt-4">
        <ReviewForm
          initialRating={myReview?.rating ?? 5}
          initialComment={myReview?.comment ?? ""}
          mode={myReview ? "edit" : "create"}
          onSubmit={async (payload) => {
            if (myReview) {
              await props.onUpdate(myReview.id, payload);
            } else {
              await props.onCreate(payload);
            }
          }}
        />
      </div>
    </div>
  );
}
