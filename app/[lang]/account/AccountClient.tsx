"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/LangProvider";
import PhotoUrlPicker, { PhotoItem } from "@/components/PhotoUrlPicker";
import { uploadImage } from "@/lib/uploadImage";

const MAX_WORKER_PROFILES = 7;

const i18n = {
  fr: {
    title: "Mon espace",
    loading: "Chargement…",
    logout: "Déconnexion",
    tabs: {
      account: "Compte",
      workers: "Profils ouvriers",
      company: "Profil entreprise",
      admin: "Administration",
    },
    account: {
      section: "Informations du compte",
      photo: "Photo de profil",
      changePhoto: "Modifier",
      removePhoto: "Retirer",
      saving: "Enregistrement…",
      save: "Enregistrer",
      cancel: "Annuler",
      name: "Nom",
      phone: "Téléphone",
      facebook: "Facebook",
      instagram: "Instagram",
      tiktok: "TikTok",
      email: "Email (lecture seule)",
      updated: "Compte mis à jour.",
    },
    choose: {
      title: "Créer un profil",
      hint:
        "Choisissez un type de profil. Selon tes règles métier : un utilisateur ne peut pas avoir à la fois un profil entreprise et des profils ouvriers.",
      createWorker: "Créer un profil ouvrier",
      createCompany: "Créer un profil entreprise",
    },
    workers: {
      empty: "Aucun profil ouvrier",
      create: "Créer un profil ouvrier",
      maxReached: `Limite atteinte : ${MAX_WORKER_PROFILES} profils maximum.`,
      view: "Voir",
      edit: "Modifier",
      del: "Supprimer",
      confirmDel: "Supprimer ce profil ouvrier ?",
      photosTitle: "Photos du profil",
    },
    company: {
      empty: "Aucun profil entreprise",
      create: "Créer un profil entreprise",
      sectionEdit: "Modifier le profil entreprise",
      name: "Nom / Raison sociale",
      city: "Ville",
      choose: "— Choisir —",
      address: "Adresse / Quartier",
      phone: "Téléphone",
      email: "Email",
      website: "Site web",
      desc: "Description",
      sectors: "Secteurs (groupés par famille)",

      // ✅ AJOUT (UI compacte secteurs)
      sectorsPlaceholder: "Choisir des secteurs…",
      sectorsSearchPh: "Rechercher un secteur…",

      saving: "Enregistrement…",
      save: "Enregistrer",
      del: "Supprimer",
      confirmDel: "Supprimer le profil entreprise ?",
      saved: "Profil entreprise mis à jour.",
      photosTitle: "Photos entreprise",
    },
    errors: {
      generic: "Erreur serveur.",
    },
  },
  ar: {
    title: "مساحتي",
    loading: "جار التحميل…",
    logout: "تسجيل الخروج",
    tabs: {
      account: "الحساب",
      workers: "ملفات العمال",
      company: "ملف الشركة",
      admin: "الإدارة",
    },
    account: {
      section: "معلومات الحساب",
      photo: "صورة الحساب",
      changePhoto: "تعديل",
      removePhoto: "إزالة",
      saving: "جار الحفظ…",
      save: "حفظ",
      cancel: "إلغاء",
      name: "الاسم",
      phone: "الهاتف",
      facebook: "فيسبوك",
      instagram: "إنستغرام",
      tiktok: "تيك توك",
      email: "البريد الإلكتروني (قراءة فقط)",
      updated: "تم تحديث الحساب.",
    },
    choose: {
      title: "إنشاء ملف",
      hint:
        "اختر نوع الملف. حسب قواعد المشروع: لا يمكن للمستخدم امتلاك ملف شركة وملفات عمال في نفس الوقت.",
      createWorker: "إنشاء ملف عامل",
      createCompany: "إنشاء ملف شركة",
    },
    workers: {
      empty: "لا يوجد ملف عامل",
      create: "إنشاء ملف عامل",
      maxReached: `تم بلوغ الحد الأقصى: ${MAX_WORKER_PROFILES} ملفات.`,
      view: "عرض",
      edit: "تعديل",
      del: "حذف",
      confirmDel: "هل تريد حذف ملف العامل؟",
      photosTitle: "صور الملف",
    },
    company: {
      empty: "لا يوجد ملف شركة",
      create: "إنشاء ملف شركة",
      sectionEdit: "تعديل ملف الشركة",
      name: "اسم الشركة",
      city: "المدينة",
      choose: "— اختر —",
      address: "العنوان / الحي",
      phone: "الهاتف",
      email: "البريد الإلكتروني",
      website: "الموقع",
      desc: "الوصف",
      sectors: "القطاعات (مرتبة حسب العائلة)",

      // ✅ AJOUT (UI compacte secteurs)
      sectorsPlaceholder: "اختر القطاعات…",
      sectorsSearchPh: "ابحث عن قطاع…",

      saving: "جار الحفظ…",
      save: "حفظ",
      del: "حذف",
      confirmDel: "هل تريد حذف ملف الشركة؟",
      saved: "تم تحديث ملف الشركة.",
      photosTitle: "صور الشركة",
    },
    errors: {
      generic: "خطأ في الخادم.",
    },
  },
} as const;

