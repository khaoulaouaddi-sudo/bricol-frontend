"use client";

import { useEffect, useState } from "react";
import { searchSectors } from "@/lib/sectors";
import type { Sector } from "@/lib/types";
import { useLang } from "@/components/LangProvider";

const i18n = {
  fr: {
    placeholder: "Secteur…",
    none: "(Aucun secteur)",
    search: "Rechercher un secteur…",
  },
  ar: {
    placeholder: "المهنة…",
    none: "(لا توجد مهن)",
    search: "ابحث عن مهنة…",
  },
} as const;

export default function SectorSelect({
  value,
  onChange,
  context = "worker",
  placeholder,
}: {
  value?: number | null;
  onChange: (id: number | null) => void;
  context?: "worker" | "company";
  placeholder?: string;
}) {
  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;

  const [q, setQ] = useState("");
  const [options, setOptions] = useState<Sector[]>([]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      const list = await searchSectors(q, context, 30, lang); // ✅ passe lang
      if (alive) setOptions(list);
    };
    const tt = setTimeout(run, 300);
    return () => {
      alive = false;
      clearTimeout(tt);
    };
  }, [q, context, lang]); // ✅ relance si lang change

  const label = (s: any) =>
    s.display_label ??
    s.display_name ??
    (lang === "ar" ? s.label_ar ?? s.name_ar : s.label ?? s.name_fr) ??
    s.name ??
    s.slug ??
    `#${s.id}`;

  return (
    <div style={{ display: "grid", gap: 8 }} dir={lang === "ar" ? "rtl" : "ltr"}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder ?? t.search}
      />
      <select
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value ? Number(e.target.value) : null)
        }
      >
        <option value="">{t.none}</option>
        {options.map((s: any) => (
          <option key={s.id} value={s.id}>
            {label(s)}
          </option>
        ))}
      </select>
    </div>
  );
}
