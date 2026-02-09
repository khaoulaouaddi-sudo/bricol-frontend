"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { useLang } from "@/components/LangProvider";

type City = {
  id: number;
  slug: string;
  name?: string;
  name_fr?: string;
  name_ar?: string;
  display_name?: string | null;
};

type Props = {
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
  withSearch?: boolean;
};

const i18n = {
  fr: {
    searchPlaceholder: "Rechercher une ville…",
    loading: "Chargement…",
    pick: "— Sélectionnez une ville —",
    empty: "(Aucune ville)",
  },
  ar: {
    searchPlaceholder: "ابحث عن مدينة…",
    loading: "جار التحميل…",
    pick: "— اختر مدينة —",
    empty: "(لا توجد مدن)",
  },
} as const;

export default function CitySelect({
  value,
  onChange,
  placeholder,
  withSearch = true,
}: Props) {
  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;

  const [all, setAll] = useState<City[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const label = (c: City) =>
    c.display_name ??
    (lang === "ar" ? c.name_ar : c.name_fr) ??
    c.name ??
    c.slug ??
    `#${c.id}`;

  async function fetchAll() {
    const candidates = ["/cities", "/city"];
    for (const url of candidates) {
      try {
        const r = await api.get(url, { params: { lang } }); // ✅ ajout lang
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
  }, [lang]); // ✅ recharge si lang change

  const filtered = useMemo(() => {
    if (!q.trim()) return all;
    const qq = q.toLowerCase();
    const starts: City[] = [];
    const contains: City[] = [];
    for (const c of all) {
      const name = String(label(c)).toLowerCase();
      if (name.startsWith(qq)) starts.push(c);
      else if (name.includes(qq)) contains.push(c);
    }
    return [...starts, ...contains];
  }, [all, q, lang]);

  return (
    <div className="space-y-2" dir={lang === "ar" ? "rtl" : "ltr"}>
      {withSearch && (
        <input
          type="text"
          className="w-full border rounded-xl px-3 py-2"
          placeholder={placeholder ?? t.searchPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      )}

      <select
        className="w-full border rounded-xl px-3 py-2"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value ? Number(e.target.value) : null)
        }
      >
        <option value="">
          {loading ? t.loading : filtered.length ? t.pick : t.empty}
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
