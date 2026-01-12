"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

type AdType = "service" | "product";

type AdRow = {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  price: string | number | null;
  type: AdType;
  location: string | null;
  image_url: string | null;
  city_id: number | null;
  created_at: string;
  updated_at: string;
};

function safeNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function AdminAdsPage() {
  const router = useRouter();

  const [items, setItems] = useState<AdRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // UI state
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editing, setEditing] = useState<AdRow | null>(null);

  // form state
  const [title, setTitle] = useState("");
  const [type, setType] = useState<AdType>("service");
  const [price, setPrice] = useState<string>("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);

  async function loadAds() {
    try {
      setLoading(true);
      setPageError(null);

      // ✅ GET /ads est public, mais l’admin page doit quand même être protégée
      // Donc on vérifie d'abord l'accès admin via /users (admin only) comme sur app/admin/page.tsx.
      await api.get("/users"); // si pas admin -> 403
      const { data } = await api.get("/ads"); // liste

      // Ton backend renvoie parfois {items, meta} sur certaines routes,
      // mais /ads ici renvoie "rows" (tableau) => on gère les deux sans hypothèse.
      const arr = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setItems(arr);
    } catch (e: any) {
      const statusCode = e?.response?.status;
      const msg = e?.response?.data?.msg || e?.response?.data?.error;

      if (statusCode === 401) {
        router.push(`/login?next=/admin/ads`);
        return;
      }
      if (statusCode === 403) {
        setPageError(msg || "Accès interdit (admin uniquement).");
        return;
      }
      setPageError(msg || "Impossible de charger les annonces.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setTitle("");
    setType("service");
    setPrice("");
    setLocation("");
    setImageUrl("");
    setDescription("");
  }

  function openCreate() {
    resetForm();
    setEditing(null);
    setMode("create");
  }

  function openEdit(a: AdRow) {
    setEditing(a);
    setTitle(a.title || "");
    setType(a.type || "service");
    setPrice(a.price == null ? "" : String(a.price));
    setLocation(a.location || "");
    setImageUrl(a.image_url || "");
    setDescription(a.description || "");
    setMode("edit");
  }

  function cancelForm() {
    setMode("list");
    setEditing(null);
    resetForm();
  }

  const preview = useMemo(() => {
    return imageUrl?.trim() ? imageUrl.trim() : null;
  }, [imageUrl]);

  async function submit() {
    try {
      setSaving(true);

      const payload: any = {
        title: title.trim(),
        type,
      };

      // champs optionnels
      const p = price.trim();
      if (p !== "") payload.price = Number(p);
      if (location.trim() !== "") payload.location = location.trim();
      if (imageUrl.trim() !== "") payload.image_url = imageUrl.trim();
      if (description.trim() !== "") payload.description = description.trim();

      if (!payload.title || payload.title.length < 3) {
        alert("Titre invalide (min 3 caractères).");
        return;
      }
      if (payload.description && payload.description.length > 2000) {
        alert("Description trop longue (max 2000).");
        return;
      }

      if (mode === "create") {
        await api.post("/ads", payload); // admin only
      } else if (mode === "edit" && editing) {
        await api.patch(`/ads/${editing.id}`, payload); // admin only
      }

      await loadAds();
      cancelForm();
    } catch (e: any) {
      const msg = e?.response?.data?.msg || e?.response?.data?.error || "Erreur lors de l’enregistrement.";
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  async function removeAd(id: number) {
    if (!confirm("Supprimer cette annonce ?")) return;
    try {
      await api.delete(`/ads/${id}`); // admin only
      await loadAds();
    } catch (e: any) {
      const msg = e?.response?.data?.msg || e?.response?.data?.error || "Erreur lors de la suppression.";
      alert(msg);
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">Admin · Annonces (Ads)</h1>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
            onClick={() => router.push("/admin")}
          >
            ← Retour admin
          </button>

          {mode === "list" ? (
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm bg-black text-white hover:opacity-90"
              onClick={openCreate}
            >
              + Créer une annonce
            </button>
          ) : null}
        </div>
      </div>

      {pageError ? (
        <div className="rounded-2xl border bg-white p-5 text-red-600">{pageError}</div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border bg-white p-5">Chargement…</div>
      ) : null}

      {!loading && !pageError && mode === "list" ? (
        <section className="rounded-2xl border bg-white p-5 space-y-3">
          <div className="text-sm text-gray-600">{items.length} annonce(s)</div>

          {!items.length ? (
            <div className="text-sm text-gray-600">Aucune annonce.</div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">ID</th>
                    <th className="py-2 pr-3">Titre</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Prix</th>
                    <th className="py-2 pr-3">Localisation</th>
                    <th className="py-2 pr-3">Image</th>
                    <th className="py-2 pr-3">Maj</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => (
                    <tr key={a.id} className="border-b">
                      <td className="py-2 pr-3">{a.id}</td>
                      <td className="py-2 pr-3 font-medium">{a.title}</td>
                      <td className="py-2 pr-3">{a.type}</td>
                      <td className="py-2 pr-3">{a.price ?? "-"}</td>
                      <td className="py-2 pr-3">{a.location ?? "-"}</td>
                      <td className="py-2 pr-3">
                        {a.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={a.image_url}
                            alt={a.title}
                            className="w-16 h-10 object-cover rounded-md border"
                          />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {a.updated_at ? new Date(a.updated_at).toLocaleString() : "-"}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="border rounded-lg px-3 py-1 hover:bg-gray-50"
                            onClick={() => openEdit(a)}
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            className="border rounded-lg px-3 py-1 hover:bg-gray-50 text-red-600"
                            onClick={() => removeAd(a.id)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {!loading && !pageError && (mode === "create" || mode === "edit") ? (
        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <h2 className="text-lg font-semibold">
            {mode === "create" ? "Créer une annonce" : `Modifier l’annonce #${editing?.id}`}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Titre *</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre (3..120)"
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type *</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as AdType)}
              >
                <option value="service">service</option>
                <option value="product">product</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prix (optionnel)</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="ex: 150"
                inputMode="decimal"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Localisation (optionnel)</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ville / quartier…"
                maxLength={120}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Image URL (optionnel)</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
              />
              {preview ? (
                <div className="mt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="preview"
                    className="w-64 h-40 object-cover rounded-xl border"
                  />
                </div>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Description (optionnel)</label>
              <textarea
                className="w-full border rounded-lg p-3 text-sm"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                placeholder="Max 2000 caractères"
              />
              <div className="text-[11px] text-gray-500">{description.length}/2000</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
              onClick={cancelForm}
              disabled={saving}
            >
              Annuler
            </button>

            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm bg-black text-white hover:opacity-90"
              onClick={submit}
              disabled={saving}
            >
              {saving ? "Enregistrement…" : mode === "create" ? "Créer" : "Enregistrer"}
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
