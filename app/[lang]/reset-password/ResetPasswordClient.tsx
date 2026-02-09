"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useLang } from "@/components/LangProvider";

type Status = "idle" | "ready" | "loading" | "success" | "error";

const i18n = {
  fr: {
    title: "Réinitialiser mot de passe",
    missingToken: "Token manquant. Vérifie le lien reçu par email.",
    successDefault: "Mot de passe réinitialisé. Vous pouvez vous connecter.",
    errorDefault: "Impossible de réinitialiser le mot de passe (token invalide/expiré).",
    newPassword: "Nouveau mot de passe",
    tip: "10+ caractères, majuscule, minuscule, chiffre, caractère spécial.",
    processing: "En cours…",
    reset: "Réinitialiser",
    goLogin: "Aller à Login",
    backLogin: "Retour login",
    resend: "Renvoyer un lien",
  },
  ar: {
    title: "إعادة تعيين كلمة المرور",
    missingToken: "الرمز مفقود. تحقّق من الرابط المرسل عبر البريد الإلكتروني.",
    successDefault: "تمت إعادة تعيين كلمة المرور. يمكنك الآن تسجيل الدخول.",
    errorDefault: "تعذر إعادة تعيين كلمة المرور (الرمز غير صالح أو منتهي).",
    newPassword: "كلمة مرور جديدة",
    tip: "10+ أحرف، حرف كبير وصغير، رقم، ورمز خاص.",
    processing: "جارٍ التنفيذ…",
    reset: "إعادة التعيين",
    goLogin: "الانتقال إلى تسجيل الدخول",
    backLogin: "العودة لتسجيل الدخول",
    resend: "إعادة إرسال الرابط",
  },
} as const;

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const base = `/${lang}`;

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMsg(t.missingToken);
    } else {
      setStatus("ready");
      setMsg(null);
    }
  }, [token, t.missingToken]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setIssues([]);

    try {
      const { data } = await api.post("/auth/reset-password", { token, password });
      setStatus("success");
      setMsg(data?.msg || t.successDefault);
    } catch (e: any) {
      const apiMsg = e?.response?.data?.msg || t.errorDefault;
      const apiIssues = Array.isArray(e?.response?.data?.issues) ? e.response.data.issues : [];
      setStatus("error");
      setMsg(apiMsg);
      setIssues(apiIssues);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir={dir} className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center">{t.title}</h1>

        {msg && (
          <div
            className={`p-3 rounded-lg text-sm space-y-2 ${
              status === "success"
                ? "bg-green-100 text-green-800"
                : status === "error"
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            <p className="font-medium">{msg}</p>
            {issues.length > 0 && (
              <ul className="list-disc pl-5">
                {issues.map((it, idx) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {status === "ready" && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t.newPassword}</label>
              <input
                type="password"
                required
                className="w-full border rounded-lg px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">{t.tip}</p>
            </div>

            <button
              disabled={loading}
              className="w-full bg-black text-white rounded-lg py-2 hover:bg-gray-800 disabled:opacity-60"
            >
              {loading ? t.processing : t.reset}
            </button>
          </form>
        )}

        {status === "success" && (
          <button
            className="w-full bg-black text-white rounded-lg py-2 hover:bg-gray-800"
            onClick={() => router.push(`${base}/login`)}
          >
            {t.goLogin}
          </button>
        )}

        <div className="flex justify-between text-sm text-gray-600">
          <Link href={`${base}/login`} className="hover:underline text-black">
            {t.backLogin}
          </Link>
          <Link href={`${base}/forgot-password`} className="hover:underline">
            {t.resend}
          </Link>
        </div>
      </div>
    </main>
  );
}
