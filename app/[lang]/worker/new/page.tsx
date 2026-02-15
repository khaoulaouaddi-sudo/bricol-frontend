"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { api } from "@/lib/api";
import { useLang } from "@/components/LangProvider";
import { uploadImage } from "@/lib/uploadImage";

type Me = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: "visitor" | "worker" | "company" | "admin";
  profile_photo: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
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

type ProfileRow = {
  id: number;
  profile_type: "worker" | "company";
};

function isUserIncomplete(me: Me | null) {
  if (!me) return false;
  const noPhone = !me.phone || !me.phone.trim();
  const noPhoto = !me.profile_photo || !me.profile_photo.trim();
  return noPhone || noPhoto;
}

const MAX_WORKER_PHOTOS = 5;

type NewPhoto = {
  id: string;
  url: string;
  caption: string;
  is_cover: boolean;
};

const i18n = {
  fr: {
    pageTitle: "Créer un profil ouvrier",
    already: (n: number) => `Vous avez déjà ${n}/7 profils.`,
    first: "Créez votre premier profil artisan.",
    back: "Retour",
    incompleteTitle: "Votre compte n’est pas encore complet",
    incompleteText:
      "Vous pouvez créer un profil ouvrier maintenant, mais pensez à compléter votre téléphone et/ou photo de profil.",
    completeAccount: "Compléter mon compte",
    loadingPage: "Chargement…",
    loadFail: "Impossible de charger la page de création.",
    titleLabel: "Titre *",
    titlePh: "Ex: Plombier, Électricien, Peintre…",
    cityLabel: "Ville",
    selected: (x: string) => ` (sélectionnée : ${x})`,
    choose: "— Choisir —",
    sectorsLabel: "Secteur *",
    loadingSectors: "Chargement des secteurs…",
    desc: "Description",
    descPh: "Présentez vos services…",
    skills: "Compétences",
    skillsPh: "Ex: Installation, réparation, entretien…",
    exp: "Expérience",
    expPh: "Ex: 5 ans, chantiers réalisés, etc.",
    loc: "Adresse / Localisation (texte)",
    locPh: "Ex: Quartier, rue, zone…",
    available: "Disponible",

    photosTitle: "Photos (optionnel)",
    photosSubtitle:
      "Upload Cloudinary uniquement. Choisissez une photo de couverture : elle s’affiche en premier sur le profil.",
    addPhotos: "Ajouter des photos",
    addMore: "Ajouter encore",
    uploading: "Upload…",
    photosCount: (n: number) => `${n}/${MAX_WORKER_PHOTOS} photo(s)`,
    maxReached: `Limite atteinte : ${MAX_WORKER_PHOTOS} photos maximum.`,
    captionLabel: "Description (optionnel)",
    captionPh: "Ex: Installation réalisée…",
    cover: "Couverture",
    remove: "Retirer",
    uploadFail: "Échec upload photo.",

    cancel: "Annuler",
    creating: "Création…",
    create: "Créer le profil",
    errTitleRequired: "Le titre est obligatoire.",
    errSectorRequired: "Veuillez choisir un secteur.",
    errCreatedNoId: "Création réussie mais ID introuvable.",
    errCreate: "Erreur lors de la création du profil ouvrier.",
  },
  ar: {
    pageTitle: "إنشاء ملف عامل",
    already: (n: number) => `لديك بالفعل ${n}/7 ملفات.`,
    first: "أنشئ ملفك الأول كحِرفي.",
    back: "رجوع",
    incompleteTitle: "حسابك غير مكتمل بعد",
    incompleteText: "يمكنك إنشاء ملف الآن، لكن يُفضل إكمال رقم الهاتف و/أو صورة الحساب.",
    completeAccount: "إكمال الحساب",
    loadingPage: "جار التحميل…",
    loadFail: "تعذر تحميل صفحة الإنشاء.",

    // ✅ إصلاح الالتباس: "العنوان" قد تعني "عنوان/Adresse"، لذلك نستخدم تسمية أوضح للمسمى المهني
    titleLabel: "المسمّى المهني *",
    titlePh: "مثال: سباك، كهربائي، صباغ…",

    cityLabel: "المدينة",
    selected: (x: string) => ` (المحددة: ${x})`,
    choose: "— اختر —",
    sectorsLabel: "المهنة *",
    loadingSectors: "جار تحميل المهن…",
    desc: "الوصف",
    descPh: "قدّم خدماتك…",
    skills: "المهارات",
    skillsPh: "مثال: تركيب، إصلاح، صيانة…",
    exp: "الخبرة",
    expPh: "مثال: 5 سنوات، أشغال منجزة…",

    // "العنوان" هنا مناسب لأنه عنوان/Adresse
    loc: "العنوان / الموقع (نص)",
    locPh: "مثال: الحي، الشارع، المنطقة…",
    available: "متاح",

    photosTitle: "صور (اختياري)",
    photosSubtitle: "رفع Cloudinary فقط. اختر صورة الغلاف: تظهر أولاً في ملفك.",
    addPhotos: "إضافة صور",
    addMore: "إضافة المزيد",
    uploading: "جار الرفع…",
    photosCount: (n: number) => `${n}/${MAX_WORKER_PHOTOS} صورة`,
    maxReached: `تم بلوغ الحد الأقصى: ${MAX_WORKER_PHOTOS} صور.`,
    captionLabel: "وصف الصورة (اختياري)",
    captionPh: "مثال: عمل مُنجز…",
    cover: "غلاف",
    remove: "حذف",
    uploadFail: "فشل رفع الصورة.",

    cancel: "إلغاء",
    creating: "جار الإنشاء…",
    create: "إنشاء الملف",

    // ✅ مواكبة تغيير التسمية
    errTitleRequired: "المسمّى المهني إلزامي.",
    errSectorRequired: "المرجو اختيار مهنة.",
    errCreatedNoId: "تم الإنشاء لكن لم يتم العثور على المعرّف.",
    errCreate: "حدث خطأ أثناء إنشاء ملف العامل.",
  },
} as const;

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

