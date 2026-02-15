"use client";

import type { Review } from "@/lib/api/reviews";
import { useLang } from "@/components/LangProvider";
import ReviewForm from "./ReviewForm";

type User = { id: number; name: string | null; email: string; role: string } | null;

const i18n = {
  fr: {
    title: "Votre avis",
    loginHint: "Connectez-vous pour laisser un avis.",
    already: "Vous avez déjà laissé un avis. Vous pouvez le modifier ou le supprimer.",
    leave: "Laissez un avis.",
    delete: "Supprimer",
  },
  ar: {
    title: "تقييمك",
    loginHint: "سجّل الدخول لترك تقييم.",
    already: "لقد تركت تقييمًا بالفعل. يمكنك تعديله أو حذفه.",
    leave: "اترك تقييمًا.",
    delete: "حذف",
  },
} as const;

export default function MyReviewPanel(props: {
  user: User;
  myReview: Review | null;
  onCreate: (payload: { rating: number; comment?: string }) => Promise<void> | void;
  onUpdate: (reviewId: number, payload: { rating?: number; comment?: string | null }) => Promise<void> | void;
  onDelete: (reviewId: number) => Promise<void> | void;
}) {
  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;

  const { user, myReview } = props;

  if (!user) {
    return (
      <div className="rounded-xl border bg-white p-3 sm:p-4">
        <div className="font-semibold">{t.title}</div>
        <p className="mt-1 text-sm text-gray-600">{t.loginHint}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="font-semibold">{t.title}</div>
          <div className="text-sm text-gray-600">{myReview ? t.already : t.leave}</div>
        </div>

        {myReview && (
          <button
            className="w-full rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 sm:w-auto"
            onClick={() => props.onDelete(myReview.id)}
            type="button"
          >
            {t.delete}
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
