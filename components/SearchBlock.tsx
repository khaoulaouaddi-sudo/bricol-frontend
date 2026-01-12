// components/SearchBlock.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { City, Umbrella } from "@/types";
import { fetchCities, fetchUmbrellas } from "@/services/taxonomies";

export function SearchBlock() {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [umbrellas, setUmbrellas] = useState<Umbrella[]>([]);
  const [city, setCity] = useState<string>("");
  const [sector, setSector] = useState<string>("");

  useEffect(() => {
    fetchCities().then(setCities).catch(console.error);
    fetchUmbrellas().then(setUmbrellas).catch(console.error);
  }, []);

  const sectorsGrouped = useMemo(() => umbrellas, [umbrellas]);

  function submit() {
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (sector) params.set("sector", sector);
    const qs = params.toString();
    router.push(`/results${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="w-full rounded-2xl bg-white/80 p-4 shadow">
      <div className="flex flex-col md:flex-row gap-3">
        {/* Ville */}
        <select
          className="flex-1 rounded-xl border p-3"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">Toutes les villes</option>
          {cities.map(c => (
            <option key={c.id} value={c.slug}>{c.name_fr}</option>
          ))}
        </select>

        {/* Secteur (groupé par umbrella) */}
        <select
          className="flex-1 rounded-xl border p-3"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
        >
          <option value="">Tous les secteurs</option>
          {sectorsGrouped.map((u) => (
            <optgroup key={u.slug} label={u.name}>
              {u.sectors.map(s => (
                <option key={s.id} value={s.slug}>{s.name}</option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Bouton */}
        <button
          onClick={submit}
          className="rounded-xl px-5 py-3 bg-black text-white hover:bg-gray-800"
        >
          Rechercher
        </button>
      </div>
    </div>
  );
}
