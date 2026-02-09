"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { uploadImage } from "@/lib/uploadImage";
import { useLang } from "@/components/LangProvider";

export type PhotoInput = {
  url: string;
  caption: string;
  is_cover: boolean;
};

export type PhotoItem = PhotoInput & {
  id?: number; // utile en mode CRUD
};

type CrudHandlers = {
  /** Créer une photo à partir d'une URL (upload Cloudinary déjà fait) */
  onCreate: (item: PhotoInput) => Promise<void>;
  /** Supprimer une photo existante */
  onDelete: (id: number) => Promise<void>;
  /** Mettre en cover (exactement une) */
  onSetCover: (id: number) => Promise<void>;
  /** Mettre à jour la caption */
  onUpdateCaption: (id: number, caption: string) => Promise<void>;
};

type Props = {
  title?: string;
  subtitle?: string;
  max?: number; // default 8
  allowUrl?: boolean; // default true
  showPreview?: boolean; // default true

  /** ✅ IMPORTANT : isole les radios cover quand plusieurs pickers dans la même page */
  radioGroupName?: string;

  /** Mode :
   * - form: valeur contrôlée via value/onChange (pages new)
   * - crud: value sert d'affichage, actions via handlers CRUD
   */
  mode?: "form" | "crud";

  // ---- form mode ----
  value: PhotoItem[];
  onChange?: (next: PhotoInput[]) => void;
  defaultEmptyRows?: number; // default 1 (form mode)

  // ---- crud mode ----
  crud?: CrudHandlers;
};

