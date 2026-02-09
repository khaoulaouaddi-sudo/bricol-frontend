"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useLang } from "@/components/LangProvider";

type Status = "idle" | "loading" | "success" | "error";

const i18n = {
  fr: {
    title: "Confirmation Email",
    verifying: "Vérification en cours…",
    missingToken: "Token manquant. Vérifie le lien reçu par email.",
    successDefault: "Email confirmé. Vous pouvez vous connecter.",
    errorDefault: "Impossible de confirmer l’email (token invalide ou expiré).",
    goLogin: "Aller à Login",
    home: "Accueil",
    create: "Créer un compte",
    hint:
      "Si le lien a expiré, tu peux créer un nouveau compte (ou on ajoutera bientôt “Renvoyer l’email de confirmation”).",
    help: "Besoin d’aide ?",
    contact: "Contact",
  },
  ar: {
    title: "تأكيد البريد الإلكتروني",
    verifying: "جارٍ التحقق…",
    missingToken: "الرمز مفقود. تحقّق من الرابط المرسل عبر البريد الإلكتروني.",
    successDefault: "تم تأكيد البريد الإلكتروني. يمكنك الآن تسجيل الدخول.",
    errorDefault: "تعذر تأكيد البريد الإلكتروني (الرمز غير صالح أو منتهي).",
    goLogin: "الانتقال إلى تسجيل الدخول",
    home: "الرئيسية",
    create: "إنشاء حساب",
    hint:
      "إذا انتهت صلاحية الرابط، يمكنك إنشاء حساب جديد (وسنضيف قريبًا خيار “إعادة إرسال رسالة التأكيد”).",
    help: "هل تحتاج مساعدة؟",
    contact: "تواصل معنا",
  },
} as const;

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const base = `/${lang}`;

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus("error");
        setMessage(t.missingToken);
        return;
      }

      setStatus("loading");
      setMessage("");

      try {
        const { data } = await api.post("/auth/verify-email", { token });
        setStatus("success");
        setMessage(data?.msg || t.successDefault);
      } catch (e: any) {
        const apiMsg = e?.response?.data?.msg || t.errorDefault;
        setStatus("error");
        setMessage(apiMsg);
      }
    };

    run();
  }, [token, t.missingToken, t.successDefault, t.errorDefault]);

  return (
    <main dir={dir} className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center">{t.title}</h1>

        {status === "loading" && (
          <div className="p-3 rounded-lg bg-gray-100 text-gray-800 text-sm">{t.verifying}</div>
        )}

        {status === "success" && (
          <div className="p-3 rounded-lg bg-green-100 text-green-800 text-sm space-y-3">
            <p className="font-medium">{message}</p>
            <div className="flex gap-2">
              <button
                className="px-3 py-2 rounded-lg bg-black text-white text-sm hover:bg-gray-800"
                onClick={() => router.push(`${base}/login`)}
              >
                {t.goLogin}
              </button>
              <Link className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50" href={base}>
                {t.home}
              </Link>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="p-3 rounded-lg bg-red-100 text-red-700 text-sm space-y-3">
            <p className="font-medium">{message}</p>

            <div className="flex gap-2">
              <Link
                href={`${base}/login`}
                className="px-3 py-2 rounded-lg bg-black text-white text-sm hover:bg-gray-800"
              >
                {t.goLogin}
              </Link>
              <Link href={`${base}/register`} className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50">
                {t.create}
              </Link>
            </div>

            <p className="text-xs text-gray-600">{t.hint}</p>
          </div>
        )}

        <p className="text-center text-sm text-gray-600">
          {t.help}{" "}
          <Link href={`${base}/contact`} className="text-black hover:underline">
            {t.contact}
          </Link>
        </p>
      </div>
    </main>
  );
}
