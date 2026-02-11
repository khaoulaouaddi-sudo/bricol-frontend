"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

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

// ✅ cohérent avec le code qui écrit l’historique (LS_LIMIT = 20)
const LS_LIMIT = 20;

const i18n = {
  fr: {
    title: "Historique",
    filterAll: "Tous",
    filterWorker: "Ouvriers",
    filterCompany: "Entreprises",
    clear: "Vider l’historique",
    emptyRecent: "Aucun profil consulté récemment.",
    backHome: "Revenir à l’accueil",
    viewed: "Consulté",
    worker: "Ouvrier",
    company: "Entreprise",

    myReviews: "Mes avis",
    loginToSee: "Se connecter pour voir mes avis",
    loginHint: "Connectez-vous pour voir, modifier et supprimer vos avis.",
    refresh: "Actualiser",
    loading: "Chargement…",
    loadFail: "Impossible de charger vos avis.",
    none: "Vous n’avez pas encore laissé d’avis.",
    updatedAt: "Mis à jour",
    edit: "Modifier",
    del: "Supprimer",
    delConfirm: "Supprimer cet avis ?",
    rating: "Note",
    comment: "Commentaire",
    commentPh: "(Optionnel) Écrivez votre commentaire…",
    emptyComment: "Commentaire vide",
    cancel: "Annuler",
    save: "Enregistrer",
    saving: "Enregistrement…",
    deleting: "Suppression…",
    saveFail: "Impossible d’enregistrer la modification.",
    deleteFail: "Impossible de supprimer l’avis.",
  },
  ar: {
    title: "السجل",
    filterAll: "الكل",
    filterWorker: "العمال",
    filterCompany: "الشركات",
    clear: "مسح السجل",
    emptyRecent: "لا توجد ملفات تمت زيارتها مؤخرًا.",
    backHome: "العودة إلى الرئيسية",
    viewed: "تمت الزيارة",
    worker: "عامل",
    company: "شركة",

    myReviews: "تقييماتي",
    loginToSee: "سجّل الدخول لعرض تقييماتي",
    loginHint: "سجّل الدخول لعرض وتعديل وحذف تقييماتك.",
    refresh: "تحديث",
    loading: "جار التحميل…",
    loadFail: "تعذر تحميل تقييماتك.",
    none: "لم تقم بإضافة أي تقييم بعد.",
    updatedAt: "آخر تحديث",
    edit: "تعديل",
    del: "حذف",
    delConfirm: "هل تريد حذف هذا التقييم؟",
    rating: "التنقيط",
    comment: "التعليق",
    commentPh: "(اختياري) اكتب تعليقك…",
    emptyComment: "بدون تعليق",
    cancel: "إلغاء",
    save: "حفظ",
    saving: "جار الحفظ…",
    deleting: "جار الحذف…",
    saveFail: "تعذر حفظ التعديل.",
    deleteFail: "تعذر حذف التقييم.",
  },
} as const;

function loadRecentlyViewed(lsKey: string): RecentlyViewedItem[] {
  try {
    const raw = localStorage.getItem(lsKey);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];

    const cleaned: RecentlyViewedItem[] = arr
      .filter(
        (x: any) =>
          x &&
          (x.type === "worker" || x.type === "company") &&
          Number.isFinite(Number(x.id))
      )
      .map((x: any) => {
        const viewedAtNum = Number(x.viewedAt);
        return {
          type: x.type,
          id: Number(x.id),
          title:
            typeof x.title === "string" && x.title.trim()
              ? x.title.trim()
              : `#${x.id}`,
          sectorName:
            typeof x.sectorName === "string" ? x.sectorName : x.sectorName ?? null,
          cityName:
            typeof x.cityName === "string" ? x.cityName : x.cityName ?? null,
          coverUrl:
            typeof x.coverUrl === "string" ? x.coverUrl : x.coverUrl ?? null,
          viewedAt: Number.isFinite(viewedAtNum) ? viewedAtNum : Date.now(),
        };
      })
      .slice(0, LS_LIMIT);

    // Robustesse : tri descendant
    cleaned.sort((a, b) => (b.viewedAt || 0) - (a.viewedAt || 0));
    return cleaned;
  } catch {
    return [];
  }
}

