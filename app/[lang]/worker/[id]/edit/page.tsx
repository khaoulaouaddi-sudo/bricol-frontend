"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { api } from "@/lib/api";
import PhotoUrlPicker, { PhotoItem } from "@/components/PhotoUrlPicker";
import { useLang } from "@/components/LangProvider";

/* =======================
   i18n (UI uniquement)
======================= */

const i18n = {
  fr: {
    loading: "Chargement…",
    invalidId: "Identifiant invalide.",
    title: "Modifier le profil ouvrier",
    back: "Retour",
    incomplete: "Compte incomplet",
    completeAccount: "Compléter mes informations personnelles",
    loadFail: "Impossible de charger le profil.",
    errTitleRequired: "Le titre est obligatoire.",
    errSectorRequired: "Veuillez choisir un secteur.",
    errSave: "Erreur lors de l’enregistrement.",

    titlePh: "Titre *",
    city: "Ville",
    selected: (x: string) => ` (sélectionnée : ${x})`,
    choose: "— Choisir —",
    sector: "Secteur *",
    desc: "Description",
    skills: "Compétences",
    exp: "Expérience",
    loc: "Localisation",
    available: "Disponible",

    photosTitle: "Photos du profil",
    photosSubtitle:
      "Upload Cloudinary uniquement. Choisissez une photo de couverture (elle s’affiche en premier). Maximum : 5 photos.",
    photosMaxReached: "Limite atteinte : 5 photos maximum.",

    saving: "Enregistrement…",
    save: "Enregistrer",
  },
  ar: {
    loading: "جار التحميل…",
    invalidId: "معرّف غير صالح.",
    title: "تعديل ملف العامل",
    back: "رجوع",
    incomplete: "الحساب غير مكتمل",
    completeAccount: "إكمال المعلومات الشخصية",
    loadFail: "تعذر تحميل الملف.",
    errTitleRequired: "العنوان إلزامي.",
    errSectorRequired: "المرجو اختيار مهنة.",
    errSave: "حدث خطأ أثناء الحفظ.",

    titlePh: "العنوان *",
    city: "المدينة",
    selected: (x: string) => ` (المحددة: ${x})`,
    choose: "— اختر —",
    sector: "المهنة *",
    desc: "الوصف",
    skills: "المهارات",
    exp: "الخبرة",
    loc: "الموقع",
    available: "متاح",

    photosTitle: "صور الملف",
    photosSubtitle:
      "رفع Cloudinary فقط. اختر صورة الغلاف (تظهر أولاً). الحد الأقصى: 5 صور.",
    photosMaxReached: "تم بلوغ الحد الأقصى: 5 صور.",

    saving: "جار الحفظ…",
    save: "حفظ",
  },
} as const;

/* =======================
   Types
======================= */

type Me = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: "visitor" | "worker" | "company" | "admin";
  profile_photo: string | null;
};

type City = {
  id: number;
  slug: string;
  name_fr: string;
  name_ar?: string | null;
  display_name?: string | null;
  region?: string | null;
};

type Umbrella = {
  id: number;
  slug: string;
  name: string;
  name_ar?: string | null;
  display_name?: string | null;
  sectors: Array<{
    id: number;
    slug: string;
    name: string;
    label: string;
    name_ar?: string | null;
    label_ar?: string | null;
    display_label?: string | null;
  }>;
};

type WorkerPhoto = {
  id: number;
  image_url: string;
  caption: string | null;
  is_cover: boolean;
};

type WorkerProfile = {
  id: number;
  title: string;
  description: string | null;
  skills: string | null;
  experience: string | null;
  location: string | null;
  available: boolean;

  city_id: number | null;
  sector_id: number | null;

  city?: { id: number; name_fr?: string | null; name_ar?: string | null; display_name?: string | null } | null;
  sector?: { id: number; name?: string | null; name_ar?: string | null; label?: string | null; label_ar?: string | null; display_label?: string | null } | null;

  photos?: WorkerPhoto[];
};

/* =======================
   Utils
======================= */

function isUserIncomplete(me: Me | null) {
  if (!me) return false;
  return !me.phone || !me.profile_photo;
}

function safeNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function labelCity(c: City, lang: "fr" | "ar") {
  return c.display_name ?? (lang === "ar" ? c.name_ar : c.name_fr) ?? c.name_fr ?? c.slug;
}

function labelUmbrella(u: Umbrella, lang: "fr" | "ar") {
  return u.display_name ?? (lang === "ar" ? u.name_ar : u.name) ?? u.name;
}

