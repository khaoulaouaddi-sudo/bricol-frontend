"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api"; // ✅ FIX: default export
import { useAuth } from "@/components/AuthProvider";

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

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const rendered = useRef(false); // évite double render Google button

  // =========================
  // Google Identity Services
  // =========================
  useEffect(() => {
    if (rendered.current) return;
    rendered.current = true;

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

    // ✅ optionnel mais propre
    return () => {
      try {
        document.body.removeChild(script);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================
  // Google callback
  // =========================
  const handleGoogleCredential = async (response: any) => {
    try {
      setLoading(true);
      setError(null);

      const { credential } = response;
      const res = await api.post("/oauth/google", { id_token: credential });

      const accessToken = res?.data?.access_token;
      if (!accessToken) {
        setError("Réponse serveur invalide (access_token manquant).");
        return;
      }

      await login(accessToken);

      const role = getRoleFromJwt(accessToken);

      // ✅ Redirection admin (si next est "/" ou vide)
      if (role === "admin" && (next === "/" || !next)) {
        router.push("/admin");
      } else {
        router.push(next);
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.msg;
      setError(msg || "Erreur lors de la connexion avec Google.");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // Email / Password login
  // =========================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post("/auth/login", { email, password });

      const accessToken = res?.data?.access_token;
      if (!accessToken) {
        setError("Réponse serveur invalide (access_token manquant).");
        return;
      }

      await login(accessToken);

      const role = getRoleFromJwt(accessToken);

      // ✅ Redirection admin (si next est "/" ou vide)
      if (role === "admin" && (next === "/" || !next)) {
        router.push("/admin");
      } else {
        router.push(next);
      }
    } catch (err: any) {
      console.error(err);

      const status = err?.response?.status;
      const msg = err?.response?.data?.msg;

      // ✅ 403 : email non vérifié / suspendu / interdit => garder le msg backend
      if (status === 403 && msg) {
        setError(msg);
        return;
      }

      // ✅ 401 : mauvais identifiants => message propre
      if (status === 401) {
        setError("Email ou mot de passe invalide.");
        return;
      }

      setError(msg || "Erreur lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // UI
  // =========================
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center">Connexion</h1>

        {error && (
          <div className="p-2 text-sm text-red-700 bg-red-100 rounded space-y-2">
            <div>{error}</div>

            {/* Guidance utile si email non vérifié */}
            {String(error).toLowerCase().includes("confirmer") && (
              <div className="text-xs text-red-700/80">
                Vérifie ta boîte email (et spams). Puis reviens te connecter.
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-black"
              placeholder="ex: nom@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Mot de passe
            </label>
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
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-sm">ou</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div id="googleSignInDiv" className="flex justify-center" />

        <div className="text-sm text-center text-gray-600 space-y-1 mt-4">
          <p>
            Pas de compte ?{" "}
            <a href="/register" className="text-black hover:underline">
              Créer un compte
            </a>
          </p>
          <p>
            <a href="/forgot-password" className="text-black hover:underline">
              Mot de passe oublié ?
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
