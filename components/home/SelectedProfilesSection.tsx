// components/home/SelectedProfilesSection.tsx
import Link from "next/link";
import Image from "next/image";
import api from "@/lib/api";

type SelectedProfile = {
  profile_type: "worker" | "company";
  profile_id: number;
  display_name: string | null;
  // ✅ Le backend renvoie aussi display_name pour la langue (voir /search/selected)
  sector: { slug: string | null; name: string | null; display_name?: string | null } | null;
  cover_url: string | null;
  reviews_avg: number | null;
  reviews_count: number;
  created_at: string;
};

async function fetchSelected(limit = 12, lang: "fr" | "ar" = "fr"): Promise<SelectedProfile[]> {
  const { data } = await api.get<{ items: SelectedProfile[] }>("/search/selected", {
    params: { limit, lang },
  });

  return Array.isArray((data as any)?.items) ? (data as any).items : [];
}

function hrefFor(lang: "fr" | "ar", p: SelectedProfile) {
  const prefix = `/${lang}`;
  return p.profile_type === "worker"
    ? `${prefix}/worker/${p.profile_id}`
    : `${prefix}/company/${p.profile_id}`;
}

function ratingLabel(lang: "fr" | "ar", avg: number | null, count: number) {
  if (!count) return lang === "ar" ? "جديد" : "Nouveau";
  if (avg === null || Number.isNaN(avg))
    return lang === "ar" ? `${count} تقييم` : `${count} avis`;
  return `${avg.toFixed(1)} (${count})`;
}

const i18n = {
  fr: {
    title: "Profils sélectionnés",
    hint: "3 par ligne · max 12",
    company: "Entreprise",
    worker: "Ouvrier",
    noPhoto: "Pas de photo",
  },
  ar: {
    title: "ملفات مختارة",
    hint: "3 في السطر · حد أقصى 12",
    company: "شركة",
    worker: "عامل",
    noPhoto: "بدون صورة",
  },
} as const;

export default async function SelectedProfilesSection({
  lang,
}: {
  lang: "fr" | "ar";
}) {
  const t = lang === "ar" ? i18n.ar : i18n.fr;
  const items = await fetchSelected(12, lang);
  if (!items.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t.title}</h2>
        <span className="hidden sm:inline text-xs text-gray-500">{t.hint}</span>
      </div>

      {/* Mobile: carrousel horizontal (scroll) */}
<div className="sm:hidden -mx-4 px-4 overflow-x-auto flex gap-3 snap-x snap-mandatory pb-2">
  {items.slice(0, 12).map((p) => {
    const name =
      p.display_name ||
      (p.profile_type === "company" ? t.company : t.worker);

    const sectorName =
      (p.sector?.display_name ?? null) ||
      (p.sector?.name ?? "");

    const rating = ratingLabel(lang, p.reviews_avg, p.reviews_count);

    return (
      <Link
        key={`${p.profile_type}-${p.profile_id}-m`}
        href={hrefFor(lang, p)}
        className="snap-start shrink-0 w-[78%] max-w-[340px] rounded-2xl border bg-white overflow-hidden"
      >
        <div className="relative w-full aspect-[16/10] bg-gray-100">
          {p.cover_url ? (
            <Image
              src={p.cover_url}
              alt={name}
              fill
              className="object-cover"
              sizes="80vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">
              {t.noPhoto}
            </div>
          )}

          <div className="absolute top-2 left-2">
            <span className="text-[11px] px-2 py-1 rounded-full bg-white/90 border">
              {p.profile_type === "worker" ? t.worker : t.company}
            </span>
          </div>
        </div>

        <div className="p-3 space-y-1">
          <div className="font-semibold leading-snug line-clamp-1">
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

      <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.slice(0, 12).map((p) => {
          const name =
            p.display_name ||
            (p.profile_type === "company" ? t.company : t.worker);

          // ✅ IMPORTANT : afficher la version localisée si dispo
          const sectorName =
            (p.sector?.display_name ?? null) ||
            (p.sector?.name ?? "");

          const rating = ratingLabel(lang, p.reviews_avg, p.reviews_count);

          return (
            <Link
              key={`${p.profile_type}-${p.profile_id}`}
              href={hrefFor(lang, p)}
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
                    {t.noPhoto}
                  </div>
                )}

                <div className="absolute top-2 left-2">
                  <span className="text-[11px] px-2 py-1 rounded-full bg-white/90 border">
                    {p.profile_type === "worker" ? t.worker : t.company}
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
