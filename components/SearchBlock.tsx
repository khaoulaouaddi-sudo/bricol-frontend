// components/SearchBlock.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { City, Umbrella } from "@/types";
import { fetchCities, fetchUmbrellas } from "@/services/taxonomies";
import { useLang } from "@/components/LangProvider";

const i18n = {
  fr: {
    allCities: "Toutes les villes",
    allSectors: "Tous les secteurs",
    search: "Rechercher",
  },
  ar: {
    allCities: "جميع المدن",
    allSectors: "جميع المهن",
    search: "بحث",
  },
} as const;

export function SearchBlock() {
  const router = useRouter();
  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;

  const [cities, setCities] = useState<City[]>([]);
  const [umbrellas, setUmbrellas] = useState<Umbrella[]>([]);
  const [city, setCity] = useState<string>("");
  const [sector, setSector] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    fetchCities(lang)
      .then((d) => mounted && setCities(d))
      .catch(console.error);

    fetchUmbrellas(undefined, lang)
      .then((d) => mounted && setUmbrellas(d))
      .catch(console.error);

    return () => {
      mounted = false;
    };
  }, [lang]);

  const sectorsGrouped = useMemo(() => umbrellas, [umbrellas]);

  function submit() {
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (sector) params.set("sector", sector);
    const qs = params.toString();
    const prefix = `/${lang}`;
    router.push(`${prefix}/results${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="w-full rounded-2xl bg-white/80 p-3 sm:p-4 shadow" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex flex-col md:flex-row gap-3">
        {/* Ville */}
        <select
          className="flex-1 rounded-xl border p-2 sm:p-3"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">{t.allCities}</option>
          {cities.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.display_name ?? c.name_ar ?? c.name_fr}
            </option>
          ))}
        </select>

        {/* Secteur (groupé par umbrella) */}
        <select
          className="flex-1 rounded-xl border p-2 sm:p-3"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
        >
          <option value="">{t.allSectors}</option>

          {sectorsGrouped.map((u) => (
            <optgroup key={u.slug} label={u.display_name ?? u.name_ar ?? u.name}>
              {u.sectors.map((s) => (
                <option key={s.id} value={s.slug}>
                  {s.display_label ?? s.label_ar ?? s.label ?? s.name_ar ?? s.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Bouton */}
        <button
          onClick={submit}
          className="w-full md:w-auto rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 bg-black text-white hover:bg-gray-800"
        >
          {t.search}
        </button>
      </div>
    </div>
  );
}