/** /users/me renvoie plus de champs que ce type minimal */
type Me = {
  id: number;
  name: string | null;
  email: string;
  role: "visitor" | "worker" | "company" | "admin";
  phone?: string | null;
  profile_photo?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
};

type ProfileRow = {
  id: number;
  profile_type: "worker" | "company";
  title_or_name: string | null;
  created_at: string;
};

type City = {
  id: number;
  name_fr: string;
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

type WorkerPhoto = {
  id: number;
  profile_id: number;
  image_url: string;
  caption: string | null;
  is_cover: boolean;
};

type CompanyPhoto = {
  id: number;
  company_id: number;
  image_url: string;
  caption: string | null;
  is_cover: boolean;
};

type CompanyProfile = {
  id: number;
  name: string | null;
  description?: string | null;
  location?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  city_id?: number | null;
};

function labelCity(c: City, lang: "fr" | "ar") {
  return c.display_name ?? (lang === "ar" ? c.name_ar : c.name_fr) ?? c.name_fr ?? `#${c.id}`;
}

/** ✅ Helpers labels secteurs */
function umbrellaLabel(u: Umbrella) {
  return u.display_name ?? u.name ?? `#${u.id}`;
}
function sectorLabel(s: Umbrella["sectors"][number]) {
  return s.display_label ?? s.label ?? `#${s.id}`;
}

/** ✅ Dropdown compact multi-select (checkboxes) */
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
            {value.length === 0 ? (
              <span className="opacity-70">{placeholder}</span>
            ) : (
              <span>{selectedText(value.length)}</span>
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

export default function AccountPage() {
  return (
    <RequireAuth>
      <AccountClient />
    </RequireAuth>
  );
}

function AccountClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const base = `/${lang}`;

  const tab = (params.get("tab") || "account") as "account" | "workers" | "company";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [me, setMe] = useState<Me | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  const workerProfiles = useMemo(() => profiles.filter((p) => p.profile_type === "worker"), [profiles]);
  const companyProfileRow = useMemo(() => profiles.find((p) => p.profile_type === "company") || null, [profiles]);

  // XOR display rules
  const hasWorkers = workerProfiles.length > 0;
  const hasCompany = !!companyProfileRow;

  // tabs disponibles
  const tabs = useMemo(() => {
    const out: Array<{ key: "account" | "workers" | "company"; label: string; visible: boolean }> = [
      { key: "account", label: t.tabs.account, visible: true },
      { key: "workers", label: t.tabs.workers, visible: !hasCompany }, // company => pas workers
      { key: "company", label: t.tabs.company, visible: !hasWorkers }, // workers => pas company
    ];
    return out.filter((x) => x.visible);
  }, [t.tabs, hasCompany, hasWorkers]);

  // ✅ Dépendance fiable pour l’effet de redirection (évite tabs.length)
  const tabsKey = useMemo(() => tabs.map((x) => x.key).join("|"), [tabs]);

  // ---- Account form state (user) ----
  const [editAccount, setEditAccount] = useState(false);
  const [accBusy, setAccBusy] = useState(false);
  const [accMsg, setAccMsg] = useState<string | null>(null);

  const [accName, setAccName] = useState("");
  const [accPhone, setAccPhone] = useState("");
  const [accFacebook, setAccFacebook] = useState("");
  const [accInstagram, setAccInstagram] = useState("");
  const [accTiktok, setAccTiktok] = useState("");
  const [accPhoto, setAccPhoto] = useState<string | null>(null);

  // ---- Workers photos map ----
  const [workerPhotos, setWorkerPhotos] = useState<Record<number, WorkerPhoto[]>>({});
  const [workerPhotosLoading, setWorkerPhotosLoading] = useState<Record<number, boolean>>({});

  // ---- Company details + refs ----
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [companyBusy, setCompanyBusy] = useState(false);
  const [companyMsg, setCompanyMsg] = useState<string | null>(null);

  const [cities, setCities] = useState<City[]>([]);
  const [umbrellas, setUmbrellas] = useState<Umbrella[]>([]);
  const [companySectorIds, setCompanySectorIds] = useState<number[]>([]);
  const [companyPhotos, setCompanyPhotos] = useState<CompanyPhoto[]>([]);

  // company form fields
  const [cName, setCName] = useState("");
  const [cCityId, setCCityId] = useState<number | null>(null);
  const [cLocation, setCLocation] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cWebsite, setCWebsite] = useState("");
  const [cDesc, setCDesc] = useState("");

  async function refreshMeAndProfiles() {
    const [meData, profData] = await Promise.all([
      api.get("/users/me").then((r) => r.data as Me),
      api.get("/users/me/profiles").then((r) => (Array.isArray(r.data) ? (r.data as ProfileRow[]) : [])),
    ]);
    setMe(meData);
    setProfiles(profData);

    // sync account form fields
    setAccName(meData.name ?? "");
    setAccPhone(meData.phone ?? "");
    setAccFacebook(meData.facebook_url ?? "");
    setAccInstagram(meData.instagram_url ?? "");
    setAccTiktok(meData.tiktok_url ?? "");
    setAccPhoto(meData.profile_photo ?? null);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        await refreshMeAndProfiles();
      } catch (e) {
        console.error(e);
        if (alive) setErr(t.errors.generic);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Si tab non visible (XOR), rediriger vers "account" (dépendances fiables)
  useEffect(() => {
    const visibleKeys = new Set(tabs.map((x) => x.key));
    if (!visibleKeys.has(tab)) {
      router.replace(`${base}/account?tab=account`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, tabsKey, base]);

  // Charger photos workers quand on est sur l’onglet workers
  useEffect(() => {
    if (tab !== "workers") return;
    let alive = true;

    (async () => {
      for (const wp of workerProfiles) {
        if (!alive) return;
        if (workerPhotos[wp.id]) continue;

        setWorkerPhotosLoading((m) => ({ ...m, [wp.id]: true }));
        try {
          const rows = await api
            .get(`/worker-photos/profile/${wp.id}`)
            .then((r) => (Array.isArray(r.data) ? (r.data as WorkerPhoto[]) : []));
          if (!alive) return;
          setWorkerPhotos((m) => ({ ...m, [wp.id]: rows }));
        } catch (e) {
          console.error(e);
        } finally {
          if (alive) setWorkerPhotosLoading((m) => ({ ...m, [wp.id]: false }));
        }
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, workerProfiles.map((w) => w.id).join(",")]);

  // Charger company details + refs quand onglet company
  useEffect(() => {
    if (tab !== "company") return;
    if (!companyProfileRow) return;

    let alive = true;

    (async () => {
      try {
        setCompanyMsg(null);
        // refs
        const [cRes, uRes] = await Promise.all([
          api.get("/cities").then((r) => (Array.isArray(r.data) ? (r.data as City[]) : [])),
          api.get("/umbrellas", { params: { type: "company" } }).then((r) => (Array.isArray(r.data) ? r.data : [])),
        ]);
        if (!alive) return;

        setCities(cRes);

        const normalizedUmbrellas: Umbrella[] = (uRes as any[]).map((u) => ({
          id: u.id,
          name: u.name,
          display_name: u.display_name,
          sectors: Array.isArray(u.sectors)
            ? u.sectors.map((s: any) => ({
                id: s.id,
                label: s.label || s.name || s.slug,
                display_label: s.display_label,
              }))
            : [],
        }));
        setUmbrellas(normalizedUmbrellas);

        // company profile + sectors + photos
        const prof = await api.get(`/company-profiles/${companyProfileRow.id}`).then((r) => r.data as any);
        if (!alive) return;

        const companyProfile: CompanyProfile = {
          id: prof.id,
          name: prof.name ?? null,
          description: prof.description ?? null,
          location: prof.location ?? null,
          website: prof.website ?? null,
          phone: prof.phone ?? null,
          email: prof.email ?? null,
          city_id: prof.city_id ?? null,
        };
        setCompany(companyProfile);

        // form sync
        setCName(companyProfile.name ?? "");
        setCCityId(companyProfile.city_id ?? null);
        setCLocation(companyProfile.location ?? "");
        setCPhone(companyProfile.phone ?? "");
        setCEmail(companyProfile.email ?? "");
        setCWebsite(companyProfile.website ?? "");
        setCDesc(companyProfile.description ?? "");

        // sectors (table company_sectors)
        const secs = await api
          .get(`/company-profiles/${companyProfileRow.id}/sectors`)
          .then((r) => (Array.isArray(r.data) ? r.data : []));
        if (!alive) return;
        const ids = (secs as any[]).map((x) => Number(x.sector_id ?? x.id)).filter((n) => Number.isInteger(n));
        setCompanySectorIds(ids);

        // photos
        const p = await api
          .get(`/company-photos/company/${companyProfileRow.id}`)
          .then((r) => (Array.isArray(r.data) ? (r.data as CompanyPhoto[]) : []));
        if (!alive) return;
        setCompanyPhotos(p);
      } catch (e) {
        console.error(e);
        if (alive) setCompanyMsg(t.errors.generic);
      }
    })();

    return () => {
      alive = false;
    };
  }, [tab, companyProfileRow?.id, t.errors.generic]);

  // ---- Account actions ----
  async function saveAccount() {
    if (!me) return;
    try {
      setAccBusy(true);
      setAccMsg(null);

      const payload = {
        name: accName.trim() || null,
        phone: accPhone.trim() || null,
        profile_photo: accPhoto || null,
        facebook_url: accFacebook.trim() || null,
        instagram_url: accInstagram.trim() || null,
        tiktok_url: accTiktok.trim() || null,
      };

      const updated = await api.patch("/users/me", payload).then((r) => r.data as Me);
      setMe(updated);
      setEditAccount(false);
      setAccMsg(t.account.updated);
    } catch (e: any) {
      console.error(e);
      setAccMsg(e?.response?.data?.msg || t.errors.generic);
    } finally {
      setAccBusy(false);
    }
  }

  // ✅ accBusy reflète vraiment l’upload (et gère annulation/erreurs)
  function changeUserPhoto() {
    setAccMsg(null);

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return; // utilisateur a annulé

      try {
        setAccBusy(true);
        const url = await uploadImage(file);
        setAccPhoto(url);
        setEditAccount(true);
      } catch (e: any) {
        console.error(e);
        setAccMsg(e?.message || t.errors.generic);
      } finally {
        setAccBusy(false);
      }
    };

    input.click();
  }

  // ---- Worker actions ----
  async function deleteWorkerProfile(id: number) {
    if (!confirm(t.workers.confirmDel)) return;
    try {
      await api.delete(`/worker-profiles/${id}`);
      await refreshMeAndProfiles();
      // nettoyer photos local
      setWorkerPhotos((m) => {
        const copy = { ...m };
        delete copy[id];
        return copy;
      });
      router.replace(`${base}/account?tab=account`);
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.msg || t.errors.generic);
    }
  }

  async function workerPhotosCreate(profileId: number, item: { url: string; caption: string; is_cover: boolean }) {
    const res = await api.post(`/worker-profiles/${profileId}/photos`, {
      photos: [{ url: item.url, caption: item.caption || "", is_cover: item.is_cover }],
    });
    const created = res?.data?.photos;
    // refresh list
    const rows = await api
      .get(`/worker-photos/profile/${profileId}`)
      .then((r) => (Array.isArray(r.data) ? (r.data as WorkerPhoto[]) : []));
    setWorkerPhotos((m) => ({ ...m, [profileId]: rows }));
    return created;
  }

  async function workerPhotosDelete(profileId: number, photoId: number) {
    await api.delete(`/worker-photos/${photoId}`);
    const rows = await api
      .get(`/worker-photos/profile/${profileId}`)
      .then((r) => (Array.isArray(r.data) ? (r.data as WorkerPhoto[]) : []));
    setWorkerPhotos((m) => ({ ...m, [profileId]: rows }));
  }

  async function workerPhotosSetCover(profileId: number, photoId: number) {
    await api.patch(`/worker-photos/${photoId}`, { is_cover: true });
    const rows = await api
      .get(`/worker-photos/profile/${profileId}`)
      .then((r) => (Array.isArray(r.data) ? (r.data as WorkerPhoto[]) : []));
    setWorkerPhotos((m) => ({ ...m, [profileId]: rows }));
  }

  async function workerPhotosUpdateCaption(profileId: number, photoId: number, caption: string) {
    await api.patch(`/worker-photos/${photoId}`, { caption });
    const rows = await api
      .get(`/worker-photos/profile/${profileId}`)
      .then((r) => (Array.isArray(r.data) ? (r.data as WorkerPhoto[]) : []));
    setWorkerPhotos((m) => ({ ...m, [profileId]: rows }));
  }

  // ---- Company actions ----
  async function saveCompany() {
    if (!companyProfileRow) return;

    try {
      setCompanyBusy(true);
      setCompanyMsg(null);

      // 1) update main company_profile fields
      await api.put(`/company-profiles/${companyProfileRow.id}`, {
        name: cName.trim() || null,
        city_id: cCityId,
        location: cLocation.trim() || null,
        phone: cPhone.trim() || null,
        email: cEmail.trim() || null,
        website: cWebsite.trim() || null,
        description: cDesc.trim() || null,
      });

      // 2) sync sectors by diff
      const current = await api
        .get(`/company-profiles/${companyProfileRow.id}/sectors`)
        .then((r) => (Array.isArray(r.data) ? r.data : []));
      const currentIds = (current as any[]).map((x) => Number(x.sector_id ?? x.id)).filter((n) => Number.isInteger(n));

      const want = [...companySectorIds].sort((a, b) => a - b);
      const have = [...currentIds].sort((a, b) => a - b);

      const toAdd = want.filter((x) => !have.includes(x));
      const toDel = have.filter((x) => !want.includes(x));

      for (const id of toAdd) {
        await api.post(`/company-profiles/${companyProfileRow.id}/sectors`, { sector_id: id });
      }
      for (const id of toDel) {
        await api.delete(`/company-profiles/${companyProfileRow.id}/sectors/${id}`);
      }

      setCompanyMsg(t.company.saved);
      await refreshMeAndProfiles();
    } catch (e: any) {
      console.error(e);
      setCompanyMsg(e?.response?.data?.msg || t.errors.generic);
    } finally {
      setCompanyBusy(false);
    }
  }

  async function deleteCompanyProfile() {
    if (!companyProfileRow) return;
    if (!confirm(t.company.confirmDel)) return;

    try {
      await api.delete(`/company-profiles/${companyProfileRow.id}`);
      setCompany(null);
      setCompanyPhotos([]);
      setCompanySectorIds([]);
      await refreshMeAndProfiles();
      router.replace(`${base}/account?tab=account`);
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.msg || t.errors.generic);
    }
  }

  async function companyPhotoCreate(item: { url: string; caption: string; is_cover: boolean }) {
    if (!companyProfileRow) return;
    await api.post("/company-photos", {
      company_id: companyProfileRow.id,
      image_url: item.url,
      caption: item.caption || null,
      is_cover: item.is_cover,
    });
    const rows = await api
      .get(`/company-photos/company/${companyProfileRow.id}`)
      .then((r) => (Array.isArray(r.data) ? (r.data as CompanyPhoto[]) : []));
    setCompanyPhotos(rows);
  }

  async function companyPhotoDelete(photoId: number) {
    if (!companyProfileRow) return;
    await api.delete(`/company-photos/${photoId}`);
    const rows = await api
      .get(`/company-photos/company/${companyProfileRow.id}`)
      .then((r) => (Array.isArray(r.data) ? (r.data as CompanyPhoto[]) : []));
    setCompanyPhotos(rows);
  }

  async function companyPhotoSetCover(photoId: number) {
    if (!companyProfileRow) return;
    await api.patch(`/company-photos/${photoId}`, { is_cover: true });
    const rows = await api
      .get(`/company-photos/company/${companyProfileRow.id}`)
      .then((r) => (Array.isArray(r.data) ? (r.data as CompanyPhoto[]) : []));
    setCompanyPhotos(rows);
  }

  async function companyPhotoUpdateCaption(photoId: number, caption: string) {
    if (!companyProfileRow) return;
    await api.patch(`/company-photos/${photoId}`, { caption });
    const rows = await api
      .get(`/company-photos/company/${companyProfileRow.id}`)
      .then((r) => (Array.isArray(r.data) ? (r.data as CompanyPhoto[]) : []));
    setCompanyPhotos(rows);
  }

  // multi-select helper (company sectors) — conservé (même s'il n'est pas utilisé ici)
  function toggleSector(id: number, checked: boolean) {
    setCompanySectorIds((prev) => {
      const set = new Set(prev);
      if (checked) set.add(id);
      else set.delete(id);
      return Array.from(set);
    });
  }

  if (loading) {
    return (
      <main dir={dir} className="max-w-6xl mx-auto p-6">
        <div className="border rounded-xl p-4">{t.loading}</div>
      </main>
    );
  }

  return (
    <main dir={dir} className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        {/* ✅ Déconnexion supprimée ici (déjà dans le Header global) */}
      </header>

      {err ? <div className="border rounded-xl p-4 text-red-600">{err}</div> : null}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((x) => (
          <Button
            key={x.key}
            variant={tab === x.key ? "default" : "outline"}
            onClick={() => router.push(`${base}/account?tab=${x.key}`)}
          >
            {x.label}
          </Button>
        ))}

        {me?.role === "admin" && (
          <Button variant="outline" onClick={() => router.push(`${base}/admin`)}>
            {t.tabs.admin}
          </Button>
        )}
      </div>

      {/* ACCOUNT TAB */}
      {tab === "account" && me && (
        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <div className="font-semibold">{t.account.section}</div>

          {/* user photo top */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-20 h-20 rounded-full border overflow-hidden bg-gray-50 flex items-center justify-center">
              {accPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={accPhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-xs opacity-60">—</div>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={changeUserPhoto} disabled={accBusy}>
                {t.account.changePhoto}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setAccPhoto(null);
                  setEditAccount(true);
                }}
                disabled={accBusy || !accPhoto}
              >
                {t.account.removePhoto}
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-sm opacity-70">{t.account.name}</div>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={accName}
                onChange={(e) => {
                  setAccName(e.target.value);
                  setEditAccount(true);
                }}
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm opacity-70">{t.account.phone}</div>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={accPhone}
                onChange={(e) => {
                  setAccPhone(e.target.value);
                  setEditAccount(true);
                }}
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm opacity-70">{t.account.facebook}</div>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={accFacebook}
                onChange={(e) => {
                  setAccFacebook(e.target.value);
                  setEditAccount(true);
                }}
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm opacity-70">{t.account.instagram}</div>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={accInstagram}
                onChange={(e) => {
                  setAccInstagram(e.target.value);
                  setEditAccount(true);
                }}
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm opacity-70">{t.account.tiktok}</div>
              <input
                className="w-full rounded-xl border px-3 py-2"
                value={accTiktok}
                onChange={(e) => {
                  setAccTiktok(e.target.value);
                  setEditAccount(true);
                }}
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm opacity-70">{t.account.email}</div>
              <input className="w-full rounded-xl border px-3 py-2 bg-gray-50" value={me.email} readOnly />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={saveAccount} disabled={accBusy || !editAccount}>
              {accBusy ? t.account.saving : t.account.save}
            </Button>
            <Button
              variant="outline"
              disabled={accBusy}
              onClick={() => {
                // rollback
                setAccName(me.name ?? "");
                setAccPhone(me.phone ?? "");
                setAccFacebook(me.facebook_url ?? "");
                setAccInstagram(me.instagram_url ?? "");
                setAccTiktok(me.tiktok_url ?? "");
                setAccPhoto(me.profile_photo ?? null);
                setEditAccount(false);
                setAccMsg(null);
              }}
            >
              {t.account.cancel}
            </Button>
            {accMsg ? <div className="text-sm opacity-80">{accMsg}</div> : null}
          </div>

          {/* If no profiles: choose */}
          {!hasWorkers && !hasCompany && (
            <div className="rounded-2xl border p-4 bg-gray-50 space-y-2">
              <div className="font-semibold">{t.choose.title}</div>
              <div className="text-sm opacity-70">{t.choose.hint}</div>
              <div className="flex gap-2 flex-wrap">
                <Link href={`${base}/worker/new`}>
                  <Button>{t.choose.createWorker}</Button>
                </Link>
                <Link href={`${base}/company/new`}>
                  <Button variant="outline">{t.choose.createCompany}</Button>
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {/* WORKERS TAB */}
      {tab === "workers" && !hasCompany && (
        <section className="space-y-4">
          {workerProfiles.length === 0 ? (
            <div className="rounded-2xl border bg-white p-5">
              <div className="text-sm opacity-70">{t.workers.empty}</div>
            </div>
          ) : (
            workerProfiles.map((w) => {
              const photos = workerPhotos[w.id] || [];
              const loadingP = workerPhotosLoading[w.id];

              const items: PhotoItem[] = photos.map((p) => ({
                id: p.id,
                url: p.image_url,
                caption: p.caption ?? "",
                is_cover: !!p.is_cover,
              }));

              return (
                <div key={w.id} className="rounded-2xl border bg-white p-5 space-y-4">
                  <div className="flex justify-between items-center gap-3 flex-wrap">
                    <div className="font-semibold">{w.title_or_name ?? `#${w.id}`}</div>

                    <div className="flex gap-2">
                      <Link href={`${base}/worker/${w.id}`}>
                        <Button variant="outline">{t.workers.view}</Button>
                      </Link>
                      <Link href={`${base}/worker/${w.id}/edit`}>
                        <Button>{t.workers.edit}</Button>
                      </Link>
                      <Button variant="outline" onClick={() => deleteWorkerProfile(w.id)}>
                        {t.workers.del}
                      </Button>
                    </div>
                  </div>

                  <div className="text-sm opacity-70">{t.workers.photosTitle}</div>

                  {loadingP ? (
                    <div className="text-sm opacity-70">{t.loading}</div>
                  ) : (
                    <PhotoUrlPicker
                      mode="crud"
                      max={5}
                      allowUrl={false}
                      value={items}
                      radioGroupName={`worker-${w.id}`}
                      crud={{
                        onCreate: async (item) => {
                          await workerPhotosCreate(w.id, item);
                        },
                        onDelete: async (photoId) => {
                          await workerPhotosDelete(w.id, photoId);
                        },
                        onSetCover: async (photoId) => {
                          await workerPhotosSetCover(w.id, photoId);
                        },
                        onUpdateCaption: async (photoId, caption) => {
                          await workerPhotosUpdateCaption(w.id, photoId, caption);
                        },
                      }}
                      title={t.workers.photosTitle}
                      subtitle=""
                    />
                  )}
                </div>
              );
            })
          )}

          {/* Create worker only if < 7 */}
          {!hasCompany && (
            <div className="flex items-center gap-2 flex-wrap">
              {workerProfiles.length >= MAX_WORKER_PROFILES ? (
                <div className="text-sm text-red-600">{t.workers.maxReached}</div>
              ) : (
                <Link href={`${base}/worker/new`}>
                  <Button>{t.workers.create}</Button>
                </Link>
              )}
            </div>
          )}
        </section>
      )}

      {/* COMPANY TAB */}
      {tab === "company" && !hasWorkers && (
        <section className="space-y-4">
          {!companyProfileRow ? (
            <div className="rounded-2xl border bg-white p-5 space-y-3">
              <div className="text-sm opacity-70">{t.company.empty}</div>
              <Link href={`${base}/company/new`}>
                <Button>{t.company.create}</Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border bg-white p-5 space-y-5">
              <div className="flex justify-between items-center gap-3 flex-wrap">
                <div className="font-semibold">{t.company.sectionEdit}</div>
                <Button variant="outline" onClick={deleteCompanyProfile}>
                  {t.company.del}
                </Button>
              </div>

              {/* form */}
              <div className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-sm opacity-70">{t.company.name}</div>
                  <input
                    className="w-full rounded-xl border px-3 py-2"
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-sm opacity-70">{t.company.city}</div>
                  <select
                    className="w-full rounded-xl border px-3 py-2"
                    value={cCityId ?? ""}
                    onChange={(e) => setCCityId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">{t.company.choose}</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {labelCity(c, lang)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="text-sm opacity-70">{t.company.address}</div>
                  <input
                    className="w-full rounded-xl border px-3 py-2"
                    value={cLocation}
                    onChange={(e) => setCLocation(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-sm opacity-70">{t.company.phone}</div>
                  <input
                    className="w-full rounded-xl border px-3 py-2"
                    value={cPhone}
                    onChange={(e) => setCPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-sm opacity-70">{t.company.email}</div>
                  <input
                    className="w-full rounded-xl border px-3 py-2"
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-sm opacity-70">{t.company.website}</div>
                  <input
                    className="w-full rounded-xl border px-3 py-2"
                    value={cWebsite}
                    onChange={(e) => setCWebsite(e.target.value)}
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <div className="text-sm opacity-70">{t.company.desc}</div>
                  <textarea
                    className="w-full rounded-xl border px-3 py-2 min-h-[110px]"
                    value={cDesc}
                    onChange={(e) => setCDesc(e.target.value)}
                  />
                </div>
              </div>

              {/* ✅ sectors grouped by umbrella (dropdown compact multi-select) */}
              <div className="space-y-2">
                <div className="text-sm opacity-70">{t.company.sectors}</div>

                <SectorDropdown
                  disabled={false}
                  umbrellas={umbrellas}
                  value={companySectorIds}
                  onChange={setCompanySectorIds}
                  placeholder={t.company.sectorsPlaceholder}
                  searchPlaceholder={t.company.sectorsSearchPh}
                  selectedText={(n) => (lang === "ar" ? `تم اختيار ${n}` : `${n} secteur(s) sélectionné(s)`)}
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={saveCompany} disabled={companyBusy}>
                  {companyBusy ? t.company.saving : t.company.save}
                </Button>
                {companyMsg ? <div className="text-sm opacity-80">{companyMsg}</div> : null}
              </div>

              {/* company photos CRUD */}
              <div className="space-y-2">
                <div className="text-sm opacity-70">{t.company.photosTitle}</div>
                <PhotoUrlPicker
                  mode="crud"
                  max={10}
                  allowUrl={false}
                  value={companyPhotos.map((p) => ({
                    id: p.id,
                    url: p.image_url,
                    caption: p.caption ?? "",
                    is_cover: !!p.is_cover,
                  }))}
                  radioGroupName={`company-${companyProfileRow.id}`}
                  crud={{
                    onCreate: async (item) => {
                      await companyPhotoCreate(item);
                    },
                    onDelete: async (photoId) => {
                      await companyPhotoDelete(photoId);
                    },
                    onSetCover: async (photoId) => {
                      await companyPhotoSetCover(photoId);
                    },
                    onUpdateCaption: async (photoId, caption) => {
                      await companyPhotoUpdateCaption(photoId, caption);
                    },
                  }}
                  title={t.company.photosTitle}
                  subtitle=""
                />
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