export default function WorkerNewPage() {
  return (
    <RequireAuth>
      <WorkerNewInner />
    </RequireAuth>
  );
}

function WorkerNewInner() {
  const router = useRouter();
  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const base = `/${lang}`;

  const [me, setMe] = useState<Me | null>(null);
  const [workerCount, setWorkerCount] = useState<number>(0);

  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  const [umbrellas, setUmbrellas] = useState<Umbrella[]>([]);
  const [loadingUmbrellas, setLoadingUmbrellas] = useState(false);

  // Form worker_profile
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");
  const [location, setLocation] = useState("");
  const [available, setAvailable] = useState(true);

  const [cityId, setCityId] = useState<number | null>(null);
  const [sectorId, setSectorId] = useState<number | null>(null);

  // ✅ Photos Cloudinary (max 5, caption, cover)
  const [photos, setPhotos] = useState<NewPhoto[]>([]);
  const [uploading, setUploading] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const selectedCityName = useMemo(() => {
    if (!cityId) return null;
    const c = cities.find((x) => x.id === cityId);
    return c ? labelCity(c, lang) : null;
  }, [cities, cityId, lang]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setPageLoading(true);
        setErr(null);

        const meData: Me = await api.get("/users/me").then((r) => r.data);
        if (!alive) return;
        setMe(meData);

        // interdit si company
        if (meData.role === "company") {
          router.replace(`${base}/account?tab=account`);
          return;
        }

        // profils
        const profs: ProfileRow[] = await api.get(`/users/me/profiles`).then((r) => r.data);

        const workerProfiles = Array.isArray(profs)
          ? profs.filter((p) => p.profile_type === "worker")
          : [];

        const wc = workerProfiles.length;
        if (!alive) return;
        setWorkerCount(wc);

        if (meData.role === "worker" && wc >= 7) {
          router.replace(`${base}/account?tab=account`);
          return;
        }

        // ✅ Pré-remplir la ville depuis un worker_profile existant (choix déterministe: plus grand id)
        let prefillCityId: number | null = null;
        if (workerProfiles.length > 0) {
          const maxId = workerProfiles.reduce((mx, p) => (p.id > mx ? p.id : mx), workerProfiles[0].id);
          try {
            const wp = await api.get(`/worker-profiles/${maxId}`).then((r) => r.data);
            if (typeof wp?.city_id === "number" && wp.city_id > 0) {
              prefillCityId = wp.city_id;
            }
          } catch (e) {
            console.error("Prefill city error (worker-profiles/:id):", e);
          }
        }

        await loadUmbrellas();
        const initialCities = await loadCities();

        if (prefillCityId && !initialCities.some((c) => c.id === prefillCityId)) {
          try {
            const oneCity: City = await api.get(`/cities/${prefillCityId}`).then((r) => r.data);
            if (!alive) return;
            setCities((prev) => (prev.some((c) => c.id === oneCity.id) ? prev : [oneCity, ...prev]));
          } catch (e) {
            console.error("Prefill city error (cities/:id):", e);
          }
        }

        if (!alive) return;
        if (prefillCityId) setCityId(prefillCityId);
      } catch (e: any) {
        console.error(e);
        if (alive) setErr(t.loadFail);
      } finally {
        if (alive) setPageLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, t.loadFail, base]);

  async function loadCities(): Promise<City[]> {
    try {
      setLoadingCities(true);
      const res: City[] = await api.get("/cities", { params: { limit: 100 } }).then((r) => r.data);
      const list = Array.isArray(res) ? res : [];
      setCities(list);
      return list;
    } catch (e) {
      console.error(e);
      setCities([]);
      return [];
    } finally {
      setLoadingCities(false);
    }
  }

  async function loadUmbrellas() {
    try {
      setLoadingUmbrellas(true);
      const res: Umbrella[] = await api.get("/umbrellas", { params: { type: "worker" } }).then((r) => r.data);
      setUmbrellas(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
      setUmbrellas([]);
    } finally {
      setLoadingUmbrellas(false);
    }
  }

  // ---- Photos helpers (max 5) ----
  function ensureCover(next: NewPhoto[]) {
    if (next.length === 0) return next;
    if (next.some((p) => p.is_cover)) return next;
    const copy = [...next];
    copy[0] = { ...copy[0], is_cover: true };
    return copy;
  }

  async function pickAndUploadPhotos() {
    const remaining = MAX_WORKER_PHOTOS - photos.length;
    if (remaining <= 0) {
      setErr(t.maxReached);
      return;
    }

    setErr(null);

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;

    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (files.length === 0) {
        // l'utilisateur a annulé la sélection
        setUploading(false);
        return;
      }

      const slice = files.slice(0, remaining);

      try {
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

        setPhotos((prev) => ensureCover([...prev, ...uploaded]));
      } catch (e) {
        console.error(e);
        setErr(t.uploadFail);
      } finally {
        setUploading(false);
      }
    };

    // ✅ important: l'état uploading doit refléter la vraie durée (géré dans onchange)
    input.click();
  }

  function updateCaption(id: string, caption: string) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, caption } : p)));
  }

  function removePhoto(id: string) {
    setPhotos((prev) => ensureCover(prev.filter((p) => p.id !== id)));
  }

  async function handleSubmit() {
    setErr(null);

    if (!title.trim()) {
      setErr(t.errTitleRequired);
      return;
    }
    if (!sectorId) {
      setErr(t.errSectorRequired);
      return;
    }

    try {
      setBusy(true);

      // 1) create worker_profile
      const created = await api
        .post("/worker-profiles", {
          title: title.trim(),
          description: description.trim() || null,
          skills: skills.trim() || null,
          experience: experience.trim() || null,
          location: location.trim() || null,
          available,
          city_id: cityId,
          sector_id: sectorId,
        })
        .then((r) => r.data);

      const newId = created?.id;
      if (!newId) {
        setErr(t.errCreatedNoId);
        return;
      }

      // 2) photos (optionnel)
      if (photos.length > 0) {
        await api.post(`/worker-profiles/${newId}/photos`, {
          photos: photos.map((p) => ({
            url: p.url,
            caption: p.caption?.trim() ? p.caption.trim() : null,
            is_cover: !!p.is_cover,
          })),
        });
      }

      // ✅ 3) redirect cohérent + garde la langue
      router.push(`${base}/worker/${newId}`);
    } catch (e: any) {
      console.error(e);
      const msg = e?.response?.data?.msg || e?.response?.data?.error || t.errCreate;
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  if (pageLoading) {
    return (
      <main dir={dir} className="max-w-3xl mx-auto px-4 py-8">
        <div className="rounded-2xl border bg-white p-5">{t.loadingPage}</div>
      </main>
    );
  }

  return (
    <main dir={dir} className="max-w-3xl mx-auto px-4 py-8 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.pageTitle}</h1>
          <div className="text-sm opacity-70">{me?.role === "worker" ? t.already(workerCount) : t.first}</div>
        </div>

        <Link
          href={`${base}/account?tab=account`}
          className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
        >
          {t.back}
        </Link>
      </div>

      {isUserIncomplete(me) && (
        <div className="rounded-2xl border bg-amber-50 p-4">
          <div className="font-medium">{t.incompleteTitle}</div>
          <div className="text-sm opacity-80">{t.incompleteText}</div>
          <div className="mt-3">
            <Link
              href={`${base}/account?tab=account`}
              className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 inline-block"
            >
              {t.completeAccount}
            </Link>
          </div>
        </div>
      )}

      {err && <div className="rounded-2xl border bg-white p-4 text-red-600">{err}</div>}

      {/* Form */}
      <section className="rounded-2xl border bg-white p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">{t.titleLabel}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.titlePh}
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              {t.cityLabel}
              {selectedCityName ? t.selected(selectedCityName) : ""}
            </label>

            <select
              value={cityId ?? ""}
              onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : null)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              disabled={loadingCities}
            >
              <option value="">{t.choose}</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {labelCity(c, lang)} {c.region ? `(${c.region})` : ""}
                </option>
              ))}
            </select>

            <div className="text-xs opacity-70 mt-1">{loadingCities ? t.loadingPage : " "}</div>
          </div>

          {/* Secteur */}
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">{t.sectorsLabel}</label>
            <select
              value={sectorId ?? ""}
              onChange={(e) => setSectorId(e.target.value ? Number(e.target.value) : null)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              disabled={loadingUmbrellas}
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

            <div className="text-xs opacity-70 mt-1">{loadingUmbrellas ? t.loadingSectors : " "}</div>
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium">{t.desc}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.descPh}
              className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[110px]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium">{t.skills}</label>
            <textarea
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder={t.skillsPh}
              className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[90px]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium">{t.exp}</label>
            <textarea
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder={t.expPh}
              className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[90px]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium">{t.loc}</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t.locPh}
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              id="available"
              type="checkbox"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
            />
            <label htmlFor="available" className="text-sm">
              {t.available}
            </label>
          </div>
        </div>
      </section>

      {/* ✅ Photos (Cloudinary only, max 5, cover, caption) */}
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
            disabled={uploading || photos.length >= MAX_WORKER_PHOTOS}
            className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 disabled:opacity-60"
          >
            {uploading ? t.uploading : photos.length === 0 ? t.addPhotos : t.addMore}
          </button>

          {photos.length >= MAX_WORKER_PHOTOS && <div className="text-sm text-red-600">{t.maxReached}</div>}
        </div>

        {photos.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-3">
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

                  <div className="flex items-center justify-between gap-2">

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
        )}
      </section>

      <div className="flex items-center justify-end gap-2">
        <Link href={`${base}/account?tab=account`} className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50">
          {t.cancel}
        </Link>

        <button
          onClick={handleSubmit}
          disabled={busy || uploading}
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
        >
          {busy ? t.creating : t.create}
        </button>
      </div>
    </main>
  );
}
