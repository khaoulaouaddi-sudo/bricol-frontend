"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { api } from "@/lib/api";
import { useLang } from "@/components/LangProvider";
import { uploadImage } from "@/lib/uploadImage";

// ✅ aligné avec le backend: company = 10
const MAX_COMPANY_PHOTOS = 10;

const i18n = {
  fr: {
    loading: "Chargement…",
    pageLoadFail: "Impossible de charger la page de création entreprise.",
    createTitle: "Créer un compte entreprise",
    subtitle: "Votre entreprise sera visible immédiatement.",
    cancel: "Annuler",
    creating: "Création…",
    create: "Créer",
    name: "Nom / Raison sociale",
    namePh: "Ex: Bricola SARL",
    city: "Ville",
    choose: "— Choisir —",
    address: "Adresse / Quartier",
    addressPh: "Ex: Maarif, Bourgogne...",
    phone: "Téléphone",
    phonePh: "+212...",
    email: "Email",
    emailPh: "contact@...",
    desc: "Description",
    descPh: "Décrivez votre activité, horaires, services...",

    sectors: "Secteurs d’activité",
    sectorsPlaceholder: "Choisir des secteurs…",
    sectorsSearchPh: "Rechercher un secteur…",
    sectorsSelected: (n: number) =>
      n === 0 ? "Aucun secteur sélectionné" : `${n} secteur(s) sélectionné(s)`,
    sectorsRequired: "Veuillez sélectionner au moins un secteur.",

    photosTitle: "Photos entreprise",
    photosSubtitle:
      "Upload Cloudinary uniquement. Ajoutez jusqu’à 10 photos et une description pour chacune.",
    addPhotos: "Ajouter des photos",
    addMore: "Ajouter encore",
    uploading: "Upload…",
    photosCount: (n: number) => `${n}/${MAX_COMPANY_PHOTOS} photo(s)`,
    maxReached: `Limite atteinte : ${MAX_COMPANY_PHOTOS} photos maximum.`,
    captionLabel: "Description (optionnel)",
    captionPh: "Ex: Chantier réalisé à Casablanca…",
    remove: "Retirer",
    uploadFail: "Échec upload photo.",
    createErr: "Erreur lors de la création entreprise.",
    ok: "OK",

    // UI photos mobile
    prev: "Précédent",
    next: "Suivant",
  },
  ar: {
    loading: "جار التحميل…",
    pageLoadFail: "تعذر تحميل صفحة إنشاء الشركة.",
    createTitle: "إنشاء حساب شركة",
    subtitle: "ستظهر شركتك مباشرة.",
    cancel: "إلغاء",
    creating: "جار الإنشاء…",
    create: "إنشاء",
    name: "اسم الشركة",
    namePh: "مثال: Bricola SARL",
    city: "المدينة",
    choose: "— اختر —",
    address: "العنوان / الحي",
    addressPh: "مثال: المعاريف، بورغون...",
    phone: "الهاتف",
    phonePh: "+212...",
    email: "البريد الإلكتروني",
    emailPh: "contact@...",
    desc: "الوصف",
    descPh: "عرّف بنشاطك، الأوقات، الخدمات...",

    sectors: "القطاعات",
    sectorsPlaceholder: "اختر القطاعات…",
    sectorsSearchPh: "ابحث عن قطاع…",
    sectorsSelected: (n: number) =>
      n === 0 ? "لم يتم اختيار أي قطاع" : `تم اختيار ${n} قطاع(ات)`,
    sectorsRequired: "يرجى اختيار قطاع واحد على الأقل.",

    photosTitle: "صور الشركة",
    photosSubtitle:
      "رفع Cloudinary فقط. أضف حتى 10 صور مع وصف لكل صورة.",
    addPhotos: "إضافة صور",
    addMore: "إضافة المزيد",
    uploading: "جار الرفع…",
    photosCount: (n: number) => `${n}/${MAX_COMPANY_PHOTOS} صورة`,
    maxReached: `تم بلوغ الحد الأقصى: ${MAX_COMPANY_PHOTOS} صورة.`,
    captionLabel: "وصف الصورة (اختياري)",
    captionPh: "مثال: أشغال في الدار البيضاء…",
    remove: "حذف",
    uploadFail: "فشل رفع الصورة.",
    createErr: "حدث خطأ أثناء إنشاء الشركة.",
    ok: "حسنًا",

    // UI photos mobile
    prev: "السابق",
    next: "التالي",
  },
} as const;

