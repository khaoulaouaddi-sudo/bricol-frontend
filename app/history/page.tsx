"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import api from "@/lib/api";

type RecentlyViewedItem = {
  type: "worker" | "company";
  id: number;
  title: string;
  sectorName?: string | null;
  cityName?: string | null;
  coverUrl?: string | null;
  viewedAt: number;
};

type MyReviewItem = {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  target_type: "worker" | "company";
  target_profile_id: number;
  target_name: string | null;
  sector_name: string | null;
  sector_slug: string | null;
  cover_url: string | null;
};

const LS_KEY = "bricol_recently_viewed_profiles_v1";
const LS_LIMIT = 50;

function loadRecentlyViewed(): RecentlyViewedItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && (x.type === "worker" || x.type === "company") && Number.isFinite(Number(x.id)))
      .slice(0, LS_LIMIT);
  } catch {
    return [];
  }
}

function hrefFor(item: { type: "worker" | "company"; id: number }) {
  return item.type === "worker" ? `/worker/${item.id}` : `/company/${item.id}`;
}

function fmtDate(d: string) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleString();
}

export default function HistoryPage() {
  const { user } = useAuth();

  const [recent, setRecent] = useState<RecentlyViewedItem[]>([]);
  const [filter, setFilter] = useState<"all" | "worker" | "company">("all");

  const [reviews, setReviews] = useState<MyReviewItem[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [errReviews, setErrReviews] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editComment, setEditComment] = useState<string>("");

  useEffect(() => {
    setRecent(loadRecentlyViewed());
  }, []);

  const filteredRecent = useMemo(() => {
    if (filter === "all") return recent;
    return recent.filter((x) => x.type === filter);
  }, [recent, filter]);

  async function refreshMyReviews() {
    if (!user) return;
    try {
      setLoadingReviews(true);
      setErrReviews(null);
      const { data } = await api.get<{ items: MyReviewItem[] }>("/reviews/mine", {
        params: { limit: 100, offset: 0 },
      });
      setReviews(Array.isArray((data as any)?.items) ? (data as any).items : []);
    } catch (e: any) {
      setErrReviews(e?.response?.data?.msg || "Impossible de charger vos avis");
    } finally {
      setLoadingReviews(false);
    }
  }

  useEffect(() => {
    if (user) {
      refreshMyReviews();
    } else {
      setReviews([]);
      setErrReviews(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function clearHistory() {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
    setRecent([]);
  }

  function startEdit(r: MyReviewItem) {
    setEditingId(r.id);
    setEditRating(r.rating ?? 5);
    setEditComment(r.comment ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditRating(5);
    setEditComment("");
  }

  async function saveEdit() {
    if (!editingId) return;
    // rating 1..5, comment max 2000
    const rating = Math.min(Math.max(Number(editRating) || 5, 1), 5);
    const comment = (editComment ?? "").slice(0, 2000);

    await api.put(`/reviews/${editingId}`, { rating, comment });
    await refreshMyReviews();
    cancelEdit();
  }

  async function deleteReview(id: number) {
    if (!confirm("Supprimer cet avis ?")) return;
    await api.delete(`/reviews/${id}`);
    await refreshMyReviews();
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      <section className="rounded-2xl border bg-white p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-xl font-semibold">Historique</h1>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <option value="all">Tous</option>
              <option value="worker">Ouvriers</option>
              <option value="company">Entreprises</option>
            </select>

            <button
              onClick={clearHistory}
              className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
              type="button"
            >
              Vider l’historique
            </button>
          </div>
        </div>

        {!filteredRecent.length ? (
          <div className="text-sm text-gray-600">
            Aucun profil consulté récemment.{" "}
            <Link href="/" className="text-blue-600 underline">
              Revenir à l’accueil
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredRecent.map((it) => (
              <Link
                key={`${it.type}-${it.id}`}
                href={hrefFor(it)}
                className="rounded-xl border p-3 hover:bg-gray-50 transition flex gap-3"
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {it.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.coverUrl} alt={it.title} className="w-full h-full object-cover" />
                  ) : null}
                </div>

                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{it.title}</div>
                  <div className="text-xs text-gray-600 truncate">
                    {it.sectorName || ""}{it.cityName ? ` · ${it.cityName}` : ""}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {it.type === "worker" ? "Ouvrier" : "Entreprise"} · {new Date(it.viewedAt).toLocaleString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Avis */}
      <section className="rounded-2xl border bg-white p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-semibold">Mes avis</h2>

          {!user ? (
            <Link
              href="/login?next=%2Fhistory"
              className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
            >
              Se connecter pour voir mes avis
            </Link>
          ) : (
            <button
              type="button"
              onClick={refreshMyReviews}
              className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
            >
              Actualiser
            </button>
          )}
        </div>

        {!user ? (
          <div className="text-sm text-gray-600">
            Connectez-vous pour voir, modifier et supprimer vos avis.
          </div>
        ) : loadingReviews ? (
          <div className="text-sm text-gray-600">Chargement…</div>
        ) : errReviews ? (
          <div className="text-sm text-red-600">{errReviews}</div>
        ) : !reviews.length ? (
          <div className="text-sm text-gray-600">Vous n’avez pas encore laissé d’avis.</div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => {
              const targetHref =
                r.target_type === "worker"
                  ? `/worker/${r.target_profile_id}`
                  : `/company/${r.target_profile_id}`;

              const isEditing = editingId === r.id;

              return (
                <div key={r.id} className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <Link href={targetHref} className="font-semibold hover:underline">
                        {r.target_name || (r.target_type === "worker" ? "Ouvrier" : "Entreprise")}
                      </Link>
                      <div className="text-xs text-gray-600">
                        {r.target_type === "worker" ? "Ouvrier" : "Entreprise"}
                        {r.sector_name ? ` · ${r.sector_name}` : ""}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Mis à jour : {fmtDate(r.updated_at || r.created_at)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isEditing ? (
                        <>
                          <button
                            className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                            onClick={() => startEdit(r)}
                            type="button"
                          >
                            Modifier
                          </button>
                          <button
                            className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 text-red-600"
                            onClick={() => deleteReview(r.id)}
                            type="button"
                          >
                            Supprimer
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {!isEditing ? (
                    <>
                      <div className="text-sm">
                        ⭐ <span className="font-semibold">{r.rating}</span>/5
                      </div>
                      {r.comment ? (
                        <div className="text-sm text-gray-700 whitespace-pre-line">{r.comment}</div>
                      ) : (
                        <div className="text-sm text-gray-500 italic">Commentaire vide</div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Note</label>
                        <select
                          className="border rounded-lg px-3 py-2 text-sm"
                          value={editRating}
                          onChange={(e) => setEditRating(Number(e.target.value))}
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">Commentaire</label>
                        <textarea
                          className="w-full border rounded-lg p-3 text-sm"
                          rows={4}
                          maxLength={2000}
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          placeholder="(Optionnel) Écrivez votre commentaire…"
                        />
                        <div className="text-[11px] text-gray-500">
                          {editComment.length}/2000
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                          onClick={cancelEdit}
                          type="button"
                        >
                          Annuler
                        </button>
                        <button
                          className="rounded-lg px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700"
                          onClick={saveEdit}
                          type="button"
                        >
                          Enregistrer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