function hrefFor(base: string, item: { type: "worker" | "company"; id: number }) {
  return item.type === "worker"
    ? `${base}/worker/${item.id}`
    : `${base}/company/${item.id}`;
}

function fmtDate(d: string, locale: string) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleString(locale);
}

export default function HistoryPage() {
  const { user } = useAuth();

  const pathname = usePathname() || "/fr";
  const lang = pathname.split("/")[1] === "ar" ? "ar" : "fr";
  const t = lang === "ar" ? i18n.ar : i18n.fr;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const locale = lang === "ar" ? "ar-MA" : "fr-FR";
  const base = `/${lang}`;

  // ✅ clé locale par langue (évite mélange FR/AR)
  const LS_KEY = `bricol_recently_viewed_profiles_${lang}_v1`;

  const [recent, setRecent] = useState<RecentlyViewedItem[]>([]);
  const [filter, setFilter] = useState<"all" | "worker" | "company">("all");

  const [reviews, setReviews] = useState<MyReviewItem[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [errReviews, setErrReviews] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editComment, setEditComment] = useState<string>("");

  const [busyAction, setBusyAction] = useState<null | "save" | "delete">(null);

  useEffect(() => {
    setRecent(loadRecentlyViewed(LS_KEY));
  }, [LS_KEY]);

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
        params: { limit: 100, offset: 0, lang },
      });

      const items = Array.isArray((data as any)?.items) ? (data as any).items : [];
      setReviews(items);
    } catch (e: any) {
      setErrReviews(e?.response?.data?.msg || t.loadFail);
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
      setEditingId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, lang]);

  function clearHistory() {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
    setRecent([]);
  }

  function startEdit(r: MyReviewItem) {
    if (busyAction) return;
    setEditingId(r.id);
    setEditRating(r.rating ?? 5);
    setEditComment(r.comment ?? "");
    setErrReviews(null);
  }

  function cancelEdit() {
    if (busyAction) return;
    setEditingId(null);
    setEditRating(5);
    setEditComment("");
  }

  async function saveEdit() {
    if (!editingId || busyAction) return;

    const rating = Math.min(Math.max(Number(editRating) || 5, 1), 5);
    const comment = (editComment ?? "").slice(0, 2000);

    try {
      setBusyAction("save");
      setErrReviews(null);
      await api.put(`/reviews/${editingId}`, { rating, comment });
      await refreshMyReviews();
      cancelEdit();
    } catch (e: any) {
      setErrReviews(e?.response?.data?.msg || t.saveFail);
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteReview(id: number) {
    if (busyAction) return;
    const ok = confirm(t.delConfirm);
    if (!ok) return;

    try {
      setBusyAction("delete");
      setErrReviews(null);
      await api.delete(`/reviews/${id}`);
      await refreshMyReviews();
      if (editingId === id) cancelEdit();
    } catch (e: any) {
      setErrReviews(e?.response?.data?.msg || t.deleteFail);
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main dir={dir} className="max-w-6xl mx-auto px-4 py-6 space-y-8">
      <section className="rounded-2xl border bg-white p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-xl font-semibold">{t.title}</h1>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              className="border rounded-lg px-3 py-2 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <option value="all">{t.filterAll}</option>
              <option value="worker">{t.filterWorker}</option>
              <option value="company">{t.filterCompany}</option>
            </select>

            <button
              onClick={clearHistory}
              className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
              type="button"
            >
              {t.clear}
            </button>
          </div>
        </div>

        {!filteredRecent.length ? (
          <div className="text-sm text-gray-600">
            {t.emptyRecent}{" "}
            <Link href={base} className="text-blue-600 underline">
              {t.backHome}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredRecent.map((it) => (
              <Link
                key={`${it.type}-${it.id}`}
                href={hrefFor(base, it)}
                className="rounded-xl border p-3 hover:bg-gray-50 transition flex gap-3"
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {it.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.coverUrl}
                      alt={it.title}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{it.title}</div>
                  <div className="text-xs text-gray-600 truncate">
                    {(it.sectorName || "").trim()}
                    {it.cityName ? ` · ${it.cityName}` : ""}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {(it.type === "worker" ? t.worker : t.company)} ·{" "}
                    {new Date(it.viewedAt).toLocaleString(locale)}
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
          <h2 className="text-lg font-semibold">{t.myReviews}</h2>

          {!user ? (
            <Link
              href={`${base}/login?next=${encodeURIComponent(`${base}/history`)}`}
              className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
            >
              {t.loginToSee}
            </Link>
          ) : (
            <button
              type="button"
              onClick={refreshMyReviews}
              disabled={loadingReviews || !!busyAction}
              className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              {t.refresh}
            </button>
          )}
        </div>

        {!user ? (
          <div className="text-sm text-gray-600">{t.loginHint}</div>
        ) : loadingReviews ? (
          <div className="text-sm text-gray-600">{t.loading}</div>
        ) : errReviews ? (
          <div className="text-sm text-red-600">{errReviews}</div>
        ) : !reviews.length ? (
          <div className="text-sm text-gray-600">{t.none}</div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => {
              const targetHref =
                r.target_type === "worker"
                  ? `${base}/worker/${r.target_profile_id}`
                  : `${base}/company/${r.target_profile_id}`;

              const isEditing = editingId === r.id;

              return (
                <div key={r.id} className="rounded-xl border p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <Link href={targetHref} className="font-semibold hover:underline">
                        {r.target_name || (r.target_type === "worker" ? t.worker : t.company)}
                      </Link>
                      <div className="text-xs text-gray-600">
                        {r.target_type === "worker" ? t.worker : t.company}
                        {r.sector_name ? ` · ${r.sector_name}` : ""}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {t.updatedAt}: {fmtDate(r.updated_at || r.created_at, locale)}
                      </div>
                    </div>

                    {!isEditing ? (
                      <div className="flex items-center gap-2">
                        <button
                          className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                          onClick={() => startEdit(r)}
                          type="button"
                          disabled={!!busyAction}
                        >
                          {t.edit}
                        </button>
                        <button
                          className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 text-red-600 disabled:opacity-60"
                          onClick={() => deleteReview(r.id)}
                          type="button"
                          disabled={!!busyAction}
                        >
                          {busyAction === "delete" && editingId === r.id ? t.deleting : t.del}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {!isEditing ? (
                    <>
                      <div className="text-sm">
                        ⭐ <span className="font-semibold">{r.rating}</span>/5
                      </div>
                      {r.comment ? (
                        <div className="text-sm text-gray-700 whitespace-pre-line">{r.comment}</div>
                      ) : (
                        <div className="text-sm text-gray-500 italic">{t.emptyComment}</div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">{t.rating}</label>
                        <select
                          className="border rounded-lg px-3 py-2 text-sm"
                          value={editRating}
                          onChange={(e) => setEditRating(Number(e.target.value))}
                          disabled={busyAction === "save"}
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium">{t.comment}</label>
                        <textarea
                          className="w-full border rounded-lg p-3 text-sm"
                          rows={4}
                          maxLength={2000}
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          placeholder={t.commentPh}
                          disabled={busyAction === "save"}
                        />
                        <div className="text-[11px] text-gray-500">{editComment.length}/2000</div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                          onClick={cancelEdit}
                          type="button"
                          disabled={busyAction === "save"}
                        >
                          {t.cancel}
                        </button>
                        <button
                          className="rounded-lg px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                          onClick={saveEdit}
                          type="button"
                          disabled={busyAction === "save"}
                        >
                          {busyAction === "save" ? t.saving : t.save}
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
