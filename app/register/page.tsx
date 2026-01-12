"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import  api  from "@/lib/api";

type RegisterSuccess = {
  msg?: string;
  verify_url?: string; // présent en dev si MAILER_DISABLED ou SMTP KO
};

export default function RegisterPage() {
  const router = useRouter();

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
    setLoading(true);

    try {
      const { data } = await api.post("/auth/register", { name, email, password });

      // Nouveau backend: pas d'access_token ici.
      setSuccess({
        msg: data?.msg || "Compte créé. Vérifie ton email pour activer la connexion.",
        verify_url: data?.verify_url,
      });

      // Option UX: on garde les champs ou on les vide
      // setName(""); setEmail(""); setPassword("");

    } catch (e: any) {
      const apiMsg = e?.response?.data?.msg || e?.message || "Erreur à l’inscription";
      const apiIssues = Array.isArray(e?.response?.data?.issues) ? e.response.data.issues : [];
      setErr(apiMsg);
      setIssues(apiIssues);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center">Créer un compte</h1>

        {/* Succès */}
        {success && (
          <div className="p-3 rounded-lg bg-green-100 text-green-800 text-sm space-y-2">
            <p className="font-medium">{success.msg}</p>

            {/* En dev, le backend peut renvoyer un verify_url */}
            {success.verify_url && (
              <div className="space-y-1">
                <p className="text-xs text-green-900/80">
                  (Mode dev) Lien de vérification :
                </p>
                <a
                  href={success.verify_url}
                  className="break-all underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {success.verify_url}
                </a>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                className="px-3 py-2 rounded-lg bg-black text-white text-sm hover:bg-gray-800"
                onClick={() => router.push("/login")}
              >
                Aller à la page Login
              </button>
              <button
                className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
                onClick={() => setSuccess(null)}
              >
                Créer un autre compte
              </button>
            </div>
          </div>
        )}

        {/* Erreurs */}
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

        {/* Formulaire */}
        {!success && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nom</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </div>

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

            <div>
              <label className="text-sm font-medium">Mot de passe</label>
              <input
                type="password"
                required
                className="w-full border rounded-lg px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Conseil : 10+ caractères, majuscule, minuscule, chiffre, caractère spécial.
              </p>
            </div>

            <button
              disabled={loading}
              className="w-full bg-black text-white rounded-lg py-2 hover:bg-gray-800 disabled:opacity-60"
            >
              {loading ? "Création…" : "Créer mon compte"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-600">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-black hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
