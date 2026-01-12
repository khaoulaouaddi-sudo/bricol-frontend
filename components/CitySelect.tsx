"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

type City = { id: number; slug: string; name?: string; name_fr?: string };

type Props = {
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
  withSearch?: boolean;
};

export default function CitySelect({
  value,
  onChange,
  placeholder = "Rechercher une ville…",
  withSearch = true,
}: Props) {
  const [all, setAll] = useState<City[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const label = (c: City) => c.name_fr ?? c.name ?? c.slug ?? `#${c.id}`;

  async function fetchAll() {
    const candidates = ["/cities", "/city"];
    for (const url of candidates) {
      try {
        const r = await api.get(url);
        if (Array.isArray(r.data)) return r.data as City[];
      } catch {}
    }
    return [] as City[];
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const list = await fetchAll();
        if (alive) setAll(list);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 👉 recherche plus intelligente : les noms commençant par la requête remontent en premier
  const filtered = useMemo(() => {
    if (!q.trim()) return all;
    const qq = q.toLowerCase();
    const starts: City[] = [];
    const contains: City[] = [];
    for (const c of all) {
      const name = label(c).toLowerCase();
      if (name.startsWith(qq)) starts.push(c);
      else if (name.includes(qq)) contains.push(c);
    }
    return [...starts, ...contains];
  }, [all, q]);

  return (
    <div className="space-y-2">
      {withSearch && (
        <input
          type="text"
          className="w-full border rounded-xl px-3 py-2"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      )}

      <select
        className="w-full border rounded-xl px-3 py-2"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">
          {loading ? "Chargement…" : filtered.length ? "— Sélectionnez une ville —" : "(Aucune ville)"}
        </option>
        {filtered.map((c) => (
          <option key={c.id} value={c.id}>
            {label(c)}
          </option>
        ))}
      </select>
    </div>
  );
}
