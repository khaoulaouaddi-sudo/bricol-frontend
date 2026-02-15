"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useLang } from "@/components/LangProvider";

type RegisterSuccess = {
  msg?: string;
  verify_url?: string;
};

const i18n = {
  fr: {
    title: "Créer un compte",
    name: "Nom",
    email: "Email",
    password: "Mot de passe",
    tip: "Conseil : au moins 4 caractères.",
    creating: "Création…",
    create: "Créer mon compte",
    already: "Déjà un compte ?",
    login: "Se connecter",
    devLink: "(Mode dev) Lien de vérification :",
    goLogin: "Aller à la page Login",
    createAnother: "Créer un autre compte",
    successDefault: "Compte créé. Vérifie ton email pour activer la connexion.",
    errDefault: "Erreur à l’inscription",
    errPwdMin: "Le mot de passe doit contenir au moins 4 caractères.",
  },
  ar: {
    title: "إنشاء حساب",
    name: "الاسم",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    tip: "نصيحة: على الأقل 4 أحرف.",
    creating: "جارٍ الإنشاء…",
    create: "إنشاء الحساب",
    already: "لديك حساب؟",
    login: "تسجيل الدخول",
    devLink: "(وضع التطوير) رابط التفعيل:",
    goLogin: "الانتقال إلى صفحة تسجيل الدخول",
    createAnother: "إنشاء حساب آخر",
    successDefault: "تم إنشاء الحساب. تحقّق من بريدك لتفعيل الحساب.",
    errDefault: "حدث خطأ أثناء التسجيل",
    errPwdMin: "كلمة المرور يجب أن تكون 4 أحرف على الأقل.",
  },
} as const;

export default function RegisterPage() {
  const router = useRouter();
  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const base = `/${lang}`;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [success, setSuccess] = useState<RegisterSuccess | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setIssues([]);
    setSuccess(null);

    // ✅ Optionnel (mais clair) : feedback immédiat côté UI
    if ((password || "").length < 4) {
      setErr(t.errPwdMin);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/auth/register", { name, email, password });

      setSuccess({
        msg: data?.msg || t.successDefault,
        verify_url: data?.verify_url,
      });
    } catch (e: any) {
      const apiMsg = e?.response?.data?.msg || e?.message || t.errDefault;
      const apiIssues = Array.isArray(e?.response?.data?.issues) ? e.response.data.issues : [];
      setErr(apiMsg);
      setIssues(apiIssues);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir={dir} className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center">{t.title}</h1>

        {success && (
          <div className="p-3 rounded-lg bg-green-100 text-green-800 text-sm space-y-2">
            <p className="font-medium">{success.msg}</p>

            {success.verify_url && (
              <div className="space-y-1">
                <p className="text-xs text-green-900/80">{t.devLink}</p>
                <a href={success.verify_url} className="break-all underline" target="_blank" rel="noreferrer">
                  {success.verify_url}
                </a>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                className="px-3 py-2 rounded-lg bg-black text-white text-sm hover:bg-gray-800"
                onClick={() => router.push(`${base}/login`)}
              >
                {t.goLogin}
              </button>
              <button
                className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
                onClick={() => setSuccess(null)}
              >
                {t.createAnother}
              </button>
            </div>
          </div>
        )}

        {err && (
          <div className="p-3 rounded-lg bg-red-100 text-red-700 text-sm space-y-2">
            <p className="font-medium">{err}</p>
            {issues.length > 0 && (
              <ul className="list-disc pl-5">
                {issues.map((it, idx) => (
                  <li key={idx}>{it}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!success && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t.name}</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </div>

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

            <div>
              <label className="text-sm font-medium">{t.password}</label>
              <input
                type="password"
                required
                minLength={4} // ✅ règle minimale
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
              {loading ? t.creating : t.create}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-600">
          {t.already}{" "}
          <Link href={`${base}/login`} className="text-black hover:underline">
            {t.login}
          </Link>
        </p>
      </div>
    </main>
  );
}