type Me = {
  id: number;
  role: "visitor" | "worker" | "company" | "admin";
};

type City = {
  id: number;
  slug?: string;
  name_fr: string;
  name?: string | null;
  name_ar?: string | null;
  display_name?: string | null;
  region?: string | null;
};

type Umbrella = {
  id: number;
  name: string;
  name_ar?: string | null;
  display_name?: string | null;
  sectors: Array<{
    id: number;
    label: string;
    label_ar?: string | null;
    display_label?: string | null;
    name_ar?: string | null;
    name?: string | null;
    slug?: string;
  }>;
};

type NewPhoto = {
  id: string;
  url: string;
  caption: string;
  // ✅ conservé uniquement pour compat (Option A), jamais affiché dans l’UI
  is_cover: boolean;
};

function labelCity(c: City, lang: "fr" | "ar") {
  return (
    c.display_name ??
    (lang === "ar" ? c.name_ar : c.name_fr) ??
    c.name_fr ??
    c.name ??
    c.slug ??
    `#${c.id}`
  );
}

function umbrellaLabel(u: Umbrella, lang: "fr" | "ar") {
  return (
    u.display_name ??
    (lang === "ar" ? u.name_ar : u.name) ??
    u.name ??
    `#${u.id}`
  );
}

function sectorLabel(s: Umbrella["sectors"][number], lang: "fr" | "ar") {
  return (
    s.display_label ??
    (lang === "ar" ? (s.label_ar ?? s.name_ar) : s.label) ??
    s.label ??
    s.name ??
    s.slug ??
    `#${s.id}`
  );
}

