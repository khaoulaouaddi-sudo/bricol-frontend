"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/LangProvider";
import PhotoUrlPicker, { PhotoItem } from "@/components/PhotoUrlPicker";

const MAX_COMPANY_PHOTOS = 10;

const i18n = {
  fr: {
    loading: "Chargement…",
    back: "Retour",
    title: "Modifier le profil entreprise",
    subtitle: "Modifie les informations et gère les photos (Cloudinary uniquement).",
    save: "Enregistrer",
    saving: "Enregistrement…",
    saved: "Profil mis à jour.",
    loadFail: "Impossible de charger le profil entreprise.",
    saveFail: "Impossible d’enregistrer.",
    invalidId: "Identifiant invalide.",

    name: "Nom / Raison sociale",
    city: "Ville",
    choose: "— Choisir —",
    location: "Adresse / Quartier",
    phone: "Téléphone",
    email: "Email",
    website: "Site web",
    desc: "Description",

    sectors: "Secteurs d’activité",
    sectorsPlaceholder: "Choisir des secteurs…",
    sectorsSearchPh: "Rechercher un secteur…",
    sectorsSelected: (n: number) =>
      n === 0 ? "Aucun secteur sélectionné" : `${n} secteur(s) sélectionné(s)`,

    photosTitle: "Photos entreprise",
    photosSubtitle:
      "Choisis une photo de couverture : elle s’affiche sur la carte (accueil, recherche, etc.).",
    cover: "Couverture",

    publicView: "Voir public",
  },
  ar: {
    loading: "جار التحميل…",
    back: "رجوع",
    title: "تعديل ملف الشركة",
    subtitle: "عدّل المعلومات وأدر الصور (رفع Cloudinary فقط).",
    save: "حفظ",
    saving: "جار الحفظ…",
    saved: "تم تحديث الملف.",
    loadFail: "تعذر تحميل ملف الشركة.",
    saveFail: "تعذر الحفظ.",
    invalidId: "معرّف غير صالح.",

    name: "اسم الشركة",
    city: "المدينة",
    choose: "— اختر —",
    location: "العنوان / الحي",
    phone: "الهاتف",
    email: "البريد الإلكتروني",
    website: "الموقع",
    desc: "الوصف",

    sectors: "القطاعات",
    sectorsPlaceholder: "اختر القطاعات…",
    sectorsSearchPh: "ابحث عن قطاع…",
    sectorsSelected: (n: number) => (n === 0 ? "لم يتم اختيار أي قطاع" : `تم اختيار ${n}`),

    photosTitle: "صور الشركة",
    photosSubtitle: "اختر صورة الغلاف لأنها تظهر في البطاقات (الرئيسية/البحث...).",
    cover: "الغلاف",

    publicView: "عرض عام",
  },
} as const;

type City = {
  id: number;
  slug?: string | null;
  name_fr?: string | null;
  name_ar?: string | null;
  display_name?: string | null;
};

type Umbrella = {
  id: number;
  name: string;
  display_name?: string | null;
  sectors: Array<{
    id: number;
    label?: string | null;
    display_label?: string | null;
  }>;
};

type CompanyPhoto = {
  id: number;
  image_url: string;
  caption: string | null;
  is_cover: boolean;
};

type CompanyDetail = {
  id: number;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  location?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  city_id?: number | null;
  city?: City | null;
  photos?: CompanyPhoto[] | null;
};

type CompanySectorRow = {
  id: number;
  company_id: number;
  sector_id: number;
  slug?: string | null;
  name?: string | null;
  worker_label_fr?: string | null;
  company_label_fr?: string | null;
};

