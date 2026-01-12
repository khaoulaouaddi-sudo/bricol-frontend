// components/home/SelectedProfilesSection.tsx
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";

type SelectedProfile = {
  profile_type: "worker" | "company";
  profile_id: number;
  display_name: string | null;
  sector: { slug: string | null; name: string | null } | null;
  cover_url: string | null;
  reviews_avg: number | null;
  reviews_count: number;
  created_at: string;
};

async function fetchSelected(limit = 12): Promise<SelectedProfile[]> {
  const { data } = await api.get<{ items: SelectedProfile[] }>("/search/selected", {
    params: { limit },
  });

  return Array.isArray((data as any)?.items) ? (data as any).items : [];
}

function hrefFor(p: SelectedProfile) {
  return p.profile_type === "worker"
    ? `/worker/${p.profile_id}`
    : `/company/${p.profile_id}`;
}

function ratingLabel(avg: number | null, count: number) {
  if (!count) return "Nouveau";
  if (avg === null || Number.isNaN(avg)) return `${count} avis`;
  return `${avg.toFixed(1)} (${count})`;
}

export default async function SelectedProfilesSection() {
  const items = await fetchSelected(12);
  if (!items.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Profils sélectionnés</h2>
        <span className="text-xs text-gray-500">3 par ligne · max 12</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.slice(0, 12).map((p) => {
          const name =
            p.display_name ||
            (p.profile_type === "company" ? "Entreprise" : "Ouvrier");
          const sectorName = p.sector?.name || "";
          const rating = ratingLabel(p.reviews_avg, p.reviews_count);

          return (
            <Link
              key={`${p.profile_type}-${p.profile_id}`}
              href={hrefFor(p)}
              className="group rounded-2xl border bg-white overflow-hidden hover:shadow-sm transition"
            >
              <div className="relative w-full aspect-[16/10] bg-gray-100">
                {p.cover_url ? (
                  <Image
                    src={p.cover_url}
                    alt={name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">
                    Pas de photo
                  </div>
                )}

                <div className="absolute top-2 left-2">
                  <span className="text-[11px] px-2 py-1 rounded-full bg-white/90 border">
                    {p.profile_type === "worker" ? "Ouvrier" : "Entreprise"}
                  </span>
                </div>
              </div>

              <div className="p-3 space-y-1">
                <div className="font-semibold leading-snug line-clamp-1 group-hover:underline">
                  {name}
                </div>

                <div className="text-sm text-gray-600 line-clamp-1">
                  {sectorName}
                </div>

                <div className="text-sm text-gray-800">
                  <span className="font-medium">⭐</span> {rating}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
