"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
    photoAlt: "Photo",
    companyFallback: (id: number) => `Entreprise #${id}`,

    contact: "Contact",
    phone: "Téléphone",
    email: "Email",
    website: "Site web",
    description: "Description",

    // UI mobile
    showMore: "Voir plus",
    showLess: "Voir moins",
    readMore: "Lire plus",
    readLess: "Réduire",
    openPhoto: "Ouvrir la photo",
    close: "Fermer",
    call: "Appeler",
    sendEmail: "Envoyer un email",
    visitSite: "Visiter le site",
  },
  ar: {
    loading: "جار التحميل…",
    backHome: "العودة للرئيسية",
    photos: "الصور",
    noPhotos: "لا توجد صور.",
    photoAlt: "صورة",
    companyFallback: (id: number) => `شركة #${id}`,

    contact: "معلومات التواصل",
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    website: "الموقع",
    description: "الوصف",

    // UI mobile
    showMore: "عرض المزيد",
    showLess: "عرض أقل",
    readMore: "قراءة المزيد",
    readLess: "إخفاء",
    openPhoto: "فتح الصورة",
    close: "إغلاق",
    call: "اتصال",
    sendEmail: "إرسال بريد",
    visitSite: "زيارة الموقع",
  },
} as const;

type CompanyPhoto = {
  id: number;
  image_url: string;
  caption: string | null;
  is_cover: boolean; // compat backend/data existante (non utilisé en UI)
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
  address?: string | null;

  description?: string | null;
  location?: string | null;

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

// ✅ Conservé pour "recently viewed" seulement (invisible ici)
function pickCover(photos: CompanyPhoto[]) {
  if (!photos?.length) return null;
  const cover = photos.find((p) => p.is_cover) ?? photos[0];
  return cover?.image_url ?? null;
}

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

  const LS_KEY = `bricol_recently_viewed_profiles_${lang}_v1`;

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [photos, setPhotos] = useState<CompanyPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI-only states
  const [showAllSectors, setShowAllSectors] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [expandedCaptionId, setExpandedCaptionId] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; caption?: string | null } | null>(null);

  // ✅ Carousel state (UI only)
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let alive = true;
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

        const p: CompanyProfile = await api
          .get(`/company-profiles/${companyId}`, { params: { lang } })
          .then((r) => r.data);

        if (!alive) return;

        setProfile(p);

        // ✅ IMPORTANT: on n'utilise plus "cover first" pour l'UI
        const mergedPhotosRaw = Array.isArray(p?.photos) ? (p.photos as CompanyPhoto[]) : [];
        setPhotos(mergedPhotosRaw);
        setActiveIndex(0);

        // recently viewed (on garde coverUrl en interne pour ne rien casser ailleurs)
        const title = (p?.name ?? "").trim() || t.companyFallback(companyId);
        const cityName = labelCity(p?.city ?? null, lang);
        const coverUrl = pickCover(mergedPhotosRaw);
        const sectorLabels = labelSectors(p?.sectors ?? null);

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

  useEffect(() => {
    setShowAllSectors(false);
    setDescExpanded(false);
    setExpandedCaptionId(null);
    setLightbox(null);
    setActiveIndex(0);
  }, [lang, companyId]);

  // ✅ keep activeIndex synced with scroll (UI only)
  function onScrollCarousel() {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    const nextIdx = Math.round(el.scrollLeft / w);
    if (nextIdx !== activeIndex) setActiveIndex(nextIdx);
  }

  function scrollToIndex(idx: number) {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    el.scrollTo({ left: idx * w, behavior: "smooth" });
    setActiveIndex(idx);
  }

  function prevPhoto() {
    if (photos.length === 0) return;
    const next = (activeIndex - 1 + photos.length) % photos.length;
    scrollToIndex(next);
  }

  function nextPhoto() {
    if (photos.length === 0) return;
    const next = (activeIndex + 1) % photos.length;
    scrollToIndex(next);
  }

  if (loading) {
    return (
      <main dir={dir} className="mx-auto max-w-5xl p-3 sm:p-4">
        <div className="rounded-2xl border p-4 sm:p-5">
          <div className="text-sm text-muted-foreground">{t.loading}</div>
          <div className="mt-3 h-2 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-2 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main dir={dir} className="mx-auto max-w-5xl p-3 sm:p-4">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        <div className="mt-4">
          <Link className="underline" href={base}>
            {t.backHome}
          </Link>
        </div>
      </main>
    );
  }

  const title = (profile?.name ?? "").trim() || t.companyFallback(companyId);
  const cityName = labelCity(profile?.city ?? null, lang);

  const hasContact =
    Boolean(profile?.phone?.trim()) || Boolean(profile?.email?.trim()) || Boolean(profile?.website?.trim());

  const sectorLabels = labelSectors(profile?.sectors ?? null) ?? [];
  const sectorMobileLimit = 3;
  const sectorsToShow =
    showAllSectors || sectorLabels.length <= sectorMobileLimit ? sectorLabels : sectorLabels.slice(0, sectorMobileLimit);
  const remainingSectors = Math.max(0, sectorLabels.length - sectorsToShow.length);

  const descriptionText = (profile?.description ?? "").trim();
  const shouldClampDesc = descriptionText.length > 300;

  const currentPhoto = photos[activeIndex] ?? null;
  const currentHasCaption = Boolean(currentPhoto?.caption?.trim());
  const captionExpanded = currentPhoto ? expandedCaptionId === currentPhoto.id : false;

  return (
    <main dir={dir} className="mx-auto max-w-5xl p-3 sm:p-4">
      {/* Lightbox (UI only) */}
      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-3 sm:p-4">
              <div className="text-sm font-medium text-gray-900">{t.openPhoto}</div>
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                onClick={() => setLightbox(null)}
              >
                {t.close}
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.url} alt={lightbox.caption ?? t.photoAlt} className="max-h-[70vh] w-full object-contain" />
            {lightbox.caption ? (
              <div className="border-t p-3 sm:p-4 text-sm text-gray-800 whitespace-pre-wrap">{lightbox.caption}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Header */}
      <section className="rounded-2xl border p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          {profile?.user_photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.user_photo}
              alt={title}
              className="h-14 w-14 rounded-full object-cover border self-start"
            />
          ) : null}

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold break-words sm:text-2xl">{title}</h1>

            <div className="mt-2 space-y-2 text-sm text-gray-700">
              {sectorLabels.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {sectorsToShow.map((lbl, idx) => (
                    <span key={idx} className="rounded-full border bg-white px-2 py-0.5 text-[12px]">
                      {lbl}
                    </span>
                  ))}

                  {remainingSectors > 0 ? (
                    <button
                      type="button"
                      className="rounded-full border bg-gray-50 px-2 py-0.5 text-[12px] hover:bg-gray-100"
                      onClick={() => setShowAllSectors(true)}
                    >
                      +{remainingSectors} {t.showMore}
                    </button>
                  ) : null}

                  {showAllSectors && sectorLabels.length > sectorMobileLimit ? (
                    <button
                      type="button"
                      className="rounded-full border bg-gray-50 px-2 py-0.5 text-[12px] hover:bg-gray-100"
                      onClick={() => setShowAllSectors(false)}
                    >
                      {t.showLess}
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                {cityName ? (
                  <span className="inline-flex items-center gap-2">
                    <span aria-hidden>📍</span>
                    <span className="font-medium">{cityName}</span>
                  </span>
                ) : null}

                {profile?.location ? (
                  <span className="text-gray-600 sm:before:mx-2 sm:before:content-['•']">{profile.location}</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Photos (premium carousel, no cover UI) */}
      <section className="mt-4 sm:mt-6 rounded-2xl border p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold sm:text-lg">{t.photos}</h2>
          <div className="text-xs text-muted-foreground">{photos.length > 0 ? `${activeIndex + 1}/${photos.length}` : ""}</div>
        </div>

        {photos.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">{t.noPhotos}</p>
        ) : (
          <div className="mt-4">
            {/* Carousel viewport */}
            <div className="relative overflow-hidden rounded-2xl border bg-white">
              {/* Flèches */}
              <button
                type="button"
                onClick={prevPhoto}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border bg-white/90 px-3 py-2 text-sm shadow-sm hover:bg-white"
                aria-label="Previous"
              >
                {dir === "rtl" ? "›" : "‹"}
              </button>

              <button
                type="button"
                onClick={nextPhoto}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border bg-white/90 px-3 py-2 text-sm shadow-sm hover:bg-white"
                aria-label="Next"
              >
                {dir === "rtl" ? "‹" : "›"}
              </button>

              {/* Scroller */}
              <div
                ref={scrollerRef}
                onScroll={onScrollCarousel}
                className="flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
                style={{ scrollbarWidth: "none" as any }}
              >
                {photos.map((p) => (
                  <div key={p.id} className="w-full flex-shrink-0 snap-start">
                    <button
                      type="button"
                      className="block w-full"
                      onClick={() => setLightbox({ url: p.image_url, caption: p.caption })}
                      aria-label={t.openPhoto}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.image_url}
                        alt={p.caption ?? t.photoAlt}
                        className="h-56 w-full object-cover sm:h-72"
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Dots */}
            <div className="mt-3 flex items-center justify-center gap-2">
              {photos.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  className={[
                    "h-2.5 w-2.5 rounded-full border",
                    idx === activeIndex ? "bg-gray-900 border-gray-900" : "bg-white border-gray-300",
                  ].join(" ")}
                  onClick={() => scrollToIndex(idx)}
                  aria-label={`Go to photo ${idx + 1}`}
                />
              ))}
            </div>

            {/* Caption du slide courant (premium, propre) */}
            {currentHasCaption ? (
              <div className="mt-4 rounded-2xl border bg-white p-3 sm:p-4">
                <div
                  className={[
                    "text-sm text-gray-800 whitespace-pre-wrap leading-relaxed",
                    captionExpanded ? "" : "line-clamp-3",
                  ].join(" ")}
                >
                  {currentPhoto?.caption}
                </div>

                <button
                  type="button"
                  className="mt-2 text-xs underline text-gray-700"
                  onClick={() => {
                    if (!currentPhoto) return;
                    setExpandedCaptionId(captionExpanded ? null : currentPhoto.id);
                  }}
                >
                  {captionExpanded ? t.readLess : t.readMore}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* Description */}
      {profile?.description ? (
        <section className="mt-4 sm:mt-6 rounded-2xl border p-4 sm:p-5">
          <h2 className="text-base font-semibold sm:text-lg">{t.description}</h2>

          <div className="mt-2">
            <p
              className={[
                "whitespace-pre-wrap text-gray-800 leading-relaxed",
                shouldClampDesc && !descExpanded ? "line-clamp-6" : "",
              ].join(" ")}
            >
              {profile.description}
            </p>

            {shouldClampDesc ? (
              <button
                type="button"
                className="mt-2 text-sm underline text-gray-700"
                onClick={() => setDescExpanded((v) => !v)}
              >
                {descExpanded ? t.readLess : t.readMore}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Contact */}
      {hasContact ? (
        <section className="mt-4 sm:mt-6 rounded-2xl border p-4 sm:p-5">
          <h2 className="text-base font-semibold sm:text-lg">{t.contact}</h2>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            {profile?.phone?.trim() ? (
              <a
                className="inline-flex items-center justify-center rounded-xl border bg-white px-4 py-3 text-sm font-medium hover:bg-gray-50"
                href={`tel:${profile.phone}`}
              >
                {t.call}
              </a>
            ) : null}

            {profile?.email?.trim() ? (
              <a
                className="inline-flex items-center justify-center rounded-xl border bg-white px-4 py-3 text-sm font-medium hover:bg-gray-50"
                href={`mailto:${profile.email}`}
              >
                {t.sendEmail}
              </a>
            ) : null}

            {profile?.website?.trim() ? (
              <a
                className="inline-flex items-center justify-center rounded-xl border bg-white px-4 py-3 text-sm font-medium hover:bg-gray-50"
                href={normalizeWebsite(profile.website)}
                target="_blank"
                rel="noreferrer"
              >
                {t.visitSite}
              </a>
            ) : null}
          </div>

          <div className="mt-4 space-y-2 text-sm text-gray-800">
            {profile?.phone?.trim() ? (
              <div className="break-words">
                <span className="font-medium">{t.phone}: </span>
                <a className="underline" href={`tel:${profile.phone}`}>
                  {profile.phone}
                </a>
              </div>
            ) : null}

            {profile?.email?.trim() ? (
              <div className="break-words">
                <span className="font-medium">{t.email}: </span>
                <a className="underline" href={`mailto:${profile.email}`}>
                  {profile.email}
                </a>
              </div>
            ) : null}

            {profile?.website?.trim() ? (
              <div className="break-words">
                <span className="font-medium">{t.website}: </span>
                <a className="underline" href={normalizeWebsite(profile.website)} target="_blank" rel="noreferrer">
                  {profile.website}
                </a>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Reviews (business logic untouched) */}
      <ReviewsSection
        targetType="company"
        targetProfileId={companyId}
        mode={!authLoading && user && profile?.user_id === user.id ? "owner" : "public"}
      />
    </main>
  );
}
