"use client"

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import  api from "@/lib/api";

type Status = "idle" | "loading" | "success" | "error";

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Token manquant. Vérifie le lien reçu par email.");
        return;
      }

      setStatus("loading");
      setMessage("");

      try {
        const { data } = await api.post("/auth/verify-email", { token });
        setStatus("success");
        setMessage(data?.msg || "Email confirmé. Vous pouvez vous connecter.");
      } catch (e: any) {
        const apiMsg =
          e?.response?.data?.msg ||
          "Impossible de confirmer l’email (token invalide ou expiré).";
        setStatus("error");
        setMessage(apiMsg);
      }
    };

    run();
  }, [token]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center">Confirmation Email</h1>

        {status === "loading" && (
          <div className="p-3 rounded-lg bg-gray-100 text-gray-800 text-sm">
            Vérification en cours…
          </div>
        )}

        {status === "success" && (
          <div className="p-3 rounded-lg bg-green-100 text-green-800 text-sm space-y-3">
            <p className="font-medium">{message}</p>
            <div className="flex gap-2">
              <button
                className="px-3 py-2 rounded-lg bg-black text-white text-sm hover:bg-gray-800"
                onClick={() => router.push("/login")}
              >
                Aller à Login
              </button>
              <Link
                className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
                href="/"
              >
                Accueil
              </Link>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="p-3 rounded-lg bg-red-100 text-red-700 text-sm space-y-3">
            <p className="font-medium">{message}</p>

            <div className="flex gap-2">
              <Link
                href="/login"
                className="px-3 py-2 rounded-lg bg-black text-white text-sm hover:bg-gray-800"
              >
                Aller à Login
              </Link>
              <Link
                href="/register"
                className="px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
              >
                Créer un compte
              </Link>
            </div>

            <p className="text-xs text-gray-600">
              Si le lien a expiré, tu peux créer un nouveau compte (ou on ajoutera bientôt
              “Renvoyer l’email de confirmation”).
            </p>
          </div>
        )}

        <p className="text-center text-sm text-gray-600">
          Besoin d’aide ?{" "}
          <Link href="/contact" className="text-black hover:underline">
            Contact
          </Link>
        </p>
      </div>
    </main>
  );
}