function labelSector(s: Umbrella["sectors"][number], lang: "fr" | "ar") {
  return (
    s.display_label ??
    (lang === "ar" ? s.label_ar ?? s.name_ar : s.label) ??
    s.label ??
    s.name ??
    s.slug
  );
}

/* =======================
   Page
======================= */

export default function WorkerEditPage() {
  return (
    <RequireAuth>
      <WorkerEditInner />
    </RequireAuth>
  );
}

function WorkerEditInner() {
  const router = useRouter();
  const params = useParams();

  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const base = `/${lang}`;

  const workerId = useMemo(() => safeNumber((params as any)?.id), [params]);

  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState<WorkerProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cities, setCities] = useState<City[]>([]);
  const [umbrellas, setUmbrellas] = useState<Umbrella[]>([]);

  // form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");
  const [location, setLocation] = useState("");
  const [available, setAvailable] = useState(true);

  const [cityId, setCityId] = useState<number | null>(null);
  const [sectorId, setSectorId] = useState<number | null>(null);

  // photos CRUD (liste réelle des photos)
  const [photos, setPhotos] = useState<WorkerPhoto[]>([]);

  const selectedCityName = useMemo(() => {
    if (!cityId) return null;
    const c = cities.find((x) => x.id === cityId);
    return c ? labelCity(c, lang) : null;
  }, [cities, cityId, lang]);

  async function refreshPhotos(pid: number) {
    const rows = await api
      .get(`/worker-photos/profile/${pid}`)
      .then((r) => (Array.isArray(r.data) ? (r.data as WorkerPhoto[]) : []));
    setPhotos(rows);
    return rows;
  }

  // charge me + profile + refs
  useEffect(() => {
    let alive = true;

    (async () => {
      if (!workerId || Number.isNaN(workerId)) {
        setError(t.invalidId);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const meData: Me = await api.get("/users/me").then((r) => r.data);
        if (!alive) return;
        setMe(meData);

        // interdit si company
        if (meData.role === "company") {
          router.replace(`${base}/account?tab=account`);
          return;
        }

        const p: WorkerProfile = await api.get(`/worker-profiles/${workerId}`).then((r) => r.data);
        if (!alive) return;

        setProfile(p);

        setTitle(p.title ?? "");
        setDescription(p.description ?? "");
        setSkills(p.skills ?? "");
        setExperience(p.experience ?? "");
        setLocation(p.location ?? "");
        setAvailable(!!p.available);

        setCityId(p.city_id ?? p.city?.id ?? null);
        setSectorId(p.sector_id ?? p.sector?.id ?? null);

        // photos (depuis endpoint dédié, cohérent avec account)
        await refreshPhotos(workerId);

        const [citiesRes, umbrellasRes] = await Promise.all([
          api.get("/cities"),
          api.get("/umbrellas", { params: { type: "worker" } }),
        ]);

        if (!alive) return;
        setCities(Array.isArray(citiesRes.data) ? citiesRes.data : []);
        setUmbrellas(Array.isArray(umbrellasRes.data) ? umbrellasRes.data : []);
      } catch (e: any) {
        console.error(e);
        if (alive) setError(t.loadFail);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [workerId, router, t.loadFail, t.invalidId, base]);

  async function handleSave() {
    setError(null);

    if (!title.trim()) {
      setError(t.errTitleRequired);
      return;
    }
    if (!sectorId) {
      setError(t.errSectorRequired);
      return;
    }
    if (!workerId || Number.isNaN(workerId)) {
      setError(t.invalidId);
      return;
    }

    try {
      setSaving(true);

      await api.put(`/worker-profiles/${workerId}`, {
        title: title.trim(),
        description: description.trim() || null,
        skills: skills.trim() || null,
        experience: experience.trim() || null,
        location: location.trim() || null,
        available,
        city_id: cityId,
        sector_id: sectorId,
      });

      // retour cohérent avec ton AccountClient
      router.push(`${base}/account?tab=workers`);
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.msg || t.errSave);
    } finally {
      setSaving(false);
    }
  }

  // ===== Photos CRUD handlers (Cloudinary only via PhotoUrlPicker) =====

  function toPhotoItems(list: WorkerPhoto[]): PhotoItem[] {
    return list.map((p) => ({
      id: p.id,
      url: p.image_url,
      caption: p.caption ?? "",
      is_cover: !!p.is_cover,
    }));
  }

  async function photoCreate(pid: number, item: { url: string; caption: string; is_cover: boolean }) {
    // Limite backend : middleware lit req.body.profile_id => on l’envoie pour être sûr
    await api.post(`/worker-profiles/${pid}/photos`, {
      profile_id: pid,
      photos: [
        {
          url: item.url,
          caption: item.caption?.trim() ? item.caption.trim() : null,
          is_cover: !!item.is_cover,
        },
      ],
    });

    await refreshPhotos(pid);
  }

  async function photoDelete(pid: number, photoId: number) {
    await api.delete(`/worker-photos/${photoId}`);
    await refreshPhotos(pid);
  }

  async function photoSetCover(pid: number, photoId: number) {
    await api.patch(`/worker-photos/${photoId}`, { is_cover: true });
    await refreshPhotos(pid);
  }

  async function photoUpdateCaption(pid: number, photoId: number, caption: string) {
    await api.patch(`/worker-photos/${photoId}`, { caption: caption?.trim() ? caption.trim() : null });
    await refreshPhotos(pid);
  }

  if (loading) {
    return (
      <main dir={dir} className="max-w-3xl mx-auto p-6">
        <div className="border rounded-xl p-4">{t.loading}</div>
      </main>
    );
  }

  if (error && !profile) {
    return (
      <main dir={dir} className="max-w-3xl mx-auto p-6">
        <div className="border rounded-xl p-4 text-red-600">{error}</div>
        <div className="mt-3">
          <Link href={`${base}/account?tab=account`} className="underline text-sm">
            {t.back}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main dir={dir} className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="flex justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-sm opacity-70">{profile?.title}</p>
        </div>

        <Link href={`${base}/account?tab=workers`} className="px-4 py-2 border rounded-xl bg-white hover:bg-gray-50">
          {t.back}
        </Link>
      </header>

      {isUserIncomplete(me) && (
        <div className="border rounded-xl bg-amber-50 p-4">
          <p className="font-medium">{t.incomplete}</p>
          <Link href={`${base}/account?tab=account`} className="underline text-sm">
            {t.completeAccount}
          </Link>
        </div>
      )}

      {error && <div className="border p-4 text-red-600 rounded-xl bg-white">{error}</div>}

      {/* FORM */}
      <section className="border rounded-xl p-5 space-y-4 bg-white">
        <input
          className="w-full border rounded-xl p-2"
          placeholder={t.titlePh}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div>
          <label className="text-sm font-medium">
            {t.city}
            {selectedCityName ? t.selected(selectedCityName) : ""}
          </label>
          <select
            className="mt-1 w-full border rounded-xl p-2"
            value={cityId ?? ""}
            onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">{t.choose}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {labelCity(c, lang)} {c.region ? `(${c.region})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">{t.sector}</label>
          <select
            className="mt-1 w-full border rounded-xl p-2"
            value={sectorId ?? ""}
            onChange={(e) => setSectorId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">{t.choose}</option>

            {umbrellas.map((u) => (
              <optgroup key={u.slug} label={labelUmbrella(u, lang)}>
                {u.sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {labelSector(s, lang)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <textarea
          className="w-full border rounded-xl p-2 min-h-[110px]"
          placeholder={t.desc}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <textarea
          className="w-full border rounded-xl p-2 min-h-[90px]"
          placeholder={t.skills}
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
        />

        <textarea
          className="w-full border rounded-xl p-2 min-h-[90px]"
          placeholder={t.exp}
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
        />

        <input
          className="w-full border rounded-xl p-2"
          placeholder={t.loc}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
          {t.available}
        </label>
      </section>

      {/* Photos CRUD (Cloudinary only, max 5) */}
      {workerId && !Number.isNaN(workerId) && (
        <section className="rounded-2xl border bg-white p-5 space-y-3">
          <PhotoUrlPicker
            mode="crud"
            title={t.photosTitle}
            subtitle={t.photosSubtitle}
            max={5}
            allowUrl={false}
            value={toPhotoItems(photos)}
            radioGroupName={`worker-${workerId}`}
            crud={{
              onCreate: async (item) => {
                if (photos.length >= 5) {
                  setError(t.photosMaxReached);
                  return;
                }
                setError(null);
                await photoCreate(workerId, item);
              },
              onDelete: async (photoId) => {
                setError(null);
                await photoDelete(workerId, photoId);
              },
              onSetCover: async (photoId) => {
                setError(null);
                await photoSetCover(workerId, photoId);
              },
              onUpdateCaption: async (photoId, caption) => {
                setError(null);
                await photoUpdateCaption(workerId, photoId, caption);
              },
            }}
          />
        </section>
      )}

      <div className="flex justify-end gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-xl disabled:opacity-60"
        >
          {saving ? t.saving : t.save}
        </button>
      </div>
    </main>
  );
}