function normalize(list: PhotoItem[], max: number) {
  const arr = Array.isArray(list) ? list : [];

  // on garde aussi les id (si présents) en CRUD
  const trimmed: PhotoItem[] = arr
    .slice(0, max)
    .map((p) => ({
      id: typeof p?.id === "number" ? p.id : undefined,
      url: (p?.url || "").trim(),
      caption: (p?.caption || "").trim(),
      is_cover: !!p?.is_cover,
    }))
    .filter((p) => p.url.length > 0);

  // ensure exactly one cover if any photo exists
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
  title,
  subtitle,
  max = 8,
  allowUrl = true,
  showPreview = true,
  radioGroupName,
  mode = "form",
  value,
  onChange,
  defaultEmptyRows = 1,
  crud,
}: Props) {
  const { lang } = useLang();
  const dir = lang === "ar" ? "rtl" : "ltr";

  const t = useMemo(() => {
    const fr = {
      photos: "Photos",
      helper:
        "Ajoutez des photos. Choisissez une photo de couverture : c’est celle qui s’affichera sur la carte du profil.",
      urlPh: "URL de l’image (https://...)",
      noPhoto: "Aucune photo (utilisez « Uploader une photo »)",
      added: "Photo ajoutée",
      cover: "Photo de couverture",
      remove: "Retirer",
      captionPh: "Légende (caption) — optionnel",
      addUrlRow: "+ Ajouter une ligne URL",
      upload: "📤 Uploader une photo",
      uploading: "Upload…",
      savedCount: "enregistrées",
      pickImage: "Veuillez sélectionner un fichier image.",
      maxReached: (n: number) => `Maximum ${n} photos.`,
      uploadErr: "Erreur lors de l'upload",
      // CRUD
      saving: "Enregistrement…",
      deleting: "Suppression…",
      setCover: "Définir comme couverture",
    };
    const ar = {
      photos: "الصور",
      helper: "أضِف صوراً واختر صورة الغلاف (ستظهر على بطاقة الملف).",
      urlPh: "رابط الصورة (https://...)",
      noPhoto: "لا توجد صورة (استعمل « رفع صورة »)",
      added: "تمت إضافة الصورة",
      cover: "صورة الغلاف",
      remove: "إزالة",
      captionPh: "وصف الصورة — اختياري",
      addUrlRow: "+ إضافة سطر رابط",
      upload: "📤 رفع صورة",
      uploading: "جار الرفع…",
      savedCount: "محفوظة",
      pickImage: "المرجو اختيار ملف صورة.",
      maxReached: (n: number) => `الحد الأقصى ${n} صور.`,
      uploadErr: "حدث خطأ أثناء الرفع",
      // CRUD
      saving: "جار الحفظ…",
      deleting: "جار الحذف…",
      setCover: "تعيين كغلاف",
    };
    return lang === "ar" ? ar : fr;
  }, [lang]);

  const cleaned = useMemo(() => normalize(value, max), [value, max]);

  const autoId = useId();
  const coverRadioName = radioGroupName || `cover-${autoId}`;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  // form mode rows = cleaned + empty rows
  const [rows, setRows] = useState<PhotoItem[]>([]);

  // crud mode local busy states
  const [busyId, setBusyId] = useState<number | null>(null);
  const [busyGlobal, setBusyGlobal] = useState(false);

  useEffect(() => {
    if (mode === "crud") {
      setRows(cleaned); // on affiche exactement ce qu'on reçoit
      return;
    }

    // form
    const base = [...cleaned];
    const need = Math.max(defaultEmptyRows, 1);
    while (base.length < need) {
      base.push({ url: "", caption: "", is_cover: base.length === 0 });
    }
    setRows(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, JSON.stringify(cleaned), defaultEmptyRows, max]);

  function emit(nextRows: PhotoItem[]) {
    if (!onChange) return;
    const normalized = normalize(nextRows, max).map((p) => ({
      url: p.url,
      caption: p.caption,
      is_cover: p.is_cover,
    }));
    onChange(normalized);
  }

  function setUrl(i: number, url: string) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, url } : r));
    setRows(next);
    emit(next);
  }

  function setCaptionForm(i: number, caption: string) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, caption } : r));
    setRows(next);
    emit(next);
  }

  function setCoverForm(i: number) {
    const next = rows.map((r, idx) => ({ ...r, is_cover: idx === i }));
    setRows(next);
    emit(next);
  }

  function addRow() {
    if (rows.length >= max) return;
    const next = [...rows, { url: "", caption: "", is_cover: rows.length === 0 }];
    setRows(next);
  }

  function pickFile() {
    setUploadErr(null);
    fileInputRef.current?.click();
  }

  async function onFileSelected(e: any) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadErr(t.pickImage);
      return;
    }

    // blocage max
    if (cleaned.length >= max) {
      setUploadErr(t.maxReached(max));
      return;
    }

    try {
      setUploading(true);
      setUploadErr(null);

      const url = await uploadImage(file);

      if (mode === "crud") {
        if (!crud) {
          setUploadErr(t.uploadErr);
          return;
        }

        setBusyGlobal(true);

        // si aucune photo => cover true, sinon false (le backend peut aussi gérer)
        const wantsCover = cleaned.length === 0;

        await crud.onCreate({
          url,
          caption: "",
          is_cover: wantsCover,
        });

        return;
      }

      // form mode: inject dans 1ère ligne vide sinon ajoute
      let targetIndex = rows.findIndex((r) => (r.url || "").trim().length === 0);
      let next = [...rows];
      if (targetIndex === -1) {
        if (next.length >= max) {
          setUploadErr(t.maxReached(max));
          return;
        }
        targetIndex = next.length;
        next.push({ url: "", caption: "", is_cover: next.length === 0 });
      }

      next[targetIndex] = {
        ...next[targetIndex],
        url,
        // si c'est la 1ère photo, cover true
        is_cover: cleaned.length === 0 ? true : next[targetIndex].is_cover,
      };

      setRows(next);
      emit(next);
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.msg || err?.message || t.uploadErr;
      setUploadErr(String(msg));
    } finally {
      setUploading(false);
      setBusyGlobal(false);
    }
  }

  function removeRowForm(i: number) {
    if (rows.length <= 1) return;
    const removedWasCover = rows[i]?.is_cover;
    const next = rows.filter((_, idx) => idx !== i);

    if (removedWasCover) {
      const firstNonEmpty = next.findIndex((r) => (r.url || "").trim().length > 0);
      const coverIndex = firstNonEmpty >= 0 ? firstNonEmpty : 0;
      for (let k = 0; k < next.length; k++) next[k].is_cover = k === coverIndex;
    }

    setRows(next);
    emit(next);
  }

  async function crudDelete(item: PhotoItem) {
    if (!crud || typeof item.id !== "number") return;
    try {
      setUploadErr(null);
      setBusyId(item.id);
      await crud.onDelete(item.id);
    } catch (err: any) {
      console.error(err);
      setUploadErr(err?.response?.data?.msg || err?.message || t.uploadErr);
    } finally {
      setBusyId(null);
    }
  }

  async function crudSetCover(item: PhotoItem) {
    if (!crud || typeof item.id !== "number") return;
    try {
      setUploadErr(null);
      setBusyId(item.id);
      await crud.onSetCover(item.id);
    } catch (err: any) {
      console.error(err);
      setUploadErr(err?.response?.data?.msg || err?.message || t.uploadErr);
    } finally {
      setBusyId(null);
    }
  }

  async function crudUpdateCaption(item: PhotoItem, caption: string) {
    if (!crud || typeof item.id !== "number") return;
    try {
      setUploadErr(null);
      setBusyId(item.id);
      await crud.onUpdateCaption(item.id, caption);
    } catch (err: any) {
      console.error(err);
      setUploadErr(err?.response?.data?.msg || err?.message || t.uploadErr);
    } finally {
      setBusyId(null);
    }
  }

  const finalTitle = title ?? t.photos;
  const finalSubtitle = subtitle ?? t.helper;

  return (
    <section dir={dir} className="rounded-2xl border bg-white p-5 space-y-3">
      <div>
        <div className="font-semibold">{finalTitle}</div>
        {finalSubtitle ? <div className="text-sm opacity-70">{finalSubtitle}</div> : null}
      </div>

      <div className="space-y-3">
        {mode === "crud" ? (
          cleaned.length === 0 ? (
            <div className="text-sm opacity-70">{t.noPhoto}</div>
          ) : (
            cleaned.map((r, idx) => {
              const isBusy = typeof r.id === "number" && busyId === r.id;
              return (
                <div key={r.id ?? idx} className="rounded-xl border p-3 space-y-2">
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    {showPreview ? (
                      <div className="w-24 h-16 rounded-lg border overflow-hidden bg-gray-50 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={r.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : null}

                    <div className="flex-1">
                      <div className="text-sm break-all opacity-70">{r.url}</div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => crudSetCover(r)}
                          className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm"
                          disabled={isBusy || busyGlobal || !!r.is_cover}
                          title={t.setCover}
                        >
                          {r.is_cover ? t.cover : t.setCover}
                        </button>

                        <button
                          type="button"
                          onClick={() => crudDelete(r)}
                          className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm"
                          disabled={isBusy || busyGlobal}
                        >
                          {isBusy ? t.deleting : t.remove}
                        </button>
                      </div>
                    </div>

                    <label className="text-sm flex items-center gap-2 whitespace-nowrap">
                      <input
                        type="radio"
                        name={coverRadioName}
                        checked={!!r.is_cover}
                        readOnly
                      />
                      {t.cover}
                    </label>
                  </div>

                  <input
                    defaultValue={r.caption}
                    onBlur={(e) => {
                      const next = (e.target.value || "").trim();
                      if (next !== (r.caption || "").trim()) {
                        crudUpdateCaption(r, next);
                      }
                    }}
                    placeholder={t.captionPh}
                    className="w-full rounded-xl border px-3 py-2"
                    disabled={isBusy || busyGlobal}
                  />
                </div>
              );
            })
          )
        ) : (
          rows.map((r, idx) => (
            <div key={idx} className="rounded-xl border p-3 space-y-2">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                {allowUrl ? (
                  <input
                    value={r.url}
                    onChange={(e) => setUrl(idx, e.target.value)}
                    placeholder={t.urlPh}
                    className="flex-1 rounded-xl border px-3 py-2"
                  />
                ) : (
                  <div className="flex-1 rounded-xl border px-3 py-2 text-sm opacity-70">
                    {r.url?.trim() ? t.added : t.noPhoto}
                  </div>
                )}

                <label className="text-sm flex items-center gap-2 whitespace-nowrap">
                  <input
                    type="radio"
                    name={coverRadioName}
                    checked={!!r.is_cover}
                    onChange={() => setCoverForm(idx)}
                    disabled={!r.url?.trim()}
                  />
                  {t.cover}
                </label>

                <button
                  type="button"
                  onClick={() => removeRowForm(idx)}
                  className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
                  disabled={rows.length <= 1}
                >
                  {t.remove}
                </button>
              </div>

              <input
                value={r.caption}
                onChange={(e) => setCaptionForm(idx, e.target.value)}
                placeholder={t.captionPh}
                className="w-full rounded-xl border px-3 py-2"
                disabled={!r.url?.trim()}
              />
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {mode === "form" && allowUrl ? (
            <button
              type="button"
              onClick={addRow}
              className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
              disabled={rows.length >= max}
            >
              {t.addUrlRow}
            </button>
          ) : null}

          <button
            type="button"
            onClick={pickFile}
            className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
            disabled={uploading || busyGlobal || cleaned.length >= max}
          >
            {uploading ? t.uploading : t.upload}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileSelected}
          />
        </div>

        <div className="text-xs opacity-70">
          {cleaned.length}/{max} {t.savedCount}
        </div>
      </div>

      {uploadErr ? <div className="text-sm text-red-600">{uploadErr}</div> : null}
    </section>
  );
}
