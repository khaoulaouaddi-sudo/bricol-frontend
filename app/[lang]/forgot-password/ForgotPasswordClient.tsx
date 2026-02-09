"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useLang } from "@/components/LangProvider";

const i18n = {
  fr: {
    title: "Mot de passe oublié",
    email: "Email",
    send: "Envoyer le lien",
    sending: "Envoi…",
    defaultOk: "Si un compte existe, un email a été envoyé.",
    devLink: "(Mode dev) Lien reset :",
    sent1: "Si l’email existe, tu recevras un lien pour réinitialiser ton mot de passe.",
    sent2: "Pense à vérifier tes spams.",
    backLogin: "Retour login",
    create: "Créer un compte",
    errDefault: "Erreur lors de la demande.",
  },
  ar: {
    title: "نسيت كلمة المرور",
    email: "البريد الإلكتروني",
    send: "إرسال الرابط",
    sending: "جارٍ الإرسال…",
    defaultOk: "إذا كان الحساب موجودًا، فسيتم إرسال رسالة بريد إلكتروني.",
    devLink: "(وضع التطوير) رابط إعادة التعيين:",
    sent1: "إذا كان البريد موجودًا، ستصلك رسالة تحتوي على رابط لإعادة تعيين كلمة المرور.",
    sent2: "تحقّق أيضًا من الرسائل غير المرغوب فيها.",
    backLogin: "العودة لتسجيل الدخول",
    create: "إنشاء حساب",
    errDefault: "حدث خطأ أثناء الطلب.",
  },
} as const;

export default function ForgotPasswordClient() {
  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const base = `/${lang}`;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setResetUrl(null);

    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setSent(true);
      setMsg(data?.msg || t.defaultOk);
      if (data?.reset_url) setResetUrl(data.reset_url);
    } catch (e: any) {
      const apiMsg = e?.response?.data?.msg || t.errDefault;
      setMsg(apiMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir={dir} className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center">{t.title}</h1>

        {msg && (
          <div className="p-3 rounded-lg bg-gray-100 text-gray-800 text-sm space-y-2">
            <p>{msg}</p>

            {resetUrl && (
              <div className="space-y-1">
                <p className="text-xs text-gray-600">{t.devLink}</p>
                <a href={resetUrl} className="break-all underline" target="_blank" rel="noreferrer">
                  {resetUrl}
                </a>
              </div>
            )}
          </div>
        )}

        {!sent ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t.email}</label>
              <input
                type="email"
                required
                className="w-full border rounded-lg px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              disabled={loading}
              className="w-full bg-black text-white rounded-lg py-2 hover:bg-gray-800 disabled:opacity-60"
            >
              {loading ? t.sending : t.send}
            </button>
          </form>
        ) : (
          <div className="text-sm text-gray-700 space-y-2">
            <p>{t.sent1}</p>
            <p className="text-xs text-gray-500">{t.sent2}</p>
          </div>
        )}

        <div className="flex justify-between text-sm text-gray-600">
          <Link href={`${base}/login`} className="hover:underline text-black">
            {t.backLogin}
          </Link>
          <Link href={`${base}/register`} className="hover:underline">
            {t.create}
          </Link>
        </div>
      </div>
    </main>
  );
}