function safeNumber(v: unknown) {
  if (Array.isArray(v)) v = v[0];
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function labelCity(c: City, lang: "fr" | "ar") {
  return c.display_name ?? (lang === "ar" ? c.name_ar : c.name_fr) ?? c.name_fr ?? c.slug ?? `#${c.id}`;
}

function umbrellaLabel(u: Umbrella) {
  return u.display_name ?? u.name ?? `#${u.id}`;
}
function sectorLabel(s: Umbrella["sectors"][number]) {
  return s.display_label ?? s.label ?? `#${s.id}`;
}

function pickCoverUrl(photos: CompanyPhoto[] | null | undefined) {
  if (!photos || photos.length === 0) return null;
  const cover = photos.find((p) => p.is_cover) ?? photos[0];
  return cover?.image_url ?? null;
}

/** Dropdown compact multi-select (checkboxes) */
function SectorDropdown(props: {
  disabled?: boolean;
  umbrellas: Umbrella[];
  value: number[];
  onChange: (next: number[]) => void;
  placeholder: string;
  searchPlaceholder: string;
  selectedText: (n: number) => string;
}) {
  const { umbrellas, value, onChange, disabled, placeholder, searchPlaceholder, selectedText } = props;

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selectedSet = useMemo(() => new Set(value), [value]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return umbrellas;

    return umbrellas
      .map((u) => {
        const secs = u.sectors.filter((s) => sectorLabel(s).toLowerCase().includes(query));
        return { ...u, sectors: secs };
      })
      .filter((u) => u.sectors.length > 0);
  }, [umbrellas, q]);

  function toggle(id: number) {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-xl border px-3 py-2 bg-white text-left disabled:opacity-60"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            {value.length === 0 ? <span className="opacity-70">{placeholder}</span> : <span>{selectedText(value.length)}</span>}
          </div>
          <div className="text-xs opacity-60">{open ? "▲" : "▼"}</div>
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl border bg-white shadow-sm">
          <div className="p-3 border-b">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
              placeholder={searchPlaceholder}
            />
          </div>

          <div className="max-h-[320px] overflow-auto p-2">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm opacity-70">—</div>
            ) : (
              filtered.map((u) => (
                <div key={u.id} className="mb-2">
                  <div className="px-2 py-1 text-xs font-semibold opacity-70">{umbrellaLabel(u)}</div>
                  <div className="space-y-1">
                    {u.sectors.map((s) => {
                      const checked = selectedSet.has(s.id);
                      return (
                        <label
                          key={s.id}
                          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input type="checkbox" checked={checked} onChange={() => toggle(s.id)} />
                          <span className="text-sm">{sectorLabel(s)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t flex justify-end">
            <button
              type="button"
              className="px-3 py-1 rounded-lg border bg-white hover:bg-gray-50 text-sm"
              onClick={() => setOpen(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CompanyEditPage() {
  return (
    <RequireAuth>
      <CompanyEditClient />
    </RequireAuth>
  );
}

function CompanyEditClient() {
  const router = useRouter();
  const params = useParams();

  const companyId = useMemo(() => safeNumber((params as unknown as { id?: string })?.id), [params]);

  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const base = `/${lang}`;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cities, setCities] = useState<City[]>([]);
  const [umbrellas, setUmbrellas] = useState<Umbrella[]>([]);

  const [detail, setDetail] = useState<CompanyDetail | null>(null);

  // form
  const [name, setName] = useState("");
  const [cityId, setCityId] = useState<number | null>(null);
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [desc, setDesc] = useState("");

  const [sectorIds, setSectorIds] = useState<number[]>([]);
  const [photos, setPhotos] = useState<CompanyPhoto[]>([]);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function reloadPhotos(id: number) {
    const rows = await api
      .get(`/company-photos/company/${id}`)
      .then((r) => (Array.isArray(r.data) ? (r.data as CompanyPhoto[]) : []));
    setPhotos(rows);
  }

  async function reloadSectors(id: number) {
    const rows = await api
      .get(`/company-profiles/${id}/sectors`)
      .then((r) => (Array.isArray(r.data) ? (r.data as CompanySectorRow[]) : []));
    const ids = rows.map((x) => Number(x.sector_id)).filter((n) => Number.isInteger(n));
    setSectorIds(ids);
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (!companyId || Number.isNaN(companyId)) {
          setError(t.invalidId);
          return;
        }

        const [citiesRes, umbrellasRes, companyRes] = await Promise.all([
          api.get("/cities").then((r) => (Array.isArray(r.data) ? (r.data as City[]) : [])),
          api.get("/umbrellas", { params: { type: "company" } }).then((r) => (Array.isArray(r.data) ? (r.data as unknown[]) : [])),
          api.get(`/company-profiles/${companyId}`, { params: { lang } }).then((r) => r.data as CompanyDetail),
        ]);

        if (!alive) return;

        setCities(citiesRes);

        const normalizedUmbrellas: Umbrella[] = umbrellasRes.map((u) => {
          const uu = u as {
            id: number;
            name: string;
            display_name?: string | null;
            sectors?: Array<{ id: number; label?: string | null; name?: string | null; slug?: string | null; display_label?: string | null }>;
          };
          return {
            id: uu.id,
            name: uu.name,
            display_name: uu.display_name ?? null,
            sectors: Array.isArray(uu.sectors)
              ? uu.sectors.map((s) => ({
                  id: s.id,
                  label: s.display_label ?? s.label ?? s.name ?? s.slug ?? null,
                  display_label: s.display_label ?? null,
                }))
              : [],
          };
        });

        setUmbrellas(normalizedUmbrellas);

        setDetail(companyRes);

        setName(companyRes.name ?? "");
        setCityId(typeof companyRes.city_id === "number" ? companyRes.city_id : null);
        setLocation(companyRes.location ?? "");
        setPhone(companyRes.phone ?? "");
        setEmail(companyRes.email ?? "");
        setWebsite(companyRes.website ?? "");
        setDesc(companyRes.description ?? "");

        setPhotos(Array.isArray(companyRes.photos) ? companyRes.photos : []);

        await reloadSectors(companyId);
      } catch (e) {
        console.error(e);
        if (alive) setError(t.loadFail);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [companyId, lang, t.invalidId, t.loadFail]);

  async function save() {
    if (!companyId || Number.isNaN(companyId)) return;

    try {
      setBusy(true);
      setMsg(null);

      // 1) update company profile
      await api.put(`/company-profiles/${companyId}`, {
        name: name.trim() || null,
        city_id: cityId,
        location: location.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        description: desc.trim() || null,
      });

      // 2) sync sectors (diff)
      const current = await api
        .get(`/company-profiles/${companyId}/sectors`)
        .then((r) => (Array.isArray(r.data) ? (r.data as CompanySectorRow[]) : []));

      const currentIds = current.map((x) => Number(x.sector_id)).filter((n) => Number.isInteger(n));

      const want = [...sectorIds].sort((a, b) => a - b);
      const have = [...currentIds].sort((a, b) => a - b);

      const toAdd = want.filter((x) => !have.includes(x));
      const toDel = have.filter((x) => !want.includes(x));

      for (const sid of toAdd) {
        await api.post(`/company-profiles/${companyId}/sectors`, { sector_id: sid });
      }
      for (const sid of toDel) {
        await api.delete(`/company-profiles/${companyId}/sectors/${sid}`);
      }

      // reload fresh detail (optional but safe)
      const fresh = await api.get(`/company-profiles/${companyId}`, { params: { lang } }).then((r) => r.data as CompanyDetail);
      setDetail(fresh);
      setPhotos(Array.isArray(fresh.photos) ? fresh.photos : []);
      await reloadSectors(companyId);

      setMsg(t.saved);
    } catch (e: unknown) {
      console.error(e);
      setMsg(t.saveFail);
    } finally {
      setBusy(false);
    }
  }

  async function photoCreate(item: { url: string; caption: string; is_cover: boolean }) {
    if (!companyId || Number.isNaN(companyId)) return;

    await api.post("/company-photos", {
      company_id: companyId,
      image_url: item.url,
      caption: item.caption || null,
      is_cover: item.is_cover,
    });
    await reloadPhotos(companyId);
  }

  async function photoDelete(photoId: number) {
    if (!companyId || Number.isNaN(companyId)) return;
    await api.delete(`/company-photos/${photoId}`);
    await reloadPhotos(companyId);
  }

  async function photoSetCover(photoId: number) {
    if (!companyId || Number.isNaN(companyId)) return;
    await api.patch(`/company-photos/${photoId}`, { is_cover: true });
    await reloadPhotos(companyId);
  }

  async function photoUpdateCaption(photoId: number, caption: string) {
    if (!companyId || Number.isNaN(companyId)) return;
    await api.patch(`/company-photos/${photoId}`, { caption });
    await reloadPhotos(companyId);
  }

  if (loading) {
    return (
      <main dir={dir} className="max-w-6xl mx-auto p-6">
        <div className="border rounded-xl p-4">{t.loading}</div>
      </main>
    );
  }

  if (error) {
    return (
      <main dir={dir} className="max-w-6xl mx-auto p-6 space-y-3">
        <div className="border rounded-xl p-4 text-red-600">{error}</div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => router.push(`${base}/account?tab=company`)}>
            {t.back}
          </Button>
          <Link href={base}>
            <Button variant="outline">{t.back}</Button>
          </Link>
        </div>
      </main>
    );
  }

  const publicTitle = (detail?.name ?? detail?.title ?? "").trim() || `#${companyId}`;
  const cover = pickCoverUrl(photos);

  const photoItems: PhotoItem[] = photos.map((p) => ({
    id: p.id,
    url: p.image_url,
    caption: p.caption ?? "",
    is_cover: !!p.is_cover,
  }));

  return (
    <main dir={dir} className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <div className="text-sm opacity-70">{t.subtitle}</div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link href={`${base}/company/${companyId}`}>
            <Button variant="outline">{t.publicView}</Button>
          </Link>
          <Button variant="outline" onClick={() => router.push(`${base}/account?tab=company`)}>
            {t.back}
          </Button>
        </div>
      </header>

      <section className="rounded-2xl border bg-white overflow-hidden">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={publicTitle} className="w-full h-56 object-cover" />
        ) : (
          <div className="w-full h-56 bg-gray-100 flex items-center justify-center text-sm text-gray-500">—</div>
        )}

        <div className="p-5 space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-sm opacity-70">{t.name}</div>
              <input className="w-full rounded-xl border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-1">
              <div className="text-sm opacity-70">{t.city}</div>
              <select
                className="w-full rounded-xl border px-3 py-2"
                value={cityId ?? ""}
                onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">{t.choose}</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {labelCity(c, lang)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="text-sm opacity-70">{t.location}</div>
              <input className="w-full rounded-xl border px-3 py-2" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>

            <div className="space-y-1">
              <div className="text-sm opacity-70">{t.phone}</div>
              <input className="w-full rounded-xl border px-3 py-2" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="space-y-1">
              <div className="text-sm opacity-70">{t.email}</div>
              <input className="w-full rounded-xl border px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="space-y-1">
              <div className="text-sm opacity-70">{t.website}</div>
              <input className="w-full rounded-xl border px-3 py-2" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>

            <div className="space-y-1 md:col-span-2">
              <div className="text-sm opacity-70">{t.desc}</div>
              <textarea
                className="w-full rounded-xl border px-3 py-2 min-h-[120px]"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
          </div>

          {/* sectors */}
          <div className="space-y-2">
            <div className="text-sm opacity-70">{t.sectors}</div>
            <SectorDropdown
              disabled={false}
              umbrellas={umbrellas}
              value={sectorIds}
              onChange={setSectorIds}
              placeholder={t.sectorsPlaceholder}
              searchPlaceholder={t.sectorsSearchPh}
              selectedText={(n) => t.sectorsSelected(n)}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={save} disabled={busy}>
              {busy ? t.saving : t.save}
            </Button>
            {msg ? <div className="text-sm opacity-80">{msg}</div> : null}
          </div>
        </div>
      </section>

      {/* photos */}
      <section className="rounded-2xl border bg-white p-5 space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-lg font-semibold">{t.photosTitle}</div>
            <div className="text-sm opacity-70">{t.photosSubtitle}</div>
          </div>
          <div className="text-sm opacity-70">
            {photos.length}/{MAX_COMPANY_PHOTOS}
          </div>
        </div>

        <PhotoUrlPicker
          mode="crud"
          max={MAX_COMPANY_PHOTOS}
          allowUrl={false}
          value={photoItems}
          radioGroupName={`company-${companyId}`}
          crud={{
            onCreate: async (item) => {
              await photoCreate(item);
            },
            onDelete: async (photoId) => {
              await photoDelete(photoId);
            },
            onSetCover: async (photoId) => {
              await photoSetCover(photoId);
            },
            onUpdateCaption: async (photoId, caption) => {
              await photoUpdateCaption(photoId, caption);
            },
          }}
          title={t.photosTitle}
          subtitle=""
        />
      </section>
    </main>
  );
}
