"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useLang } from "@/components/LangProvider";

type Item = {
  profile_type: "worker" | "company";
  profile_id: number;
  title_or_name: string;

  cover_url?: string | null;

  reviews_avg?: number | null;
  reviews_count?: number;

  // ✅ Compat + AR + display (optionnels)
  city?: {
    id: number;
    slug: string;
    name_fr?: string;
    name?: string;
    name_ar?: string;
    display_name?: string | null;
  };
  sector?: {
    id: number;
    slug: string;
    name?: string;
    name_fr?: string;
    name_ar?: string;
    display_name?: string | null;
    display_label?: string | null;
  };
  umbrella?: {
    slug: string;
    name?: string;
    name_fr?: string;
    name_ar?: string;
    display_name?: string | null;
  } | null;

  badges?: { verification_status?: string | null; trust_badge?: boolean | null } | null;

  description?: string | null;
  created_at?: string;
};

type SearchResponse = {
  items: Item[];
  meta: { page: number; limit: number; total: number; has_more: boolean };
};

const i18n = {
  fr: {
    results: "Résultats",
    all: "Tous",
    company: "Entreprise",
    worker: "Ouvrier",
    loading: "Chargement…",
    noResults: "Aucun résultat pour ces filtres.",
    prev: "Précédent",
    next: "Suivant",
    other: "Autres",
    reviews: "avis",
    trust: "Badge confiance",
    page: "Page",
    result: "résultat",
    resultsWord: "résultats",
    dash: "—",
    ariaStars: (v: number) => `Note ${v} sur 5`,
  },
  ar: {
    results: "النتائج",
    all: "الكل",
    company: "شركة",
    worker: "عامل",
    loading: "جار التحميل…",
    noResults: "لا توجد نتائج لهذه المعايير.",
    prev: "السابق",
    next: "التالي",
    other: "أخرى",
    reviews: "تقييم",
    trust: "شارة الثقة",
    page: "الصفحة",
    result: "نتيجة",
    resultsWord: "نتائج",
    dash: "—",
    ariaStars: (v: number) => `التقييم ${v} من 5`,
  },
} as const;

