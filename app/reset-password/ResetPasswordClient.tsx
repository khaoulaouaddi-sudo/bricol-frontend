"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";

type Status = "idle" | "ready" | "loading" | "success" | "error";

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState<Status>("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMsg("Token manquant. Vérifie le lien reçu par email.");
    } else {
      setStatus("ready");
      setMsg(null);
    }
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setIssues([]);

    try {
      const { data } = await api.post("/auth/reset-password", { token, password });
      setStatus("success");
      setMsg(data?.msg || "Mot de passe réinitialisé. Vous pouvez vous connecter.");
    } catch (e: any) {
      const apiMsg =
        e?.response?.data?.msg ||
        "Impossible de réinitialiser le mot de passe (token invalide/expiré).";
      const apiIssues = Array.isArray(e?.response?.data?.issues) ? e.response.data.issues : [];
      setStatus("error");
      setMsg(apiMsg);
      setIssues(apiIssues);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center">Réinitialiser mot de passe</h1>

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
              <label className="text-sm font-medium">Nouveau mot de passe</label>
              <input
                type="password"
                required
                className="w-full border rounded-lg px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                10+ caractères, majuscule, minuscule, chiffre, caractère spécial.
              </p>
            </div>

            <button
              disabled={loading}
              className="w-full bg-black text-white rounded-lg py-2 hover:bg-gray-800 disabled:opacity-60"
            >
              {loading ? "En cours…" : "Réinitialiser"}
            </button>
          </form>
        )}

        {status === "success" && (
          <button
            className="w-full bg-black text-white rounded-lg py-2 hover:bg-gray-800"
            onClick={() => router.push("/login")}
          >
            Aller à Login
          </button>
        )}

        <div className="flex justify-between text-sm text-gray-600">
          <Link href="/login" className="hover:underline text-black">
            Retour login
          </Link>
          <Link href="/forgot-password" className="hover:underline">
            Renvoyer un lien
          </Link>
        </div>
      </div>
    </main>
  );
}
