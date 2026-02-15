"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { uploadImage } from "@/lib/uploadImage";
import { useLang } from "@/components/LangProvider";

/**
 * NOTE:
 * - On garde is_cover en optionnel (compat backend / data existante),
 *   mais on ne l'affiche plus et on ne propose plus de le modifier côté UI.
 */
export type PhotoInput = {
  url: string;
  caption: string;
  is_cover?: boolean;
};

export type PhotoItem = PhotoInput & {
  id?: number; // utile en mode CRUD
};

type CrudHandlers = {
  onCreate: (item: PhotoInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onUpdateCaption: (id: number, caption: string) => Promise<void>;
};

type Props = {
  title?: string;
  subtitle?: string;
  max?: number; // default 8
  allowUrl?: boolean; // default true
  showPreview?: boolean; // default true

  /** conservé pour compat (plus utilisé) */
  radioGroupName?: string;

  mode?: "form" | "crud";

  // ---- form mode ----
  value: PhotoItem[];
  onChange?: (next: PhotoInput[]) => void;
  defaultEmptyRows?: number; // default 1 (form mode)

  // ---- crud mode ----
  crud?: CrudHandlers;
};

function normalize(list: PhotoItem[], max: number) {
  const limit = Number.isFinite(max) ? Math.max(0, max) : 0;
  const arr = Array.isArray(list) ? list : [];

  return arr
    .slice(0, limit)
    .map((p) => ({
      id: typeof p?.id === "number" ? p.id : undefined,
      url: (p?.url || "").trim(),
      caption: (p?.caption || "").trim(),
      // is_cover est ignoré côté UI (mais conservé en data si présent)
      is_cover: p?.is_cover,
    }))
    .filter((p) => p.url.length > 0);
}

export default function PhotoUrlPicker({
  title,
  subtitle,
  max = 8,
  allowUrl = true,
  showPreview = true,
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
      helper: "Ajoutez des photos et une description (caption) pour chacune.",
      urlPh: "URL de l’image (https://...)",
      noPhoto: "Aucune photo (utilisez « Uploader une photo »)",
      remove: "Retirer",
      captionPh: "Description (caption) — optionnel",
      addUrlRow: "+ Ajouter une ligne URL",
      upload: "📤 Uploader une photo",
      uploading: "Upload…",
      pickImage: "Veuillez sélectionner un fichier image.",
      maxReached: (n: number) => `Maximum ${n} photos.`,
      uploadErr: "Erreur lors de l'upload",
      saving: "Enregistrement…",
      deleting: "Suppression…",
      // Mobile premium
      captionLabel: "Description",
      saveHint: "La description est enregistrée automatiquement.",
    };
    const ar = {
      photos: "الصور",
      helper: "أضِف صوراً واكتب وصفاً (caption) لكل صورة.",
      urlPh: "رابط الصورة (https://...)",
      noPhoto: "لا توجد صور (استعمل « رفع صورة »)",
      remove: "حذف",
      captionPh: "الوصف (caption) — اختياري",
      addUrlRow: "+ إضافة سطر رابط",
      upload: "📤 رفع صورة",
      uploading: "جارٍ الرفع…",
      pickImage: "المرجو اختيار ملف صورة.",
      maxReached: (n: number) => `الحد الأقصى ${n} صور.`,
      uploadErr: "خطأ أثناء الرفع",
      saving: "جارٍ الحفظ…",
      deleting: "جارٍ الحذف…",
      // Mobile premium
      captionLabel: "الوصف",
      saveHint: "يتم حفظ الوصف تلقائياً.",
    };
    return lang === "ar" ? ar : fr;
  }, [lang]);

  const uid = useId();
  const coverRadioName = `__cover_${uid}`; // conservé (non utilisé)
  void coverRadioName;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const cleaned = useMemo(() => normalize(value || [], max), [value, max]);

  const [rows, setRows] = useState<PhotoItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [busyGlobal, setBusyGlobal] = useState(false);

  useEffect(() => {
    if (mode === "crud") {
      setRows(cleaned);
      return;
    }

    const limit = Number.isFinite(max) ? Math.max(0, max) : 0;
    const need = Math.min(Math.max(defaultEmptyRows, 1), Math.max(limit, 1));

    const base: PhotoItem[] = [...cleaned];

    while (base.length < need) {
      base.push({ id: undefined, url: "", caption: "" });
    }

    if (limit === 0 && base.length === 0) {
      base.push({ id: undefined, url: "", caption: "" });
    }

    setRows(base);
  }, [mode, cleaned, defaultEmptyRows, max]);

  function emit(nextRows: PhotoItem[]) {
    if (!onChange) return;
    const normalized = normalize(nextRows, max).map((p) => ({
      url: p.url,
      caption: p.caption,
      // pas de is_cover côté UI
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

  function addRow() {
    if (rows.length >= max) return;
    const next: PhotoItem[] = [...rows, { id: undefined, url: "", caption: "" }];
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

    setUploading(true);
    setUploadErr(null);

    try {
      const url = await uploadImage(file);

      if (mode === "crud") {
        if (!crud) return;

        // Option A : cover interne possible côté serveur.
        // On marque la 1ère photo envoyée comme cover si aucune photo n'existe.
        const wantsCover = cleaned.length === 0;

        await crud.onCreate({
          url,
          caption: "",
          is_cover: wantsCover ? true : undefined,
        });

        return;
      }

      let targetIndex = rows.findIndex((r) => (r.url || "").trim().length === 0);
      let next: PhotoItem[] = [...rows];

      if (targetIndex === -1) {
        if (next.length >= max) {
          setUploadErr(t.maxReached(max));
          return;
        }
        targetIndex = next.length;
        next.push({ id: undefined, url: "", caption: "" });
      }

      next[targetIndex] = { ...next[targetIndex], url };

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
    const next = rows.filter((_, idx) => idx !== i);
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
      const msg = err?.response?.data?.msg || err?.message || "Erreur";
      setUploadErr(String(msg));
    } finally {
      setBusyId(null);
    }
  }

  async function crudUpdateCaption(item: PhotoItem, caption: string) {
    if (!crud || typeof item.id !== "number") return;
    try {
      setUploadErr(null);
      setBusyId(item.id);
      setBusyGlobal(true);
      await crud.onUpdateCaption(item.id, caption);
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.msg || err?.message || "Erreur";
      setUploadErr(String(msg));
    } finally {
      setBusyId(null);
      setBusyGlobal(false);
    }
  }

  return (
    <div dir={dir} className="space-y-3">
      <div className="space-y-1">
        <div className="font-semibold">{title || t.photos}</div>
        <div className="text-sm opacity-70">{subtitle || t.helper}</div>
      </div>

      {uploadErr ? <div className="text-sm text-red-600">{uploadErr}</div> : null}

      {/* Controls: premium mobile (stack full width), desktop unchanged */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />

        <button
          type="button"
          onClick={pickFile}
          className="w-full sm:w-auto px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
          disabled={uploading}
        >
          {uploading ? t.uploading : t.upload}
        </button>

        {allowUrl && mode === "form" ? (
          <button
            type="button"
            onClick={addRow}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
            disabled={rows.length >= max}
          >
            {t.addUrlRow}
          </button>
        ) : null}
      </div>

      {mode === "crud" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cleaned.length === 0 ? (
            <div className="text-sm opacity-70">{t.noPhoto}</div>
          ) : (
            cleaned.map((r) => {
              const isBusy = typeof r.id === "number" && busyId === r.id;

              return (
                <div key={r.id ?? r.url} className="rounded-2xl border bg-white overflow-hidden">
                  {showPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.url} alt="" className="w-full h-40 sm:h-44 object-cover" />
                  ) : null}

                  <div className="p-3 space-y-2">
                    {/* Mobile: delete full width; Desktop: aligned right */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                      <button
                        type="button"
                        onClick={() => crudDelete(r)}
                        className="w-full sm:w-auto px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm"
                        disabled={isBusy || busyGlobal}
                      >
                        {isBusy ? t.deleting : t.remove}
                      </button>
                    </div>

                    {/* Caption: textarea mobile (better typing), input desktop (unchanged behavior onBlur) */}
                    <div className="space-y-1">
                      <div className="text-xs opacity-70">{t.captionLabel}</div>

                      <textarea
                        className="w-full border rounded-xl px-3 py-2 text-sm min-h-[72px] sm:hidden"
                        defaultValue={r.caption}
                        placeholder={t.captionPh}
                        onBlur={(e) => {
                          const next = (e.target.value || "").trim();
                          if (next !== (r.caption || "").trim()) {
                            crudUpdateCaption(r, next);
                          }
                        }}
                        disabled={isBusy || busyGlobal}
                      />

                      <input
                        className="w-full border rounded-xl px-3 py-2 text-sm hidden sm:block"
                        defaultValue={r.caption}
                        placeholder={t.captionPh}
                        onBlur={(e) => {
                          const next = (e.target.value || "").trim();
                          if (next !== (r.caption || "").trim()) {
                            crudUpdateCaption(r, next);
                          }
                        }}
                        disabled={isBusy || busyGlobal}
                      />

                      <div className="text-[11px] opacity-60">{t.saveHint}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r, idx) => (
            <div key={idx} className="rounded-2xl border bg-white p-3 space-y-2">
              <input
                value={r.url}
                onChange={(e) => setUrl(idx, e.target.value)}
                placeholder={t.urlPh}
                className="w-full border rounded-xl px-3 py-2 text-sm"
              />

              {showPreview && r.url?.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.url} alt="" className="w-full h-40 sm:h-44 object-cover rounded-xl border" />
              ) : null}

              <div className="space-y-1">
                <div className="text-xs opacity-70">{t.captionLabel}</div>
                <textarea
                  value={r.caption}
                  onChange={(e) => setCaptionForm(idx, e.target.value)}
                  placeholder={t.captionPh}
                  className="w-full border rounded-xl px-3 py-2 text-sm min-h-[72px]"
                />
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => removeRowForm(idx)}
                  className="w-full sm:w-auto px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
                  disabled={rows.length <= 1}
                >
                  {t.remove}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
