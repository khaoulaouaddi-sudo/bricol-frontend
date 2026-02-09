import { Suspense } from "react";
import VerifyEmailClient from "./VerifyEmailClient";

const i18n = {
  fr: { loading: "Chargement…" },
  ar: { loading: "جار التحميل…" },
} as const;

export default function Page({ params }: { params: { lang: string } }) {
  const lang = params?.lang === "ar" ? "ar" : "fr";
  const t = i18n[lang];

  return (
    <Suspense fallback={<div className="p-6">{t.loading}</div>}>
      <VerifyEmailClient />
    </Suspense>
  );
}
