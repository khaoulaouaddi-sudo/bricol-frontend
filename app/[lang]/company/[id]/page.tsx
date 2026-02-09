"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import ReviewsSection from "@/components/reviews/ReviewsSection";
import { useAuth } from "@/components/AuthProvider";
import { useLang } from "@/components/LangProvider";

const i18n = {
  fr: {
    loading: "Chargement…",
    backHome: "Retour accueil",
    photos: "Photos",
    noPhotos: "Aucune photo.",
    cover: "Couverture",
    photoAlt: "Photo",
    companyFallback: (id: number) => `Entreprise #${id}`,
  },
  ar: {
    loading: "جار التحميل…",
    backHome: "العودة للرئيسية",
    photos: "الصور",
    noPhotos: "لا توجد صور.",
    cover: "صورة الغلاف",
    photoAlt: "صورة",
    companyFallback: (id: number) => `شركة #${id}`,
  },
} as const;

type CompanyPhoto = {
  id: number;
  image_url: string;
  caption: string | null;
  is_cover: boolean;
};

type Sector = {
  id: number;
  slug?: string;
  name?: string | null;
  name_ar?: string | null;
  display_name?: string | null;
  display_label?: string | null;
};

type CompanyProfile = {
  id: number;
  user_id?: number | null;
  user_photo?: string | null;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  address?: string | null;
  location?: string | null;

  city_id?: number | null;
  city?: {
    id: number;
    slug?: string;
    name_fr?: string | null;
    name?: string | null;
    name_ar?: string | null;
    display_name?: string | null;
  } | null;

  sectors?: Sector[] | null;
  photos?: CompanyPhoto[] | null;
};

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

function sortCoverFirst(photos: CompanyPhoto[]) {
  const list = Array.isArray(photos) ? [...photos] : [];
  list.sort((a, b) => {
    const ac = a.is_cover ? 1 : 0;
    const bc = b.is_cover ? 1 : 0;
    return bc - ac;
  });
  return list;
}

function pickCover(photos: CompanyPhoto[]) {
  if (!photos?.length) return null;
  const cover = photos.find((p) => p.is_cover) ?? photos[0];
  return cover?.image_url ?? null;
}

function upsertRecentlyViewed(item: RecentlyViewedItem) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const prev: RecentlyViewedItem[] = raw ? JSON.parse(raw) : [];

    const next = [
      item,
      ...prev.filter((x) => !(x.type === item.type && x.id === item.id)),
    ].slice(0, LS_LIMIT);

    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {}
}

function labelSectors(sectors: Sector[] | null | undefined) {
  if (!sectors || sectors.length === 0) return null;
  return sectors
    .map((s) => s.display_label ?? s.display_name ?? s.name_ar ?? s.name ?? s.slug ?? "")
    .filter(Boolean);
}

function labelCity(city: CompanyProfile["city"], lang: "fr" | "ar") {
  if (!city) return null;
  return (
    city.display_name ??
    (lang === "ar" ? city.name_ar : city.name_fr) ??
    city.name_fr ??
    city.name ??
    city.slug ??
    null
  );
}

export default function CompanyPublicPage() {
  const params = useParams();
  const companyId = useMemo(() => Number(params?.id), [params]);

  const { lang } = useLang();
  const { user, loading: authLoading } = useAuth();
  const t = lang === "ar" ? i18n.ar : i18n.fr;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const base = `/${lang}`;

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [photos, setPhotos] = useState<CompanyPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const p: CompanyProfile = await api
          .get(`/company-profiles/${companyId}`)
          .then((r) => r.data);

        if (!alive) return;

        setProfile(p);

        const mergedPhotosRaw = Array.isArray(p?.photos) ? (p.photos as CompanyPhoto[]) : [];
        const mergedPhotos = sortCoverFirst(mergedPhotosRaw);
        setPhotos(mergedPhotos);

        const title =
          (p?.name ?? p?.title ?? "").trim() || t.companyFallback(companyId);

        const cityName = labelCity(p?.city ?? null, lang);
        const coverUrl = pickCover(mergedPhotos);

        const sectorLabels = labelSectors(p?.sectors ?? null);
        upsertRecentlyViewed({
          type: "company",
          id: companyId,
          title,
          cityName,
          sectorName: sectorLabels?.[0] ?? null,
          coverUrl,
          trustBadge: null,
          viewedAt: Date.now(),
        });
      } catch (e: any) {
        console.error(e);
        if (!alive) return;
        setError(e?.response?.data?.msg || String(e?.message || "Error"));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [companyId, lang, t]);

  if (loading) {
    return (
      <main dir={dir} className="mx-auto max-w-5xl p-4">
        <div className="rounded-xl border p-4">{t.loading}</div>
      </main>
    );
  }

  if (error) {
    return (
      <main dir={dir} className="mx-auto max-w-5xl p-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
        <div className="mt-4">
          <Link className="underline" href={base}>
            {t.backHome}
          </Link>
        </div>
      </main>
    );
  }

  const title =
    (profile?.name ?? profile?.title ?? "").trim() || t.companyFallback(companyId);

  const cityName = labelCity(profile?.city ?? null, lang);

  return (
    <main dir={dir} className="mx-auto max-w-5xl p-4">
      <section className="rounded-2xl border p-5">
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {profile?.user_photo ? (
            <img
              src={profile.user_photo}
              alt={title}
              className="h-14 w-14 rounded-full object-cover border"
            />
          ) : null}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold break-words">{title}</h1>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-700">
          {(() => {
            const labels = labelSectors(profile?.sectors ?? null);
            if (!labels || labels.length === 0) return null;
            return (
              <span className="inline-flex flex-wrap items-center gap-2">
                <span>•</span>
                {labels.map((lbl, idx) => (
                  <span key={idx} className="rounded-full border px-2 py-0.5 text-[12px]">
                    {lbl}
                  </span>
                ))}
              </span>
            );
          })()}

          {cityName && <span>📍 {cityName}</span>}
          {profile?.address && <span>• {profile.address}</span>}
          {profile?.location && <span>• {profile.location}</span>}
        </div>

        {profile?.description && (
          <p className="mt-3 whitespace-pre-wrap text-gray-800">
            {profile.description}
          </p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border p-5">
        <h2 className="text-lg font-semibold">{t.photos}</h2>

        {photos.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">{t.noPhotos}</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
            {photos.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-xl border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image_url}
                  alt={p.caption ?? t.photoAlt}
                  className="h-44 w-full object-cover"
                />
                <div className="p-2 flex items-center justify-between gap-2">
                  <div className="text-xs text-gray-600 line-clamp-1">
                    {p.caption || ""}
                  </div>
                  {p.is_cover ? (
                    <span className="text-[11px] rounded-full bg-black text-white px-2 py-0.5">
                      {t.cover}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Owner mode: lecture seule (évite l'auto-review UX) */}
      <ReviewsSection
        targetType="company"
        targetProfileId={companyId}
        mode={!authLoading && user && profile?.user_id === user.id ? "owner" : "public"}
      />
    </main>
  );
}
