"use client";

import { useEffect, useMemo, useState } from "react";

export type PhotoInput = {
  url: string;
  caption: string;
  is_cover: boolean;
};

type Props = {
  title?: string;
  subtitle?: string;
  max?: number; // default 8
  value: PhotoInput[];
  onChange: (next: PhotoInput[]) => void;
  defaultEmptyRows?: number; // default 1
};

function normalize(list: PhotoInput[], max: number) {
  const arr = Array.isArray(list) ? list : [];
  const trimmed = arr
    .slice(0, max)
    .map((p) => ({
      url: (p?.url || "").trim(),
      caption: (p?.caption || "").trim(),
      is_cover: !!p?.is_cover,
    }))
    .filter((p) => p.url.length > 0);

  // ensure exactly one cover (if any photo exists)
  if (trimmed.length > 0 && !trimmed.some((p) => p.is_cover)) {
    trimmed[0].is_cover = true;
  }
  // if multiple covers, keep first
  let coverFound = false;
  for (const p of trimmed) {
    if (p.is_cover) {
      if (!coverFound) coverFound = true;
      else p.is_cover = false;
    }
  }
  return trimmed;
}

export default function PhotoUrlPicker({
  title = "Photos",
  subtitle = "Ajoutez des URLs d’images. Choisissez une photo de couverture (celle qui s’affiche sur la carte du profil).",
  max = 8,
  value,
  onChange,
  defaultEmptyRows = 1,
}: Props) {
  const cleaned = useMemo(() => normalize(value, max), [value, max]);

  // UI rows = cleaned + empty rows (for easier adding)
  const [rows, setRows] = useState<PhotoInput[]>([]);

  useEffect(() => {
    const base = [...cleaned];
    const need = Math.max(defaultEmptyRows, 1);
    while (base.length < need) {
      base.push({ url: "", caption: "", is_cover: base.length === 0 });
    }
    setRows(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cleaned), defaultEmptyRows, max]);

  function emit(nextRows: PhotoInput[]) {
    // keep empties, but parent stores only non-empty urls
    const normalized = normalize(nextRows, max);
    onChange(normalized);
  }

  function setUrl(i: number, url: string) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, url } : r));
    setRows(next);
    emit(next);
  }

  function setCaption(i: number, caption: string) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, caption } : r));
    setRows(next);
    emit(next);
  }

  function setCover(i: number) {
    const next = rows.map((r, idx) => ({ ...r, is_cover: idx === i }));
    setRows(next);
    emit(next);
  }

  function addRow() {
    if (rows.length >= max) return;
    const next = [...rows, { url: "", caption: "", is_cover: rows.length === 0 }];
    setRows(next);
  }

  function removeRow(i: number) {
    if (rows.length <= 1) return;
    const removedWasCover = rows[i]?.is_cover;
    const next = rows.filter((_, idx) => idx !== i);

    if (removedWasCover) {
      // set first non-empty as cover, else first row
      const firstNonEmpty = next.findIndex((r) => (r.url || "").trim().length > 0);
      const coverIndex = firstNonEmpty >= 0 ? firstNonEmpty : 0;
      for (let k = 0; k < next.length; k++) next[k].is_cover = k === coverIndex;
    }

    setRows(next);
    emit(next);
  }

  return (
    <section className="rounded-2xl border bg-white p-5 space-y-3">
      <div>
        <div className="font-semibold">{title}</div>
        {subtitle ? <div className="text-sm opacity-70">{subtitle}</div> : null}
      </div>

      <div className="space-y-3">
        {rows.map((r, idx) => (
          <div key={idx} className="rounded-xl border p-3 space-y-2">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <input
                value={r.url}
                onChange={(e) => setUrl(idx, e.target.value)}
                placeholder="URL de l’image (https://...)"
                className="flex-1 rounded-xl border px-3 py-2"
              />

              <label className="text-sm flex items-center gap-2 whitespace-nowrap">
                <input
                  type="radio"
                  name="cover"
                  checked={!!r.is_cover}
                  onChange={() => setCover(idx)}
                />
                Photo de couverture
              </label>

              <button
                type="button"
                onClick={() => removeRow(idx)}
                className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
                disabled={rows.length <= 1}
              >
                Retirer
              </button>
            </div>

            <input
              value={r.caption}
              onChange={(e) => setCaption(idx, e.target.value)}
              placeholder="Légende (caption) — optionnel"
              className="w-full rounded-xl border px-3 py-2"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          type="button"
          onClick={addRow}
          className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
          disabled={rows.length >= max}
        >
          + Ajouter une photo
        </button>

        <div className="text-xs opacity-70">{cleaned.length}/{max} enregistrées</div>
      </div>
    </section>
  );
}
