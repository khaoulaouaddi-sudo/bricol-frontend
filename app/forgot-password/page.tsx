"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null); // dev only (si backend renvoie reset_url)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setResetUrl(null);

    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setSent(true);
      setMsg(data?.msg || "Si un compte existe, un email a été envoyé.");

      // en dev, le backend peut renvoyer reset_url
      if (data?.reset_url) setResetUrl(data.reset_url);
    } catch (e: any) {
      const apiMsg = e?.response?.data?.msg || "Erreur lors de la demande.";
      setMsg(apiMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center">Mot de passe oublié</h1>

        {msg && (
          <div className="p-3 rounded-lg bg-gray-100 text-gray-800 text-sm space-y-2">
            <p>{msg}</p>

            {resetUrl && (
              <div className="space-y-1">
                <p className="text-xs text-gray-600">(Mode dev) Lien reset :</p>
                <a
                  href={resetUrl}
                  className="break-all underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {resetUrl}
                </a>
              </div>
            )}
          </div>
        )}

        {!sent ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
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
              {loading ? "Envoi…" : "Envoyer le lien"}
            </button>
          </form>
        ) : (
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              Si l’email existe, tu recevras un lien pour réinitialiser ton mot de passe.
            </p>
            <p className="text-xs text-gray-500">
              Pense à vérifier tes spams.
            </p>
          </div>
        )}

        <div className="flex justify-between text-sm text-gray-600">
          <Link href="/login" className="hover:underline text-black">
            Retour login
          </Link>
          <Link href="/register" className="hover:underline">
            Créer un compte
          </Link>
        </div>
      </div>
    </main>
  );
}
