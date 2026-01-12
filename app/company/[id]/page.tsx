"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import ReviewsSection from "@/components/reviews/ReviewsSection";

type CompanyPhoto = {
  id: number;
  image_url: string;
  caption: string | null;
  is_cover: boolean;
};

type CompanyProfile = {
  id: number;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  address?: string | null;
  location?: string | null;

  city_id?: number | null;
  city?: { id: number; name_fr?: string | null } | null;

  photos?: CompanyPhoto[] | null;
};

type RecentlyViewedItem = {
  type: "worker" | "company";
  id: number;
  title: string;
  cityName?: string | null;
  sectorName?: string | null;
  coverUrl?: string | null;
  viewedAt: number;
};

const LS_KEY = "bricol_recently_viewed_profiles_v1";
const LS_LIMIT = 20;

function safeNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
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
  } catch {
    // no-op
  }
}

export default function CompanyPublicPage() {
  const params = useParams();
  const companyId = useMemo(() => safeNumber(params?.id), [params]);

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [photos, setPhotos] = useState<CompanyPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!Number.isFinite(companyId)) {
        setError("ID profil invalide.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const p: CompanyProfile = await api
          .get(`/company-profiles/${companyId}`)
          .then((r) => r.data);

        if (!alive) return;
        setProfile(p);

        const ph: CompanyPhoto[] = await api
          .get(`/company-photos/company/${companyId}`)
          .then((r) => r.data);

        if (!alive) return;
        const mergedPhotos = Array.isArray(ph) ? ph : [];
        setPhotos(mergedPhotos);

        const title =
          (p?.name ?? p?.title ?? "").trim() || `Entreprise #${companyId}`;
        const cityName = p?.city?.name_fr ?? null;
        const coverUrl = pickCover(mergedPhotos);

        upsertRecentlyViewed({
          type: "company",
          id: companyId,
          title,
          cityName,
          sectorName: null, // pas de supposition (secteurs non chargés ici)
          coverUrl,
          viewedAt: Date.now(),
        });
      } catch (e: any) {
        console.error(e);
        if (!alive) return;
        setError("Impossible de charger le profil entreprise.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [companyId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl p-4">
        <div className="rounded-xl border p-4">Chargement…</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
        <div className="mt-4">
          <Link className="underline" href="/">
            Retour accueil
          </Link>
        </div>
      </main>
    );
  }

  const title =
    (profile?.name ?? profile?.title ?? "").trim() || `Entreprise #${companyId}`;
  const cityName = profile?.city?.name_fr ?? null;

  return (
    <main className="mx-auto max-w-5xl p-4">
      <section className="rounded-2xl border p-5">
        <h1 className="text-2xl font-bold">{title}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-700">
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
        <h2 className="text-lg font-semibold">Photos</h2>

        {photos.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">Aucune photo.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
            {photos.map((p) => (
              <div key={p.id} className="overflow-hidden rounded-xl border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image_url}
                  alt={p.caption ?? "Photo"}
                  className="h-44 w-full object-cover"
                />
                <div className="p-2 flex items-center justify-between gap-2">
                  <div className="text-xs text-gray-600 truncate">
                    {p.caption ?? ""}
                  </div>
                  {(p as any).is_cover ? (
                    <span className="text-[10px] px-2 py-1 rounded-full border bg-white">
                      Couverture
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ReviewsSection targetType="company" targetProfileId={companyId} />
    </main>
  );
}
