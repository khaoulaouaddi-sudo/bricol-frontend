"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import ReviewsSection from "@/components/reviews/ReviewsSection";
import { useLang } from "@/components/LangProvider";

const i18n = {
  fr: {
    about: "À propos",
    loading: "Chargement…",
    invalidId: "Identifiant invalide",
    loadErr: "Erreur lors du chargement du profil",
    backHome: "Retour à l’accueil",
    noPhoto: "Pas de photo",
    workerFallback: "Ouvrier",
    trust: "Badge confiance",

    userSection: "Informations de contact",
    revealPhone: "Afficher le numéro",
    phone: "Téléphone",
    call: "Appeler",
    hidePhone: "Masquer",
    profilePhotos: "Photos du profil",
    photoCaption: "Description",
  },
  ar: {
    about: "نبذة",
    loading: "جار التحميل…",
    invalidId: "معرّف غير صالح",
    loadErr: "حدث خطأ أثناء تحميل الملف",
    backHome: "العودة إلى الرئيسية",
    noPhoto: "لا توجد صورة",
    workerFallback: "عامل",
    trust: "شارة الثقة",

    userSection: "معلومات التواصل",
    revealPhone: "إظهار الرقم",
    phone: "الهاتف",
    call: "اتصال",
    hidePhone: "إخفاء",
    profilePhotos: "صور الملف",
    photoCaption: "وصف",
  },
} as const;

type WorkerPhoto = {
  id: number;
  image_url: string;
  caption: string | null;
  is_cover: boolean;
};

type WorkerProfile = {
  id: number;
  user_id: number;

  title?: string | null;
  description?: string | null;

  user_name?: string | null;
  user_photo?: string | null;
  user_phone?: string | null;

  trust_badge?: boolean | null;

  city?: {
    id: number;
    slug: string;
    name_fr?: string;
    name_ar?: string | null;
    display_name?: string | null;
  } | null;

  sector?: {
    id: number;
    slug: string;
    name?: string;
    name_ar?: string | null;
    label?: string | null;
    label_ar?: string | null;
    display_label?: string | null;
    worker_label_ar?: string | null;
    worker_label_fr?: string | null;
  } | null;

  photos?: WorkerPhoto[];
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

function pickCover(photos: WorkerPhoto[]) {
  if (!photos?.length) return null;
  const cover = photos.find((p) => p.is_cover) ?? photos[0];
  return cover?.image_url ?? null;
}

function sortPhotosCoverFirst(photos: WorkerPhoto[]) {
  const list = Array.isArray(photos) ? [...photos] : [];
  list.sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.id - b.id);
  return list;
}