function clampText(s: string, max = 110) {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

function Stars({ value, ariaLabel }: { value: number; ariaLabel: string }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5" aria-label={ariaLabel}>
      {Array.from({ length: full }).map((_, i) => (
        <span key={`f-${i}`} className="text-yellow-500">
          ★
        </span>
      ))}
      {half ? <span className="text-yellow-500">☆</span> : null}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e-${i}`} className="text-gray-300">
          ★
        </span>
      ))}
    </div>
  );
}

function ResultPhoto({ title, coverUrl }: { title: string; coverUrl?: string | null }) {
  const PLACEHOLDER = "/Portrait_Placeholder.png";

  const [src, setSrc] = useState<string | null>(coverUrl || PLACEHOLDER);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(false);
    setSrc(coverUrl || PLACEHOLDER);
  }, [coverUrl]);

  if (hidden || !src) return null;

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={title}
      className="h-full w-full object-cover"
      loading="lazy"
      onError={() => {
        if (src !== PLACEHOLDER) {
          setSrc(PLACEHOLDER);
          return;
        }
        setHidden(true);
      }}
    />
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-4 py-2 rounded-xl border text-sm transition",
        active ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function Pagination({
  page,
  totalPages,
  onGo,
  prevLabel,
  nextLabel,
}: {
  page: number;
  totalPages: number;
  onGo: (p: number) => void;
  prevLabel: string;
  nextLabel: string;
}) {
  if (totalPages <= 1) return null;

  const safeGo = (p: number) => {
    const next = Math.max(1, Math.min(totalPages, p));
    if (next !== page) onGo(next);
  };

  const windowSize = 7;
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, page - half);
  let end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  const pages = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-6">
      <button
        type="button"
        className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm disabled:opacity-50"
        onClick={() => safeGo(page - 1)}
        disabled={page <= 1}
      >
        {prevLabel}
      </button>

      {start > 1 ? (
        <>
          <button
            type="button"
            className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm"
            onClick={() => safeGo(1)}
          >
            1
          </button>
          {start > 2 ? <span className="px-2 opacity-60">…</span> : null}
        </>
      ) : null}

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          className={[
            "px-3 py-2 rounded-xl border text-sm",
            p === page ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50",
          ].join(" ")}
          onClick={() => safeGo(p)}
        >
          {p}
        </button>
      ))}

      {end < totalPages ? (
        <>
          {end < totalPages - 1 ? <span className="px-2 opacity-60">…</span> : null}
          <button
            type="button"
            className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm"
            onClick={() => safeGo(totalPages)}
          >
            {totalPages}
          </button>
        </>
      ) : null}

      <button
        type="button"
        className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm disabled:opacity-50"
        onClick={() => safeGo(page + 1)}
        disabled={page >= totalPages}
      >
        {nextLabel}
      </button>
    </div>
  );
}

// Helpers labels — utilisent display_* si backend (lang=) les fournit
function labelCity(it: Item) {
  const c = it.city;
  return c ? c.display_name ?? c.name_ar ?? c.name_fr ?? c.name ?? c.slug : "";
}
function labelSector(it: Item) {
  const s = it.sector;
  return s
    ? s.display_label ??
        s.display_name ??
        s.name_ar ??
        s.name_fr ??
        s.name ??
        s.slug
    : "";
}
function labelUmbrella(it: Item, fallbackOther: string) {
  const u = it.umbrella;
  return u ? u.display_name ?? u.name_ar ?? u.name_fr ?? u.name ?? fallbackOther : fallbackOther;
}

export default function ResultsClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { lang } = useLang();
  const base = `/${lang}`;

  const t = lang === "ar" ? i18n.ar : i18n.fr;

  const city = params.get("city") || "";
  const sector = params.get("sector") || "";
  const umbrella = params.get("umbrella") || "";
  const type = params.get("type") || ""; // "" | "company" | "worker"
  const pageParam = Number(params.get("page") || "1");

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (city) sp.set("city", city);
    if (sector) sp.set("sector", sector);
    if (umbrella) sp.set("umbrella", umbrella);
    if (type) sp.set("type", type);
    sp.set("page", String(pageParam));
    sp.set("limit", "20");

    // ✅ crucial : demander au backend les display_* selon langue
    sp.set("lang", lang);

    return sp.toString();
  }, [city, sector, umbrella, type, pageParam, lang]);

  useEffect(() => {
    let alive = true;
    setLoading(true);

    api
      .get(`/search?${query}`)
      .then((res) => {
        if (!alive) return;
        setData(res.data);
      })
      .catch((err) => {
        console.error("GET /search failed", err);
        if (!alive) return;
        setData({ items: [], meta: { page: 1, limit: 20, total: 0, has_more: false } });
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [query]);

  const meta = data?.meta;
  const totalPages = meta ? Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 20))) : 1;

  const setQueryParams = (patch: Record<string, string | null>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") sp.delete(k);
      else sp.set(k, v);
    }

    // ✅ IMPORTANT : conserver la langue dans l'URL
    router.push(`${base}/results?${sp.toString()}`);
  };

  const onTab = (nextType: "" | "company" | "worker") => {
    setQueryParams({ type: nextType || null, page: "1" });
  };

  const onGoPage = (p: number) => {
    setQueryParams({ page: String(p) });
  };

  const dir = lang === "ar" ? "rtl" : "ltr";
  const total = data?.meta?.total ?? 0;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-4" dir={dir}>
      {/* ✅ Sticky header (titre + onglets + résumé) */}
      <div className="sticky top-0 z-20 -mx-3 sm:-mx-6 px-3 sm:px-6 py-3 bg-white/90 backdrop-blur border-b">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-semibold">{t.results}</h1>

          <div className="flex items-center gap-2">
            <TabButton active={!type} label={t.all} onClick={() => onTab("")} />
            <TabButton active={type === "company"} label={t.company} onClick={() => onTab("company")} />
            <TabButton active={type === "worker"} label={t.worker} onClick={() => onTab("worker")} />
          </div>
        </div>

        {data?.meta ? (
          <div className="text-sm opacity-70 mt-2">
            {total} {total === 1 ? t.result : t.resultsWord} • {t.page} {data.meta.page} / {totalPages}
          </div>
        ) : null}
      </div>

      {loading && <div className="p-4 rounded-xl border bg-white">{t.loading}</div>}

      {!loading && data && (
        <>
          {data.items.length === 0 && (
            <div className="rounded-2xl border bg-white p-6 text-sm opacity-80">{t.noResults}</div>
          )}

          {data.items.length > 0 && (
            <div className="grid grid-cols-1 gap-4">
              {data.items.map((it) => {
                const href =
                  it.profile_type === "worker"
                    ? `${base}/worker/${it.profile_id}`
                    : `${base}/company/${it.profile_id}`;

                const cityLabel = labelCity(it);
                const sectorLabel = labelSector(it);
                const umbrellaLabel = labelUmbrella(it, t.other);
                const desc = it.description ? clampText(it.description, 220) : "";

                const avg = it.reviews_avg ?? null;
                const count = Number(it.reviews_count ?? 0);

                return (
                  <Link
                    href={href}
                    key={`${it.profile_type}-${it.profile_id}`}
                    className="block rounded-2xl border bg-white hover:shadow-sm transition-shadow overflow-hidden"
                  >
                    <div className="flex gap-4 p-4">
                      <div className="h-20 w-24 sm:h-24 sm:w-32 rounded-xl border bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                        <ResultPhoto title={it.title_or_name} coverUrl={it.cover_url} />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="text-xs opacity-60">{umbrellaLabel}</div>

                        <div className="font-semibold text-base sm:text-lg leading-snug line-clamp-1">
                          {it.title_or_name}
                        </div>

                        <div className="text-sm opacity-80 line-clamp-1">
                          {sectorLabel ? sectorLabel : <span className="opacity-60">{t.dash}</span>}
                          {cityLabel ? ` • ${cityLabel}` : ""}
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          {avg === null ? (
                            <span className="opacity-60">{t.dash}</span>
                          ) : (
                            <>
                              <span className="font-medium">{avg.toFixed(1)}</span>
                              <Stars value={avg} ariaLabel={t.ariaStars(Number(avg.toFixed(1)))} />
                            </>
                          )}
                          <span className="opacity-60">
                            ({count} {t.reviews})
                          </span>
                        </div>

                        {desc ? <div className="text-sm text-gray-700 line-clamp-2">{desc}</div> : null}

                        {it.profile_type === "worker" && it.badges?.trust_badge ? (
                        <div className="text-xs mt-1 opacity-70">{t.trust}</div>
                         ) : null}
                      </div>

                      <div className="text-gray-400 self-center text-xl">›</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {data?.meta ? (
            <Pagination
              page={data.meta.page}
              totalPages={totalPages}
              onGo={onGoPage}
              prevLabel={t.prev}
              nextLabel={t.next}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
