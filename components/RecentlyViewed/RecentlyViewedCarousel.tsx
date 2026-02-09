"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type RecentlyViewedItem = {
  type: "worker" | "company";
  id: number;
  title: string;
  sectorName?: string | null;
  cityName?: string | null;
  coverUrl?: string | null;
  trustBadge?: boolean | null;
  viewedAt: number;
};

const LS_KEY = "bricol_recently_viewed_profiles_v1";
const LS_LIMIT = 20;

const i18n = {
  fr: {
    title: "Récemment consultés",
    left: "Défiler à gauche",
    right: "Défiler à droite",
    prev: "Précédent",
    next: "Suivant",
    noImage: "Pas d’image",
    worker: "Ouvrier",
    company: "Entreprise",
    dash: "—",
    hint: "Historique enregistré sur cet appareil (20 max).",
    trust: "Badge confiance",
  },
  ar: {
    title: "تمت مشاهدته مؤخرًا",
    left: "تمرير لليسار",
    right: "تمرير لليمين",
    prev: "السابق",
    next: "التالي",
    noImage: "لا توجد صورة",
    worker: "عامل",
    company: "شركة",
    dash: "—",
    hint: "السجل محفوظ على هذا الجهاز (20 كحد أقصى).",
    trust: "شارة الثقة",
  },
} as const;

function safeParse(raw: string | null): RecentlyViewedItem[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return v
      .filter(
        (x) =>
          x &&
          (x.type === "worker" || x.type === "company") &&
          Number.isFinite(Number(x.id)) &&
          typeof x.title === "string"
      )
      .slice(0, LS_LIMIT);
  } catch {
    return [];
  }
}

function hrefOf(base: string, item: RecentlyViewedItem) {
  return item.type === "worker" ? `${base}/worker/${item.id}` : `${base}/company/${item.id}`;
}

export default function RecentlyViewedCarousel() {
  const pathname = usePathname() || "/fr";
  const lang = pathname.split("/")[1] === "ar" ? "ar" : "fr";
  const t = lang === "ar" ? i18n.ar : i18n.fr;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const base = `/${lang}`;

  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY);
    setItems(safeParse(raw));
  }, []);

  const show = useMemo(() => items.slice(0, LS_LIMIT), [items]);
  if (show.length === 0) return null;

  function scrollByCards(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.max(320, Math.floor(el.clientWidth * 0.75));
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  return (
    <section className="space-y-3" dir={dir}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t.title}</h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            className="h-9 w-9 rounded-lg border bg-white hover:bg-gray-50"
            aria-label={t.left}
            title={t.prev}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            className="h-9 w-9 rounded-lg border bg-white hover:bg-gray-50"
            aria-label={t.right}
            title={t.next}
          >
            ›
          </button>
        </div>
      </div>

      <div ref={scrollerRef} className="flex gap-4 overflow-x-auto pb-2" style={{ scrollBehavior: "smooth" }}>
        {show.map((it) => {
          const badgeLabel = it.type === "worker" ? t.worker : t.company;
          const showTrust = it.type === "worker" && it.trustBadge === true;

          return (
            <Link key={`${it.type}-${it.id}`} href={hrefOf(base, it)} className="group shrink-0">
              <div className="w-[240px] sm:w-[260px] md:w-[280px] rounded-2xl border bg-white overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative h-[140px] bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {it.coverUrl ? (
                    <img src={it.coverUrl} alt={it.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-sm text-gray-500">
                      {t.noImage}
                    </div>
                  )}

                  <div className="absolute top-2 left-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-black/70 text-white">
                      {badgeLabel}
                    </span>
                  </div>
                </div>

                <div className="p-3 space-y-1">
                  <div className="font-semibold leading-snug line-clamp-2 group-hover:underline">
                    {it.title}
                  </div>

                  <div className="text-sm text-gray-700 line-clamp-1">
                    {it.sectorName ? it.sectorName : <span className="text-gray-400">{t.dash}</span>}
                  </div>

                  <div className="text-sm text-gray-700 line-clamp-1">
                    {it.cityName ? it.cityName : <span className="text-gray-400">{t.dash}</span>}
                  </div>

                  {showTrust ? (
                    <div className="text-xs opacity-80">{t.trust}</div>
                  ) : null}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-gray-500">{t.hint}</p>
    </section>
  );
}
