"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import { useLang } from "@/components/LangProvider";

function getRoleFromJwt(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    return payload?.role ?? null;
  } catch {
    return null;
  }
}

const i18n = {
  fr: {
    title: "Connexion",
    email: "Email",
    password: "Mot de passe",
    emailPh: "ex: nom@email.com",
    login: "Se connecter",
    logging: "Connexion...",
    or: "ou",
    noAccount: "Pas de compte ?",
    createAccount: "Créer un compte",
    forgot: "Mot de passe oublié ?",
    invalidServer: "Réponse serveur invalide (access_token manquant).",
    googleError: "Erreur lors de la connexion avec Google.",
    facebook: "Continuer avec Facebook",
    facebookError: "Erreur lors de la connexion avec Facebook.",
    facebookNeedEmail:
      "Facebook n’a pas fourni votre email. Merci de le saisir pour continuer.",
    continue: "Continuer",
    invalidCreds: "Email ou mot de passe invalide.",
    loginError: "Erreur lors de la connexion.",
    verifyHint:
      "Vérifie ta boîte email (et spams). Puis reviens te connecter.",
    missingFbAppId:
      "Configuration manquante: NEXT_PUBLIC_FACEBOOK_APP_ID n'est pas défini.",
  },
  ar: {
    title: "تسجيل الدخول",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    emailPh: "مثال: nom@email.com",
    login: "تسجيل الدخول",
    logging: "جارٍ تسجيل الدخول...",
    or: "أو",
    noAccount: "ليس لديك حساب؟",
    createAccount: "إنشاء حساب",
    forgot: "نسيت كلمة المرور؟",
    invalidServer: "ردّ غير صالح من الخادم (access_token غير موجود).",
    googleError: "حدث خطأ أثناء تسجيل الدخول عبر Google.",
    facebook: "المتابعة عبر فيسبوك",
    facebookError: "حدث خطأ أثناء تسجيل الدخول عبر فيسبوك.",
    facebookNeedEmail:
      "فيسبوك لم يوفّر بريدك الإلكتروني. يرجى إدخاله للمتابعة.",
    continue: "متابعة",
    invalidCreds: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    loginError: "حدث خطأ أثناء تسجيل الدخول.",
    verifyHint:
      "تحقّق من بريدك الإلكتروني (وأيضًا الرسائل غير المرغوب فيها). ثم حاول تسجيل الدخول من جديد.",
    missingFbAppId:
      "إعدادات ناقصة: NEXT_PUBLIC_FACEBOOK_APP_ID غير مُعرّف.",
  },
} as const;

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");

  const { login } = useAuth();
  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const base = `/${lang}`;
  const next = rawNext || base;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Facebook fallback si pas d'email
  const [fbNeedEmail, setFbNeedEmail] = useState(false);
  const [fbEmail, setFbEmail] = useState("");
  const [fbAccessToken, setFbAccessToken] = useState<string | null>(null);

  const googleRendered = useRef(false);
  const fbRendered = useRef(false);

  // ===== Google SDK (inchangé, juste renommage ref) =====
  useEffect(() => {
    if (googleRendered.current) return;
    googleRendered.current = true;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // @ts-ignore
      if (!window.google) return;

      // @ts-ignore
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        callback: handleGoogleCredential,
      });

      const el = document.getElementById("googleSignInDiv");
      if (el) {
        // @ts-ignore
        window.google.accounts.id.renderButton(el, {
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
        });
      }
    };

    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Facebook SDK =====
  useEffect(() => {
    if (fbRendered.current) return;
    fbRendered.current = true;

    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    if (!appId) {
      // On ne bloque pas toute la page, mais on avertit si l'utilisateur clique.
      return;
    }

    // si déjà chargé
    // @ts-ignore
    if (window.FB) {
      // @ts-ignore
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: "v20.0",
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // @ts-ignore
      if (!window.FB) return;
      // @ts-ignore
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: "v20.0",
      });
    };

    document.body.appendChild(script);

    return () => {
      try {
        document.body.removeChild(script);
      } catch {}
    };
  }, []);

  const redirectAfterAuth = (accessToken: string) => {
    const role = getRoleFromJwt(accessToken);
    if (role === "admin" && (next === "/" || !next)) {
      router.push(`${base}/admin`);
    } else {
      router.push(next);
    }
  };

  const handleGoogleCredential = async (response: any) => {
    try {
      setLoading(true);
      setError(null);

      const { credential } = response;
      const res = await api.post("/oauth/google", { id_token: credential });

      const accessToken = res?.data?.access_token;
      if (!accessToken) {
        setError(t.invalidServer);
        return;
      }

      await login(accessToken);
      redirectAfterAuth(accessToken);
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.msg;
      setError(msg || t.googleError);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post("/auth/login", { email, password });

      const accessToken = res?.data?.access_token;
      if (!accessToken) {
        setError(t.invalidServer);
        return;
      }

      await login(accessToken);
      redirectAfterAuth(accessToken);
    } catch (err: any) {
      console.error(err);

      const status = err?.response?.status;
      const msg = err?.response?.data?.msg;

      if (status === 403 && msg) {
        setError(msg);
        return;
      }

      if (status === 401) {
        setError(t.invalidCreds);
        return;
      }

      setError(msg || t.loginError);
    } finally {
      setLoading(false);
    }
  };

  // ===== Facebook handlers =====
  const exchangeFacebookToken = async (token: string, emailOverride?: string) => {
    try {
      setLoading(true);
      setError(null);

      const payload: any = { access_token: token };
      if (emailOverride) payload.email = emailOverride;

      const res = await api.post("/oauth/facebook", payload);

      const accessToken = res?.data?.access_token;
      if (!accessToken) {
        setError(t.invalidServer);
        return;
      }

      await login(accessToken);
      redirectAfterAuth(accessToken);
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.msg || t.facebookError;

      // Backend exact:
      // "Facebook n'a pas fourni d'email; passez 'email' dans le body."
      if (
        typeof msg === "string" &&
        msg.includes("Facebook n'a pas fourni d'email")
      ) {
        setFbNeedEmail(true);
        setError(t.facebookNeedEmail);
        return;
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onFacebookClick = () => {
    setError(null);
    setFbNeedEmail(false);
    setFbEmail("");
    setFbAccessToken(null);

    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    if (!appId) {
      setError(t.missingFbAppId);
      return;
    }

    // @ts-ignore
    if (!window.FB) {
      setError(t.facebookError);
      return;
    }

    // @ts-ignore
    window.FB.login(
      (resp: any) => {
        const token = resp?.authResponse?.accessToken;
        if (!token) {
          setError(t.facebookError);
          return;
        }
        setFbAccessToken(token);
        void exchangeFacebookToken(token);
      },
      { scope: "public_profile,email" }
    );
  };

  const onFacebookEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbAccessToken) {
      setError(t.facebookError);
      return;
    }
    void exchangeFacebookToken(fbAccessToken, fbEmail);
  };

  return (
    <main dir={dir} className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center">{t.title}</h1>

        {error && (
          <div className="p-2 text-sm text-red-700 bg-red-100 rounded space-y-2">
            <div>{error}</div>

            {String(error).toLowerCase().includes("confirmer") && (
              <div className="text-xs text-red-700/80">{t.verifyHint}</div>
            )}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t.email}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-black"
              placeholder={t.emailPh}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t.password}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-black"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-60"
          >
            {loading ? t.logging : t.login}
          </button>
        </form>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-sm">{t.or}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="space-y-3">
          <div id="googleSignInDiv" className="flex justify-center" />

          <button
  type="button"
  onClick={onFacebookClick}
  disabled={loading}
  className="w-full flex items-center justify-center gap-2 rounded-lg py-2 transition disabled:opacity-60 bg-[#1877F2] text-white hover:bg-[#166FE5]"
>
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="h-5 w-5 fill-white"
  >
    <path d="M22 12a10 10 0 1 0-11.5 9.9v-7H8v-3h2.5V9.5A3.5 3.5 0 0 1 14.2 6h2.3v3h-2.3c-.5 0-.9.4-.9.9V12H16l-.5 3h-2.2v7A10 10 0 0 0 22 12Z" />
  </svg>
  <span>{t.facebook}</span>
</button>


          {fbNeedEmail && (
            <form onSubmit={onFacebookEmailSubmit} className="space-y-2">
              <input
                type="email"
                required
                value={fbEmail}
                onChange={(e) => setFbEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-black"
                placeholder={t.emailPh}
              />
              <button
                type="submit"
                disabled={loading || !fbEmail}
                className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-60"
              >
                {t.continue}
              </button>
            </form>
          )}
        </div>

        <div className="text-sm text-center text-gray-600 space-y-1 mt-4">
          <p>
            {t.noAccount}{" "}
            <a href={`${base}/register`} className="text-black hover:underline">
              {t.createAccount}
            </a>
          </p>
          <p>
            <a href={`${base}/forgot-password`} className="text-black hover:underline">
              {t.forgot}
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