// ✅ ESSENTIEL: LS_KEY passé en paramètre (au lieu d'utiliser "lang" au niveau global)
function pushRecentlyViewed(lsKey: string, item: RecentlyViewedItem) {
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

function labelCity(city: WorkerProfile["city"], lang: "fr" | "ar") {
  if (!city) return "";
  return city.display_name ?? (lang === "ar" ? city.name_ar : city.name_fr) ?? city.name_fr ?? city.slug;
}

function labelSector(sector: WorkerProfile["sector"], lang: "fr" | "ar") {
  if (!sector) return "";
  return (
    sector.display_label ??
    (lang === "ar"
      ? sector.worker_label_ar ?? sector.label_ar ?? sector.name_ar
      : sector.worker_label_fr ?? sector.label ?? sector.name) ??
    sector.label ??
    sector.name ??
    sector.slug
  );
}

export default function WorkerPublicPage() {
  const params = useParams();
  const workerId = useMemo(() => safeNumber((params as any)?.id), [params]);

  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const base = `/${lang}`;

  // ✅ ESSENTIEL: LS_KEY calculé ici, après lang
  const LS_KEY = `bricol_recently_viewed_profiles_${lang}_v1`;

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [photos, setPhotos] = useState<WorkerPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [showPhone, setShowPhone] = useState(false);
 

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!workerId || Number.isNaN(workerId)) {
        setErr(t.invalidId);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErr(null);
        setShowPhone(false);

        const { data } = await api.get<WorkerProfile>(`/worker-profiles/${workerId}`, {
          params: { lang },
        });
        if (cancelled) return;

        setProfile(data);

        const ph = Array.isArray((data as any)?.photos) ? ((data as any).photos as WorkerPhoto[]) : [];
        setPhotos(ph);

        const displayTitle = data.user_name || data.title || t.workerFallback;

        // ✅ ESSENTIEL: on écrit dans la clé langue-correcte
        pushRecentlyViewed(LS_KEY, {
          type: "worker",
          id: workerId,
          title: displayTitle,
          sectorName: labelSector(data.sector ?? null, lang) || null,
          cityName: labelCity(data.city ?? null, lang) || null,
          coverUrl: pickCover(ph),
          trustBadge: typeof data.trust_badge === "boolean" ? data.trust_badge : null,
          viewedAt: Date.now(),
        });
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.response?.data?.msg || t.loadErr);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [workerId, lang, t.invalidId, t.loadErr, t.workerFallback, LS_KEY]);

  const sortedPhotos = useMemo(() => sortPhotosCoverFirst(photos), [photos]);
  const cover = useMemo(() => pickCover(sortedPhotos), [sortedPhotos]);

  if (loading) {
    return (
      <main dir={dir} className="max-w-6xl mx-auto px-4 py-6">
        <div className="rounded-2xl border bg-white p-6">{t.loading}</div>
      </main>
    );
  }

  if (err) {
    return (
      <main dir={dir} className="max-w-6xl mx-auto px-4 py-6">
        <div className="rounded-2xl border bg-white p-6 space-y-3">
          <div className="font-semibold text-red-600">{err}</div>
          <Link className="text-blue-600 underline" href={base}>
            {t.backHome}
          </Link>
        </div>
      </main>
    );
  }

  if (!profile) {
  return (
    <main dir={dir} className="max-w-6xl mx-auto px-4 py-6">
      <div className="rounded-2xl border bg-white p-6">{t.loadErr}</div>
      <Link className="text-blue-600 underline" href={base}>
        {t.backHome}
      </Link>
    </main>
  );
}

  const displayName = profile.user_name || profile.title || t.workerFallback;
  const sectorName = labelSector(profile.sector ?? null, lang);
  const cityName = labelCity(profile.city ?? null, lang);


  const showTrust = profile.trust_badge === true;

  const userPhoto = profile.user_photo || null;
  const userPhone = (profile.user_phone || "").trim();

  return (
    <main dir={dir} className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-20 h-20 rounded-full border overflow-hidden bg-gray-50 flex items-center justify-center">
            {userPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userPhoto} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="text-xs opacity-60">—</div>
            )}
          </div>

          <div className="flex-1 min-w-[220px] space-y-1">
            <div className="text-sm opacity-70">{t.userSection}</div>
            <h1 className="text-xl font-semibold">{displayName}</h1>

            <div className="text-sm text-gray-600">
              {sectorName ? <span>{sectorName}</span> : null}
              {cityName ? <span> · {cityName}</span> : null}
            </div>

            {showTrust ? <div className="text-xs opacity-80 mt-1">{t.trust}</div> : null}
          </div>

          <div className="flex items-center gap-2">
            {userPhone ? (
              <>
                {!showPhone ? (
                  <button
                    type="button"
                    onClick={() => setShowPhone(true)}
                    className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
                  >
                    {t.revealPhone}
                  </button>
                ) : (
                  <>
                    <div className="px-4 py-2 rounded-xl border bg-gray-50 text-sm">
                      <span className="opacity-70">{t.phone}:</span>{" "}
                      <span className="font-semibold">{userPhone}</span>
                    </div>

                    <a
                      href={`tel:${userPhone}`}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {t.call}
                    </a>

                    <button
                      type="button"
                      onClick={() => setShowPhone(false)}
                      className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
                    >
                      {t.hidePhone}
                    </button>
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={displayName} className="w-full h-72 object-cover" />
        ) : (
          <div className="w-full h-72 bg-gray-100 flex items-center justify-center text-sm text-gray-500">
            {t.noPhoto}
          </div>
        )}

        <div className="p-5 space-y-2">
          {profile.title ? <div className="text-sm text-gray-700">{profile.title}</div> : null}
          {profile.description ? (
            <div className="text-sm text-gray-700 whitespace-pre-line">{profile.description}</div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold">{t.profilePhotos}</h2>
          <div className="text-sm opacity-70">{sortedPhotos.length}</div>
        </div>

        {sortedPhotos.length === 0 ? (
          <div className="text-sm text-gray-600">{t.noPhoto}</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedPhotos.map((p) => (
              <div key={p.id} className="rounded-2xl border overflow-hidden bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt={displayName} className="w-full h-44 object-cover" />

                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    {p.is_cover ? (
                      <span className="text-xs px-2 py-1 rounded-full border bg-gray-50">Cover</span>
                    ) : (
                      <span />
                    )}
                  </div>

                  {p.caption ? (
                    <div className="space-y-1">
                      <div className="text-xs opacity-70">{t.photoCaption}</div>
                      <div className="text-sm text-gray-700 whitespace-pre-line">{p.caption}</div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ReviewsSection targetType="worker" targetProfileId={workerId} />
    </main>
  );
}
