"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import ReviewsSection from "@/components/reviews/ReviewsSection";

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

  // ✅ backend renvoie ce champ
  user_name?: string | null;

  city?: { id: number; slug: string; name_fr: string } | null;
  sector?: { id: number; slug: string; name: string } | null;
  photos?: WorkerPhoto[];
};

type RecentlyViewedItem = {
  type: "worker" | "company";
  id: number;
  title: string;
  sectorName?: string | null;
  cityName?: string | null;
  coverUrl?: string | null;
  viewedAt: number;
};

const LS_KEY = "bricol_recently_viewed_profiles_v1";
const LS_LIMIT = 20;

function safeNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function pickCover(photos: WorkerPhoto[]) {
  if (!photos?.length) return null;
  const cover = photos.find((p) => p.is_cover) ?? photos[0];
  return cover?.image_url ?? null;
}

function pushRecentlyViewed(item: RecentlyViewedItem) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const prev: RecentlyViewedItem[] = raw ? JSON.parse(raw) : [];
    const next = [
      item,
      ...(Array.isArray(prev) ? prev.filter((x) => !(x.type === item.type && x.id === item.id)) : []),
    ].slice(0, LS_LIMIT);

    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {}
}

export default function WorkerPublicPage() {
  const params = useParams();
  const workerId = useMemo(() => safeNumber(params?.id), [params]);

  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [photos, setPhotos] = useState<WorkerPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!workerId || Number.isNaN(workerId)) {
        setErr("Identifiant invalide");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErr(null);

        const { data } = await api.get<WorkerProfile>(`/worker-profiles/${workerId}`);
        if (cancelled) return;

        setProfile(data);
        const ph = Array.isArray((data as any)?.photos) ? (data as any).photos : [];
        setPhotos(ph);

        const displayTitle = data.user_name || data.title || "Ouvrier";
        pushRecentlyViewed({
          type: "worker",
          id: workerId,
          title: displayTitle,
          sectorName: data.sector?.name ?? null,
          cityName: data.city?.name_fr ?? null,
          coverUrl: pickCover(ph),
          viewedAt: Date.now(),
        });
      } catch (e: any) {
        if (cancelled) return;
        setErr(e?.response?.data?.msg || "Erreur lors du chargement du profil");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [workerId]);

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="rounded-2xl border bg-white p-6">Chargement…</div>
      </main>
    );
  }

  if (err) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="rounded-2xl border bg-white p-6 space-y-3">
          <div className="font-semibold text-red-600">{err}</div>
          <Link className="text-blue-600 underline" href="/">
            Retour à l’accueil
          </Link>
        </div>
      </main>
    );
  }

  if (!profile) return null;

  const displayName = profile.user_name || "Ouvrier";
  const sectorName = profile.sector?.name || "";
  const cover = pickCover(photos);

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <section className="rounded-2xl border bg-white overflow-hidden">
        <div className="p-5 space-y-2">
          {/* ✅ Nom & prénom */}
          <h1 className="text-xl font-semibold">{displayName}</h1>

          {profile.title ? <div className="text-sm text-gray-700">{profile.title}</div> : null}

          <div className="text-sm text-gray-600">
            {sectorName ? <span>{sectorName}</span> : null}
            {profile.city?.name_fr ? <span> · {profile.city.name_fr}</span> : null}
          </div>
        </div>

        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={displayName} className="w-full h-64 object-cover" />
        ) : (
          <div className="w-full h-64 bg-gray-100 flex items-center justify-center text-sm text-gray-500">
            Pas de photo
          </div>
        )}
      </section>

      {profile.description ? (
        <section className="rounded-2xl border bg-white p-5 space-y-2">
          <h2 className="text-lg font-semibold">À propos</h2>
          <p className="text-sm text-gray-700 whitespace-pre-line">{profile.description}</p>
        </section>
      ) : null}

      <ReviewsSection targetType="worker" targetProfileId={workerId} />
    </main>
  );
}