function SectorDropdown(props: {
  lang: "fr" | "ar";
  disabled?: boolean;
  umbrellas: Umbrella[];
  value: number[];
  onChange: (next: number[]) => void;
  t: {
    sectorsPlaceholder: string;
    sectorsSearchPh: string;
    sectorsSelected: (n: number) => string;
    ok: string;
  };
}) {
  const { umbrellas, value, onChange, disabled, t, lang } = props;

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selectedSet = useMemo(() => new Set(value), [value]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return umbrellas;

    return umbrellas
      .map((u) => {
        const secs = u.sectors.filter((s) =>
          sectorLabel(s, lang).toLowerCase().includes(query)
        );
        return { ...u, sectors: secs };
      })
      .filter((u) => u.sectors.length > 0);
  }, [umbrellas, q, lang]);

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
        className="mt-1 w-full rounded-xl border px-3 py-2 bg-white text-left disabled:opacity-60"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            {value.length === 0 ? (
              <span className="opacity-70">{t.sectorsPlaceholder}</span>
            ) : (
              <span>{t.sectorsSelected(value.length)}</span>
            )}
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
              placeholder={t.sectorsSearchPh}
            />
          </div>

          <div className="max-h-[320px] overflow-auto p-2">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm opacity-70">—</div>
            ) : (
              filtered.map((u) => (
                <div key={u.id} className="mb-2">
                  <div className="px-2 py-1 text-xs font-semibold opacity-70">
                    {umbrellaLabel(u, lang)}
                  </div>
                  <div className="space-y-1">
                    {u.sectors.map((s) => {
                      const checked = selectedSet.has(s.id);
                      return (
                        <label
                          key={s.id}
                          className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(s.id)}
                          />
                          <span className="text-sm">{sectorLabel(s, lang)}</span>
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
              {t.ok}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CompanyNewPage() {
  return (
    <RequireAuth>
      <CompanyNewInner />
    </RequireAuth>
  );
}

function CompanyNewInner() {
  const router = useRouter();

  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const base = `/${lang}`;

  const [me, setMe] = useState<Me | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // refs
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [umbrellas, setUmbrellas] = useState<Umbrella[]>([]);

  // form
  const [name, setName] = useState("");
  const [cityId, setCityId] = useState<number | null>(null);
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");

  // sectors
  const [sectorIds, setSectorIds] = useState<number[]>([]);

  // photos (Cloudinary)
  const [photos, setPhotos] = useState<NewPhoto[]>([]);
  const [uploading, setUploading] = useState(false);

  // ✅ mobile carousel state (UI-only)
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedCity = useMemo(() => {
    if (!cityId) return null;
    return cities.find((c) => c.id === cityId) || null;
  }, [cities, cityId]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setPageLoading(true);
        setErr(null);

        const meData: Me = await api.get("/users/me").then((r) => r.data);
        if (!alive) return;
        setMe(meData);

        // si déjà company, pas de création
        if (meData.role === "company") {
          router.replace(`${base}/account?tab=company`);
          return;
        }

        setLoadingRefs(true);
        const [cRes, uRes] = await Promise.all([
          api.get("/cities"),
          api.get("/umbrellas", { params: { type: "company" } }),
        ]);

        if (!alive) return;

        setCities(Array.isArray(cRes.data) ? cRes.data : []);

        const rawU = Array.isArray(uRes.data) ? uRes.data : [];
        setUmbrellas(
          rawU.map((u: any) => ({
            id: u.id,
            name: u.name,
            name_ar: u.name_ar,
            display_name: u.display_name,
            sectors: Array.isArray(u.sectors)
              ? u.sectors.map((s: any) => ({
                  id: s.id,
                  label: s.label || s.name || s.slug,
                  label_ar: s.label_ar,
                  display_label: s.display_label,
                  name_ar: s.name_ar,
                  name: s.name,
                  slug: s.slug,
                }))
              : [],
          }))
        );
      } catch (e) {
        console.error(e);
        if (alive) setErr(t.pageLoadFail);
      } finally {
        if (alive) {
          setLoadingRefs(false);
          setPageLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [router, t.pageLoadFail, base]);

  // --- Photos helpers (stable, minimal) ---
  // Option A interne : si aucune cover, la 1ère photo devient cover (jamais affiché dans l’UI)
  function ensureCover(next: NewPhoto[]) {
    if (next.length === 0) return next;
    if (next.some((p) => p.is_cover)) return next;
    const copy = [...next];
    copy[0] = { ...copy[0], is_cover: true };
    return copy;
  }

  async function pickAndUploadPhotos() {
    const remaining = MAX_COMPANY_PHOTOS - photos.length;
    if (remaining <= 0) {
      setErr(t.maxReached);
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;

    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (files.length === 0) return;

      const slice = files.slice(0, remaining);

      try {
        setErr(null);
        setUploading(true);

        const uploaded: NewPhoto[] = [];

        for (const file of slice) {
          const url = await uploadImage(file);
          uploaded.push({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            url,
            caption: "",
            is_cover: false,
          });
        }

        setPhotos((prev) => {
          const next = ensureCover([...prev, ...uploaded]);
          // UI-only: reset index if needed
          setActiveIndex(0);
          return next;
        });
      } catch (e) {
        console.error(e);
        setErr(t.uploadFail);
      } finally {
        setUploading(false);
      }
    };

    input.click();
  }

  function updateCaption(id: string, caption: string) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, caption } : p)));
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const next = ensureCover(prev.filter((p) => p.id !== id));
      // UI-only: clamp activeIndex
      const nextIndex = Math.min(activeIndex, Math.max(0, next.length - 1));
      setActiveIndex(nextIndex);
      requestAnimationFrame(() => {
        if (scrollerRef.current) {
          scrollerRef.current.scrollTo({ left: 0, behavior: "smooth" });
        }
      });
      return next;
    });
  }

  function onScrollCarousel() {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    const idx = Math.round(el.scrollLeft / w);
    if (idx !== activeIndex) setActiveIndex(idx);
  }

  function scrollToIndex(idx: number) {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    el.scrollTo({ left: idx * w, behavior: "smooth" });
    setActiveIndex(idx);
  }

  function prevPhoto() {
    if (photos.length === 0) return;
    const next = (activeIndex - 1 + photos.length) % photos.length;
    scrollToIndex(next);
  }

  function nextPhoto() {
    if (photos.length === 0) return;
    const next = (activeIndex + 1) % photos.length;
    scrollToIndex(next);
  }

  async function handleCreate() {
    if (!me) return;

    setErr(null);
    setBusy(true);

    try {
      if (sectorIds.length === 0) {
        setErr(t.sectorsRequired);
        return;
      }

      // 1) Create company profile (+ sector_ids)
      const res = await api.post("/company-profiles", {
        name: name.trim(),
        city_id: cityId,
        location: location.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        description: description.trim() || null,
        sector_ids: sectorIds,
      });

      const companyId = res?.data?.id;

      // 2) Insert photos (image_url + caption + is_cover) — Option A interne, pas d’UI cover
      if (companyId && photos.length > 0) {
        const withCover = ensureCover([...photos]);
        for (const p of withCover) {
          await api.post("/company-photos", {
            company_id: companyId,
            image_url: p.url,
            caption: p.caption?.trim() || null,
            is_cover: !!p.is_cover,
          });
        }
      }

      router.push(`${base}/account?tab=company`);
    } catch (e: any) {
      console.error(e);
      setErr(e?.response?.data?.msg || t.createErr);
    } finally {
      setBusy(false);
    }
  }

  if (pageLoading) {
    return (
      <main dir={dir} className="max-w-3xl mx-auto px-4 py-8">
        <div className="rounded-2xl border bg-white p-5">{t.loading}</div>
      </main>
    );
  }

  return (
    <main dir={dir} className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.createTitle}</h1>
          <div className="text-sm opacity-70">{t.subtitle}</div>
        </div>

        <Link
          href={`${base}/account?tab=account`}
          className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
        >
          {t.cancel}
        </Link>
      </div>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {err}
        </div>
      )}

      {/* Infos entreprise */}
      <section className="rounded-2xl border bg-white p-5 space-y-4">
        <div>
          <label className="text-sm font-medium">{t.name}</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder={t.namePh}
          />
        </div>

        <div>
          <label className="text-sm font-medium">
            {t.city}
            {selectedCity ? ` (${labelCity(selectedCity, lang)})` : ""}
          </label>

          <select
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={cityId ?? ""}
            onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : null)}
            disabled={loadingRefs}
          >
            <option value="">{t.choose}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {labelCity(c, lang)} {c.region ? `(${c.region})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Secteurs */}
        <div>
          <label className="text-sm font-medium">{t.sectors}</label>
          <SectorDropdown
            lang={lang}
            disabled={loadingRefs}
            umbrellas={umbrellas}
            value={sectorIds}
            onChange={setSectorIds}
            t={{
              sectorsPlaceholder: t.sectorsPlaceholder,
              sectorsSearchPh: t.sectorsSearchPh,
              sectorsSelected: t.sectorsSelected,
              ok: t.ok,
            }}
          />
        </div>

        <div>
          <label className="text-sm font-medium">{t.address}</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder={t.addressPh}
          />
        </div>

        <div>
          <label className="text-sm font-medium">{t.phone}</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder={t.phonePh}
          />
        </div>

        <div>
          <label className="text-sm font-medium">{t.email}</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder={t.emailPh}
          />
        </div>

        <div>
          <label className="text-sm font-medium">{t.desc}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2"
            rows={5}
            placeholder={t.descPh}
          />
        </div>
      </section>

      {/* Photos entreprise (Cloudinary only) */}
      <section className="rounded-2xl border bg-white p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold">{t.photosTitle}</div>
            <div className="text-sm opacity-70">{t.photosSubtitle}</div>
          </div>
          <div className="text-sm opacity-70">{t.photosCount(photos.length)}</div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={pickAndUploadPhotos}
            disabled={uploading || photos.length >= MAX_COMPANY_PHOTOS}
            className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 disabled:opacity-60"
          >
            {uploading ? t.uploading : photos.length === 0 ? t.addPhotos : t.addMore}
          </button>

          {photos.length >= MAX_COMPANY_PHOTOS && (
            <div className="text-sm text-red-600">{t.maxReached}</div>
          )}
        </div>

        {photos.length > 0 ? (
          <>
            {/* ✅ Mobile premium carousel (sm:hidden) */}
            <div className="sm:hidden">
              <div className="relative overflow-hidden rounded-2xl border bg-white">
                <button
                  type="button"
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border bg-white/90 px-3 py-2 text-sm shadow-sm hover:bg-white"
                >
                  {dir === "rtl" ? "›" : "‹"}
                </button>

                <button
                  type="button"
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border bg-white/90 px-3 py-2 text-sm shadow-sm hover:bg-white"
                >
                  {dir === "rtl" ? "‹" : "›"}
                </button>

                <div
                  ref={scrollerRef}
                  onScroll={onScrollCarousel}
                  className="flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
                  style={{ scrollbarWidth: "none" as any }}
                >
                  {photos.map((p) => (
                    <div key={p.id} className="w-full flex-shrink-0 snap-start">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" className="w-full h-56 object-cover" />
                      <div className="p-3 space-y-2">
                        <div className="space-y-1">
                          <div className="text-xs opacity-70">{t.captionLabel}</div>
                          <input
                            value={p.caption}
                            onChange={(e) => updateCaption(p.id, e.target.value)}
                            className="w-full rounded-xl border px-3 py-2 text-sm"
                            placeholder={t.captionPh}
                          />
                        </div>

                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            className="text-sm px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
                            onClick={() => removePhoto(p.id)}
                          >
                            {t.remove}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* dots */}
              <div className="mt-3 flex items-center justify-center gap-2">
                {photos.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    className={[
                      "h-2.5 w-2.5 rounded-full border",
                      idx === activeIndex ? "bg-gray-900 border-gray-900" : "bg-white border-gray-300",
                    ].join(" ")}
                    onClick={() => scrollToIndex(idx)}
                    aria-label={`Go to photo ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* ✅ Desktop/tablette: grille inchangée */}
            <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map((p) => (
                <div key={p.id} className="rounded-2xl border overflow-hidden bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="w-full h-40 object-cover" />

                  <div className="p-3 space-y-2">
                    <div className="space-y-1">
                      <div className="text-xs opacity-70">{t.captionLabel}</div>
                      <input
                        value={p.caption}
                        onChange={(e) => updateCaption(p.id, e.target.value)}
                        className="w-full rounded-xl border px-3 py-2 text-sm"
                        placeholder={t.captionPh}
                      />
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        className="text-sm px-3 py-1 rounded-lg border bg-white hover:bg-gray-50"
                        onClick={() => removePhoto(p.id)}
                      >
                        {t.remove}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </section>

      <div className="flex items-center justify-end gap-2">
        <Link
          href={`${base}/account?tab=account`}
          className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
        >
          {t.cancel}
        </Link>

        <button
          onClick={handleCreate}
          disabled={busy || uploading}
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
        >
          {busy ? t.creating : t.create}
        </button>
      </div>
    </main>
  );
}
