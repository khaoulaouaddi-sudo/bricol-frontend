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

    // ✅ AJOUT ESSENTIEL (contact + titres blocs)
    contact: "Contact",
    phone: "Téléphone",
    email: "Email",
    website: "Site web",
    description: "Description",
  },
  ar: {
    loading: "جار التحميل…",
    backHome: "العودة للرئيسية",
    photos: "الصور",
    noPhotos: "لا توجد صور.",
    cover: "صورة الغلاف",
    photoAlt: "صورة",
    companyFallback: (id: number) => `شركة #${id}`,

    // ✅ AJOUT ESSENTIEL (contact + titres blocs)
    contact: "معلومات التواصل",
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    website: "الموقع",
    description: "الوصف",
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

  // on garde title/address pour ne pas casser si jamais ça arrive du backend,
  // mais on ne les utilise plus dans l’affichage
  title?: string | null;
  address?: string | null;

  description?: string | null;
  location?: string | null;

  // ✅ AJOUT ESSENTIEL: champs contact (déjà en DB/backend)
  phone?: string | null;
  email?: string | null;
  website?: string | null;

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

const LS_LIMIT = 20;
function safeNumber(v: any) {
  if (Array.isArray(v)) v = v[0];
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}
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

// ✅ ESSENTIEL: LS_KEY passé en paramètre
function upsertRecentlyViewed(lsKey: string, item: RecentlyViewedItem) {
  try {
    const raw = localStorage.getItem(lsKey);
    const prev: RecentlyViewedItem[] = raw ? JSON.parse(raw) : [];

    const next = [
      item,
      ...(Array.isArray(prev) ? prev.filter((x) => !(x.type === item.type && x.id === item.id)) : []),
    ].slice(0, LS_LIMIT);

    localStorage.setItem(lsKey, JSON.stringify(next));
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

function normalizeWebsite(url: string) {
  const u = url.trim();
  if (!u) return "";
  return u.startsWith("http://") || u.startsWith("https://") ? u : `https://${u}`;
}

export default function CompanyPublicPage() {
  const params = useParams();
  const companyId = useMemo(() => safeNumber((params as any)?.id), [params]);

  const { lang } = useLang();
  const { user, loading: authLoading } = useAuth();
  const t = lang === "ar" ? i18n.ar : i18n.fr;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const base = `/${lang}`;

  // ✅ ESSENTIEL: LS_KEY calculé ici
  const LS_KEY = `bricol_recently_viewed_profiles_${lang}_v1`;

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [photos, setPhotos] = useState<CompanyPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    // ✅ évite /company-profiles/NaN et donne une erreur propre
    if (!companyId || Number.isNaN(companyId)) {
      setError(lang === "ar" ? "معرّف غير صالح" : "Identifiant invalide");
      setLoading(false);
      return () => {
        alive = false;
      };
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // ✅ ESSENTIEL: cohérence i18n (comme worker)
        const p: CompanyProfile = await api
          .get(`/company-profiles/${companyId}`, { params: { lang } })
          .then((r) => r.data);

        if (!alive) return;

        setProfile(p);

        const mergedPhotosRaw = Array.isArray(p?.photos) ? (p.photos as CompanyPhoto[]) : [];
        const mergedPhotos = sortCoverFirst(mergedPhotosRaw);
        setPhotos(mergedPhotos);

        // ✅ ESSENTIEL: titre public = name (on ne dépend plus de title)
        const title = (p?.name ?? "").trim() || t.companyFallback(companyId);

        const cityName = labelCity(p?.city ?? null, lang);
        const coverUrl = pickCover(mergedPhotos);

        const sectorLabels = labelSectors(p?.sectors ?? null);

        // ✅ ESSENTIEL: écrire dans la clé de la langue
        upsertRecentlyViewed(LS_KEY, {
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
  }, [companyId, lang, LS_KEY]);

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
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        <div className="mt-4">
          <Link className="underline" href={base}>
            {t.backHome}
          </Link>
        </div>
      </main>
    );
  }

  // ✅ ESSENTIEL: titre public = name (on ne dépend plus de title)
  const title = (profile?.name ?? "").trim() || t.companyFallback(companyId);
  const cityName = labelCity(profile?.city ?? null, lang);

  // ✅ ESSENTIEL: cover en grand + autres photos dessous
  const coverPhoto = photos.find((p) => p.is_cover) ?? photos[0] ?? null;
  const otherPhotos = photos.filter((p) => !coverPhoto || p.id !== coverPhoto.id);

  const hasContact =
    Boolean(profile?.phone?.trim()) || Boolean(profile?.email?.trim()) || Boolean(profile?.website?.trim());

  return (
    <main dir={dir} className="mx-auto max-w-5xl p-4">
      {/* Header: titre + secteurs + ville/location */}
      <section className="rounded-2xl border p-5">
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {profile?.user_photo ? (
            <img src={profile.user_photo} alt={title} className="h-14 w-14 rounded-full object-cover border" />
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
          {profile?.location && <span>• {profile.location}</span>}
        </div>
      </section>

      {/* ✅ PHOTOS: cover grande + galerie dessous avec caption */}
      <section className="mt-6 rounded-2xl border p-5">
        <h2 className="text-lg font-semibold">{t.photos}</h2>

        {photos.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">{t.noPhotos}</p>
        ) : (
          <>
            {/* Cover en grand */}
            {coverPhoto ? (
              <div className="mt-3 overflow-hidden rounded-2xl border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverPhoto.image_url}
                  alt={coverPhoto.caption ?? t.photoAlt}
                  className="h-64 w-full object-cover md:h-80"
                />
                <div className="p-3 flex items-start justify-between gap-3">
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">
                    {coverPhoto.caption ? coverPhoto.caption : ""}
                  </div>
                  <span className="shrink-0 text-[11px] rounded-full bg-black text-white px-2 py-0.5">
                    {t.cover}
                  </span>
                </div>
              </div>
            ) : null}

            {/* Autres photos juste dessous + description */}
            {otherPhotos.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                {otherPhotos.map((p) => (
                  <div key={p.id} className="overflow-hidden rounded-xl border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image_url} alt={p.caption ?? t.photoAlt} className="h-44 w-full object-cover" />
                    <div className="p-2">
                      <div className="text-xs text-gray-700 whitespace-pre-wrap">
                        {p.caption ? p.caption : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* ✅ Description déplacée sous les photos */}
      {profile?.description ? (
        <section className="mt-6 rounded-2xl border p-5">
          <h2 className="text-lg font-semibold">{t.description}</h2>
          <p className="mt-2 whitespace-pre-wrap text-gray-800">{profile.description}</p>
        </section>
      ) : null}

      {/* ✅ Contact ajouté (sans toucher au backend) */}
      {hasContact ? (
        <section className="mt-6 rounded-2xl border p-5">
          <h2 className="text-lg font-semibold">{t.contact}</h2>

          <div className="mt-3 space-y-2 text-sm text-gray-800">
            {profile?.phone?.trim() ? (
              <div>
                <span className="font-medium">{t.phone}: </span>
                <a className="underline" href={`tel:${profile.phone}`}>
                  {profile.phone}
                </a>
              </div>
            ) : null}

            {profile?.email?.trim() ? (
              <div>
                <span className="font-medium">{t.email}: </span>
                <a className="underline" href={`mailto:${profile.email}`}>
                  {profile.email}
                </a>
              </div>
            ) : null}

            {profile?.website?.trim() ? (
              <div>
                <span className="font-medium">{t.website}: </span>
                <a className="underline" href={normalizeWebsite(profile.website)} target="_blank" rel="noreferrer">
                  {profile.website}
                </a>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Reviews inchangés */}
      <ReviewsSection
        targetType="company"
        targetProfileId={companyId}
        mode={!authLoading && user && profile?.user_id === user.id ? "owner" : "public"}
      />
    </main>
  );
}
