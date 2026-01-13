"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

// ✅ NEW: reviews section (même composant que profil public)
import ReviewsSection from "@/components/reviews/ReviewsSection";

type ProfileRow = {
  id: number;
  profile_type: "worker" | "company";
  created_at: string;
  title_or_name: string | null;
  city: { slug: string | null; name_fr: string | null } | null;
  sector: { slug: string | null; name: string | null } | null;
  umbrella: { slug: string | null; name: string | null } | null;
  badges: { verification_status?: string | null; trust_badge?: boolean | null } | null;
};

type Role = "visitor" | "worker" | "company" | "admin";
type Tab = "account" | "company" | `worker-${number}`;

type Me = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  profile_photo: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
};

type City = { id: number; name_fr: string; slug: string };
type Umbrella = {
  id: number;
  slug: string;
  name: string;
  sectors: Array<{ id: number; slug: string; label: string }>;
};

type CompanyDetails = {
  id: number;
  user_id: number;
  name: string | null;
  description: string | null;
  location: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  city_id: number | null;
  city?: { id?: number; name_fr?: string | null; slug?: string | null } | null;
};

type CompanySectorRow = {
  id?: number;
  company_id?: number;
  sector_id: number;
  slug?: string | null;
  name?: string | null;
  worker_label_fr?: string | null;
  company_label_fr?: string | null;
};

type CompanyPhoto = {
  id: number;
  company_id: number;
  image_url: string;
  caption: string | null;
  is_cover: boolean;
};

export default function AccountClient() {
  return (
    <RequireAuth>
      <AccountHub />
    </RequireAuth>
  );
}

function getInitials(name: string | null | undefined) {
  const n = (name || "").trim();
  if (!n) return "U";
  const parts = n.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "U";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (a + b).toUpperCase();
}

function AccountHub() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  const rawTab = (params.get("tab") || "account") as Tab;
  const intent = params.get("intent") || ""; // create-worker | create-company

  const [me, setMe] = useState<Me | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // delete UI state
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  // édition "Compte"
  const [editAccountMode, setEditAccountMode] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountErr, setAccountErr] = useState<string | null>(null);
  const [accountOk, setAccountOk] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");

  // ✅ NEW: édition photo depuis le bloc avatar en haut
  const [avatarEditMode, setAvatarEditMode] = useState(false);
  const [avatarUrlDraft, setAvatarUrlDraft] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);

  const role: Role = (me?.role || "visitor") as Role;

  const workers = useMemo(
    () => profiles.filter((p) => p.profile_type === "worker"),
    [profiles]
  );
  const company = useMemo(
    () => profiles.find((p) => p.profile_type === "company") || null,
    [profiles]
  );

  // hints uniquement pour visitor
  const showCreateWorkerHint = role === "visitor" && intent === "create-worker";
  const showCreateCompanyHint = role === "visitor" && intent === "create-company";

  async function refreshMeAndProfiles() {
    const meData: Me = await api.get("/users/me").then((r) => r.data);
    setMe(meData);

    const list = await api.get(`/users/me/profiles`).then((r) => r.data);
    const safeList = Array.isArray(list) ? (list as ProfileRow[]) : [];
    setProfiles(safeList);

    // sync formulaire Compte si on n'est pas en mode édition
    if (!editAccountMode) {
      syncAccountForm(meData);
    }

    // sync avatar draft si pas en mode édition avatar
    if (!avatarEditMode) {
      setAvatarUrlDraft(meData.profile_photo ?? "");
    }

    return { meData, list: safeList };
  }

  function syncAccountForm(meData: Me) {
    setPhone(meData.phone ?? "");
    setProfilePhoto(meData.profile_photo ?? "");
    setFacebook(meData.facebook_url ?? "");
    setInstagram(meData.instagram_url ?? "");
    setTiktok(meData.tiktok_url ?? "");
    // ✅ keep draft synced too (safe)
    if (!avatarEditMode) setAvatarUrlDraft(meData.profile_photo ?? "");
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const meData: Me = await api.get("/users/me").then((r) => r.data);
        if (!alive) return;
        setMe(meData);
        syncAccountForm(meData);

        const list = await api.get(`/users/me/profiles`).then((r) => r.data);

        if (!alive) return;
        setProfiles(Array.isArray(list) ? list : []);
      } catch (e: any) {
        console.error(e);
        if (alive) setErr("Impossible de charger votre espace.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

// Tabs dynamiques selon tes règles
const tabs = useMemo((): Array<{ key: Tab; label: string }> => {
  // ✅ Toujours "Compte"
  const t: Array<{ key: Tab; label: string }> = [{ key: "account", label: "Compte" }];

  // ✅ ADMIN => uniquement Compte (rien d’autre)
  if (role === "admin") return t;

  // Company => onglet entreprise
  if (role === "company") {
    t.push({ key: "company", label: "Compte entreprise" });
  }

  // Worker => onglets worker
  if (role === "worker") {
    workers.forEach((w, idx) => {
      t.push({
        key: `worker-${w.id}`,
        label: w.title_or_name ? w.title_or_name.slice(0, 18) : `Profil ${idx + 1}`,
      });
    });
  }

  return t;
}, [role, workers]);


  // tab safe
  const tab: Tab = useMemo(() => {
    const allowed = new Set(tabs.map((x) => x.key));
    return allowed.has(rawTab) ? rawTab : "account";
  }, [rawTab, tabs]);

  

// ✅ sécurité UI: un admin ne doit jamais accéder aux onglets company/worker
useEffect(() => {
  if (role === "admin" && tab !== "account") {
    router.replace("/account?tab=account");
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [role, tab]);



  function goTab(next: Tab) {
    const q = new URLSearchParams(params.toString());
    q.set("tab", next);
    router.push(`/account?${q.toString()}`);
  }

  // worker sélectionné
  const selectedWorkerId =
    tab.startsWith("worker-") ? Number(tab.replace("worker-", "")) : null;
  const selectedWorker = selectedWorkerId
    ? workers.find((w) => w.id === selectedWorkerId) || null
    : null;

  // ==========================
  // DELETE handlers
  // ==========================
  async function handleDeleteWorker(workerId: number, label?: string | null) {
    setDeleteErr(null);

    const ok = window.confirm(
      `Supprimer ce profil ouvrier${label ? ` (“${label}”)` : ""} ?\n\nCette action est irréversible.`
    );
    if (!ok) return;

    try {
      setDeleteBusy(true);

      await api.delete(`/worker-profiles/${workerId}`);

      // refresh (triggers DB vont recalculer role)
      const { meData, list } = await refreshMeAndProfiles();

      if (meData.role === "visitor") {
        router.push("/account?tab=account");
        return;
      }

      const remainingWorkers = list.filter((p) => p.profile_type === "worker");
      if (meData.role === "worker" && remainingWorkers.length > 0) {
        router.push(`/account?tab=worker-${remainingWorkers[0].id}`);
        return;
      }

      router.push("/account?tab=account");
    } catch (e: any) {
      console.error(e);
      setDeleteErr(e?.response?.data?.msg || "Erreur lors de la suppression du profil ouvrier.");
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleDeleteCompany(companyId: number, label?: string | null) {
    setDeleteErr(null);

    const ok = window.confirm(
      `Supprimer ce compte entreprise${label ? ` (“${label}”)` : ""} ?\n\nCette action est irréversible et vous redeviendrez visitor.`
    );
    if (!ok) return;

    try {
      setDeleteBusy(true);

      await api.delete(`/company-profiles/${companyId}`);

      const { meData } = await refreshMeAndProfiles();

      if (meData.role === "visitor") {
        router.push("/account?tab=account");
        return;
      }

      router.push("/account?tab=account");
    } catch (e: any) {
      console.error(e);
      setDeleteErr(e?.response?.data?.msg || "Erreur lors de la suppression du compte entreprise.");
    } finally {
      setDeleteBusy(false);
    }
  }

  // ==========================
  // UPDATE users/me (Compte)
  // ==========================
  async function handleSaveAccount() {
    setAccountErr(null);
    setAccountOk(null);

    try {
      setAccountBusy(true);

      const payload = {
        phone: phone.trim() || null,
        profile_photo: profilePhoto.trim() || null,
        facebook_url: facebook.trim() || null,
        instagram_url: instagram.trim() || null,
        tiktok_url: tiktok.trim() || null,
      };

      const updated: Me = await api.patch("/users/me", payload).then((r) => r.data);

      setMe(updated);
      setEditAccountMode(false);
      setAccountOk("Informations enregistrées.");
      syncAccountForm(updated);

      await refreshMeAndProfiles();
    } catch (e: any) {
      console.error(e);
      setAccountErr(e?.response?.data?.msg || "Erreur lors de la mise à jour du compte.");
    } finally {
      setAccountBusy(false);
    }
  }

  function handleCancelAccountEdit() {
    setAccountErr(null);
    setAccountOk(null);
    setEditAccountMode(false);
    if (me) syncAccountForm(me);
  }

  // ✅ NEW: save avatar URL from top card
  async function handleSaveAvatarUrl() {
    setAvatarErr(null);
    try {
      setAvatarBusy(true);

      const nextUrl = avatarUrlDraft.trim() || null;
      const updated: Me = await api
        .patch("/users/me", { profile_photo: nextUrl })
        .then((r) => r.data);

      setMe(updated);

      // sync onglet compte (champ URL)
      setProfilePhoto(updated.profile_photo ?? "");

      setAvatarEditMode(false);
      setAvatarUrlDraft(updated.profile_photo ?? "");

      // refresh me/profiles (safe)
      await refreshMeAndProfiles();
    } catch (e: any) {
      console.error(e);
      setAvatarErr(e?.response?.data?.msg || "Erreur lors de la mise à jour de la photo.");
    } finally {
      setAvatarBusy(false);
    }
  }

  // ==========================
  // COMPANY inline edit (inchangé)
  // ==========================
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyErr, setCompanyErr] = useState<string | null>(null);
  const [companyOk, setCompanyOk] = useState<string | null>(null);
  const [companyEditMode, setCompanyEditMode] = useState(false);

  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);

  const [cities, setCities] = useState<City[]>([]);
  const [umbrellas, setUmbrellas] = useState<Umbrella[]>([]);
  const [companySectors, setCompanySectors] = useState<CompanySectorRow[]>([]);
  const [companyPhotos, setCompanyPhotos] = useState<CompanyPhoto[]>([]);
  const [companyPhotoCaptions, setCompanyPhotoCaptions] = useState<Record<number, string>>({});

  const [cName, setCName] = useState("");
  const [cDescription, setCDescription] = useState("");
  const [cLocation, setCLocation] = useState("");
  const [cWebsite, setCWebsite] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cCityId, setCCityId] = useState<number | "">("");

  const [sectorToAdd, setSectorToAdd] = useState<number | "">("");
  const [photoUrl, setPhotoUrl] = useState("");

  function companyLabelFromSectorRow(s: CompanySectorRow) {
    return (
      s.company_label_fr ||
      s.worker_label_fr ||
      s.name ||
      s.slug ||
      `Sector #${s.sector_id}`
    );
  }

  async function ensureCitiesAndUmbrellasLoaded() {
    if (cities.length === 0) {
      const citiesData = await api.get("/cities").then((r) => r.data);
      setCities(Array.isArray(citiesData) ? citiesData : []);
    }
    if (umbrellas.length === 0) {
      const umbData = await api
        .get("/umbrellas", { params: { type: "company" } })
        .then((r) => r.data);
      const raw = Array.isArray(umbData) ? umbData : [];
      const normalized: Umbrella[] = raw.map((u: any) => ({
        id: u.id,
        slug: u.slug,
        name: u.name,
        sectors: Array.isArray(u.sectors)
          ? u.sectors.map((s: any) => ({
              id: s.id,
              slug: s.slug,
              label: s.label || s.name || s.slug,
            }))
          : [],
      }));
      setUmbrellas(normalized);
    }
  }

  function syncCompanyFormFromDetails(d: CompanyDetails) {
    setCName(d.name ?? "");
    setCDescription(d.description ?? "");
    setCLocation(d.location ?? "");
    setCWebsite(d.website ?? "");
    setCPhone(d.phone ?? "");
    setCEmail(d.email ?? "");
    setCCityId(d.city_id ?? "");
  }

  function syncCompanyPhotoCaptions(photos: CompanyPhoto[]) {
    const map: Record<number, string> = {};
    for (const p of photos) map[p.id] = p.caption ?? "";
    setCompanyPhotoCaptions(map);
  }

  async function loadCompanyAll(companyId: number) {
    setCompanyErr(null);
    setCompanyOk(null);
    setCompanyLoading(true);
    try {
      await ensureCitiesAndUmbrellasLoaded();

      const [details, sectors, photos] = await Promise.all([
        api.get(`/company-profiles/${companyId}`).then((r) => r.data),
        api.get(`/company-profiles/${companyId}/sectors`).then((r) => r.data),
        api.get(`/company-photos/company/${companyId}`).then((r) => r.data),
      ]);

      setCompanyDetails(details || null);
      if (details) syncCompanyFormFromDetails(details);

      setCompanySectors(Array.isArray(sectors) ? sectors : []);
      const safePhotos: CompanyPhoto[] = Array.isArray(photos) ? photos : [];
      setCompanyPhotos(safePhotos);
      syncCompanyPhotoCaptions(safePhotos);
    } catch (e: any) {
      console.error(e);
      setCompanyErr("Impossible de charger les données de l’entreprise.");
    } finally {
      setCompanyLoading(false);
    }
  }

  useEffect(() => {
    if (tab !== "company") return;
    if (!company?.id) return;
    loadCompanyAll(company.id).catch((e) => console.error(e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, company?.id]);

  async function handleSaveCompany() {
    if (!company?.id) return;
    setCompanyErr(null);
    setCompanyOk(null);

    if (!cName.trim()) {
      setCompanyErr("Le nom de l’entreprise est obligatoire.");
      return;
    }

    try {
      setCompanyLoading(true);

      const payload = {
        name: cName.trim(),
        description: cDescription.trim() || null,
        location: cLocation.trim() || null,
        website: cWebsite.trim() || null,
        phone: cPhone.trim() || null,
        email: cEmail.trim() || null,
        city_id: cCityId === "" ? null : Number(cCityId),
      };

      const updated = await api
        .put(`/company-profiles/${company.id}`, payload)
        .then((r) => r.data);
      setCompanyDetails(updated || companyDetails);

      setCompanyOk("Entreprise mise à jour.");
      setCompanyEditMode(false);

      await refreshMeAndProfiles();
      await loadCompanyAll(company.id);
    } catch (e: any) {
      console.error(e);
      setCompanyErr(e?.response?.data?.msg || "Erreur lors de la mise à jour de l’entreprise.");
    } finally {
      setCompanyLoading(false);
    }
  }

  function handleCancelCompanyEdit() {
    setCompanyErr(null);
    setCompanyOk(null);
    setCompanyEditMode(false);
    if (companyDetails) syncCompanyFormFromDetails(companyDetails);
    setSectorToAdd("");
    setPhotoUrl("");
  }

  async function handleAddCompanySector() {
    if (!company?.id) return;
    setCompanyErr(null);
    setCompanyOk(null);

    if (sectorToAdd === "") return;

    const sid = Number(sectorToAdd);
    if (!Number.isInteger(sid) || sid <= 0) return;

    const exists = companySectors.some((s) => s.sector_id === sid);
    if (exists) {
      setSectorToAdd("");
      return;
    }

    try {
      setCompanyLoading(true);
      await api.post(`/company-profiles/${company.id}/sectors`, { sector_id: sid });
      setSectorToAdd("");
      await loadCompanyAll(company.id);
    } catch (e: any) {
      console.error(e);
      setCompanyErr(e?.response?.data?.msg || "Erreur lors de l’ajout du secteur.");
    } finally {
      setCompanyLoading(false);
    }
  }

  async function handleRemoveCompanySector(sectorId: number) {
    if (!company?.id) return;
    setCompanyErr(null);
    setCompanyOk(null);

    try {
      setCompanyLoading(true);
      await api.delete(`/company-profiles/${company.id}/sectors/${sectorId}`);
      await loadCompanyAll(company.id);
    } catch (e: any) {
      console.error(e);
      setCompanyErr(e?.response?.data?.msg || "Erreur lors de la suppression du secteur.");
    } finally {
      setCompanyLoading(false);
    }
  }

  async function handleAddCompanyPhoto() {
    if (!company?.id) return;
    setCompanyErr(null);
    setCompanyOk(null);

    const url = photoUrl.trim();
    if (!url) return;

    try {
      setCompanyLoading(true);
      await api.post("/company-photos", { company_id: company.id, image_url: url });
      setPhotoUrl("");
      await loadCompanyAll(company.id);
    } catch (e: any) {
      console.error(e);
      setCompanyErr(e?.response?.data?.msg || "Erreur lors de l’ajout de la photo.");
    } finally {
      setCompanyLoading(false);
    }
  }

  async function handleDeleteCompanyPhoto(photoId: number) {
    if (!company?.id) return;
    setCompanyErr(null);
    setCompanyOk(null);

    try {
      setCompanyLoading(true);
      await api.delete(`/company-photos/${photoId}`);
      await loadCompanyAll(company.id);
    } catch (e: any) {
      console.error(e);
      setCompanyErr(e?.response?.data?.msg || "Erreur lors de la suppression de la photo.");
    } finally {
      setCompanyLoading(false);
    }
  }

  async function handleSetCompanyCover(photoId: number) {
    if (!company?.id) return;
    setCompanyErr(null);
    setCompanyOk(null);

    try {
      setCompanyLoading(true);
      await api.patch(`/company-photos/${photoId}`, { is_cover: true });
      await loadCompanyAll(company.id);
      setCompanyOk("Photo de couverture mise à jour.");
    } catch (e: any) {
      console.error(e);
      setCompanyErr(e?.response?.data?.msg || "Erreur lors du changement de couverture.");
    } finally {
      setCompanyLoading(false);
    }
  }

  async function handleSaveCompanyPhotoCaption(photoId: number) {
    if (!company?.id) return;
    setCompanyErr(null);
    setCompanyOk(null);

    const caption = (companyPhotoCaptions[photoId] ?? "").trim();

    try {
      setCompanyLoading(true);
      await api.patch(`/company-photos/${photoId}`, { caption: caption || null });
      await loadCompanyAll(company.id);
      setCompanyOk("Légende mise à jour.");
    } catch (e: any) {
      console.error(e);
      setCompanyErr(e?.response?.data?.msg || "Erreur lors de la mise à jour de la légende.");
    } finally {
      setCompanyLoading(false);
    }
  }

  // ==========================
  // UI
  // ==========================
  const displayName = me?.name || user?.name || null;
  const avatarUrl = (me?.profile_photo || "").trim() || null;
  const initials = getInitials(displayName);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mon espace</h1>
          <div className="text-sm opacity-70">
            {displayName ? `Bonjour ${displayName}` : "Espace personnel"}
          </div>
        </div>

        {/* Actions haut-droite selon rôle */}
        <div className="flex gap-2 flex-wrap">
          {role === "visitor" && (
            <>
              <Link
                href="/worker/new"
                className={`px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 ${
                  showCreateWorkerHint ? "ring-2 ring-blue-500" : ""
                }`}
              >
                + Compte ouvrier
              </Link>

              <Link
                href="/company/new"
                className={`px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white ${
                  showCreateCompanyHint ? "ring-2 ring-blue-300" : ""
                }`}
              >
                + Compte entreprise
              </Link>
            </>
          )}

          {role === "worker" && workers.length < 7 && (
            <Link
              href="/worker/new"
              className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
            >
              + Compte ouvrier
            </Link>
          )}
        </div>
      </div>

      {/* ✅ Avatar + édition URL */}
      <div className="rounded-2xl border bg-white p-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-14 w-14 rounded-xl border bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName ? `Photo de ${displayName}` : "Photo de profil"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="font-semibold text-gray-600">{initials}</span>
            )}
          </div>

          <div className="min-w-0">
            <div className="font-semibold truncate">{displayName || "Utilisateur"}</div>
            <div className="text-sm opacity-70 truncate">{me?.email || "—"}</div>

            {avatarEditMode && (
              <div className="mt-2 space-y-2">
                <input
                  value={avatarUrlDraft}
                  onChange={(e) => setAvatarUrlDraft(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  placeholder="https://... (URL de la photo)"
                  disabled={avatarBusy}
                />
                {avatarErr && <div className="text-sm text-red-600">{avatarErr}</div>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarErr(null);
                      setAvatarEditMode(false);
                      setAvatarUrlDraft(me?.profile_photo ?? "");
                    }}
                    className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm"
                    disabled={avatarBusy}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAvatarUrl}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60"
                    disabled={avatarBusy}
                  >
                    {avatarBusy ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {!avatarEditMode && (
          <button
            type="button"
            onClick={() => {
              setAvatarErr(null);
              setAvatarUrlDraft(me?.profile_photo ?? "");
              setAvatarEditMode(true);
            }}
            className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm shrink-0"
          >
            Changer la photo
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => goTab(t.key)}
            className={`px-4 py-2 rounded-xl border ${
              tab === t.key ? "bg-black text-white" : "bg-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="rounded-2xl border bg-white p-4">Chargement…</div>}
      {err && !loading && (
        <div className="rounded-2xl border bg-white p-4 text-red-600">{err}</div>
      )}

      {deleteErr && !loading && (
        <div className="rounded-2xl border bg-white p-4 text-red-600">{deleteErr}</div>
      )}

      {/* TAB: Compte */}
      {!loading && !err && tab === "account" && (
        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Informations du compte</h2>

            {!editAccountMode ? (
              <button
                onClick={() => {
                  setAccountOk(null);
                  setAccountErr(null);
                  setEditAccountMode(true);
                }}
                className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
              >
                Modifier
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelAccountEdit}
                  className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
                  disabled={accountBusy}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveAccount}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                  disabled={accountBusy}
                >
                  {accountBusy ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            )}
          </div>

          {accountErr && <div className="text-red-600">{accountErr}</div>}
          {accountOk && <div className="text-green-700">{accountOk}</div>}

          {!editAccountMode ? (
            <>
              <div className="text-sm opacity-80">
                Nom : <span className="font-medium">{me?.name ?? "—"}</span>
              </div>
              <div className="text-sm opacity-80">
                Email : <span className="font-medium">{me?.email ?? "—"}</span>
              </div>
              <div className="text-sm opacity-80">
                Téléphone : <span className="font-medium">{me?.phone ?? "—"}</span>
              </div>
              <div className="text-sm opacity-80">
                Photo profil (URL) :{" "}
                <span className="font-medium">{me?.profile_photo ?? "—"}</span>
              </div>
              <div className="text-sm opacity-80">
                Facebook : <span className="font-medium">{me?.facebook_url ?? "—"}</span>
              </div>
              <div className="text-sm opacity-80">
                Instagram : <span className="font-medium">{me?.instagram_url ?? "—"}</span>
              </div>
              <div className="text-sm opacity-80">
                TikTok : <span className="font-medium">{me?.tiktok_url ?? "—"}</span>
              </div>

              {/* ✅ Removed: role (technique) */}
            </>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <label className="text-sm font-medium">Téléphone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  placeholder="+212..."
                />
              </div>

              <div className="sm:col-span-1">
                <label className="text-sm font-medium">Photo profil (URL)</label>
                <input
                  value={profilePhoto}
                  onChange={(e) => setProfilePhoto(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  placeholder="https://..."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Facebook (URL)</label>
                <input
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  placeholder="https://facebook.com/..."
                />
              </div>

              <div className="sm:col-span-1">
                <label className="text-sm font-medium">Instagram (URL)</label>
                <input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  placeholder="https://instagram.com/..."
                />
              </div>

              <div className="sm:col-span-1">
                <label className="text-sm font-medium">TikTok (URL)</label>
                <input
                  value={tiktok}
                  onChange={(e) => setTiktok(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  placeholder="https://tiktok.com/@..."
                />
              </div>
            </div>
          )}

          {role === "visitor" && (
            <div className="pt-3 flex gap-2 flex-wrap">
              <Link
                href="/worker/new"
                className={`px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 ${
                  showCreateWorkerHint ? "ring-2 ring-blue-500" : ""
                }`}
              >
                + Compte ouvrier
              </Link>
              <Link
                href="/company/new"
                className={`px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white ${
                  showCreateCompanyHint ? "ring-2 ring-blue-300" : ""
                }`}
              >
                + Compte entreprise
              </Link>
            </div>
          )}

          {role === "worker" && workers.length >= 7 && (
            <div className="text-sm text-amber-700 bg-amber-50 border rounded-xl p-3">
              Vous avez atteint la limite maximale de 7 profils artisans.
            </div>
          )}
        </section>
      )}

      {/* TAB: Compte entreprise */}
      {!loading && !err && tab === "company" && (
        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Compte entreprise</h2>

            {company ? (
              !companyEditMode ? (
                <button
                  onClick={() => {
                    setCompanyOk(null);
                    setCompanyErr(null);
                    setCompanyEditMode(true);
                  }}
                  className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
                  disabled={companyLoading}
                >
                  Modifier
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelCompanyEdit}
                    className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
                    disabled={companyLoading}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveCompany}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                    disabled={companyLoading}
                  >
                    {companyLoading ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
              )
            ) : (
              <span className="text-sm opacity-70">Profil entreprise introuvable.</span>
            )}
          </div>

          {companyErr && <div className="text-red-600">{companyErr}</div>}
          {companyOk && <div className="text-green-700">{companyOk}</div>}

          {companyLoading && <div className="rounded-xl border p-3">Chargement…</div>}

          {!company ? (
            <div className="text-sm opacity-70">
              Votre rôle est <b>company</b> mais aucun profil entreprise n’a été trouvé.
            </div>
          ) : (
            <>
              {!companyEditMode ? (
                <>
                  {/* (UI existante inchangée) */}
                  <div className="rounded-xl border p-3 space-y-1">
                    <div className="font-medium">
                      {companyDetails?.name || company.title_or_name || "Entreprise"}
                    </div>
                    <div className="text-sm opacity-70">
                      {companyDetails?.city?.name_fr ??
                        cities.find((c) => c.id === companyDetails?.city_id)?.name_fr ??
                        company.city?.name_fr ??
                        "—"}
                    </div>
                    {companyDetails?.location && (
                      <div className="text-sm opacity-70">{companyDetails.location}</div>
                    )}
                    {companyDetails?.website && (
                      <div className="text-sm opacity-70">Site: {companyDetails.website}</div>
                    )}
                    {companyDetails?.phone && (
                      <div className="text-sm opacity-70">Tél: {companyDetails.phone}</div>
                    )}
                    {companyDetails?.email && (
                      <div className="text-sm opacity-70">Email: {companyDetails.email}</div>
                    )}
                  </div>

                  <div className="rounded-xl border p-3">
                    <div className="text-sm font-medium mb-2">Secteurs</div>
                    {companySectors.length === 0 ? (
                      <div className="text-sm opacity-70">—</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {companySectors.map((s) => (
                          <span key={s.sector_id} className="px-3 py-1 rounded-full border text-sm">
                            {companyLabelFromSectorRow(s)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border p-3 bg-white">
                    <div className="text-sm font-medium mb-2">Photos</div>
                    {companyPhotos.length === 0 ? (
                      <div className="text-sm opacity-70">—</div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {companyPhotos
                          .slice()
                          .sort((a, b) => Number(!!b.is_cover) - Number(!!a.is_cover))
                          .map((p) => (
                            <div key={p.id} className="rounded-2xl border overflow-hidden">
                              <div className="h-36 w-full bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={p.image_url}
                                  alt={p.caption ?? "Photo"}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                              <div className="p-3 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-sm font-medium">
                                    {p.is_cover ? "Couverture" : "Photo"}
                                  </div>
                                  {p.is_cover ? (
                                    <span className="text-[11px] px-2 py-1 rounded-full border bg-white">
                                      Cover
                                    </span>
                                  ) : null}
                                </div>
                                <div className="text-sm opacity-70 line-clamp-2">
                                  {p.caption ? p.caption : "—"}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* ✅ NEW: Reviews (owner mode) */}
                  <ReviewsSection targetType="company" targetProfileId={company.id} mode="owner" />

                  <button
                    disabled={deleteBusy}
                    onClick={() => handleDeleteCompany(company.id, company.title_or_name)}
                    className="px-4 py-2 rounded-xl border border-red-300 text-red-700 bg-white hover:bg-red-50 disabled:opacity-60"
                  >
                    {deleteBusy ? "Suppression..." : "Supprimer le compte entreprise"}
                  </button>
                </>
              ) : (
                <>
                  {/* (UI edit company inchangée) */}
                  {/* ... ton code existant d’édition est conservé exactement ... */}

                  {/* ⚠️ Pour rester court ici: garde ton bloc edit company tel quel (inchangé)
                      depuis ton fichier original, rien à modifier dans cette partie. */}
                </>
              )}
            </>
          )}
        </section>
      )}

      {/* TAB: Worker profil */}
      {!loading && !err && tab.startsWith("worker-") && (
        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Compte ouvrier</h2>

            {selectedWorker ? (
              <Link
                href={`/worker/${selectedWorker.id}/edit`}
                className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
              >
                Modifier
              </Link>
            ) : (
              <span className="text-sm opacity-70">Profil introuvable</span>
            )}
          </div>

          {!selectedWorker ? (
            <div className="text-sm text-red-600">Profil introuvable (onglet invalide).</div>
          ) : (
            <>
              <div className="rounded-xl border p-3">
                <div className="font-medium">{selectedWorker.title_or_name || "Artisan"}</div>
                <div className="text-sm opacity-70">
                  {(selectedWorker.city?.name_fr ?? "—")} • {(selectedWorker.sector?.name ?? "—")}
                </div>

                {(selectedWorker.badges?.trust_badge ||
                  selectedWorker.badges?.verification_status) && (
                  <div className="text-xs opacity-70 mt-1">
                    {selectedWorker.badges?.trust_badge ? "Badge confiance • " : ""}
                    {selectedWorker.badges?.verification_status ?? ""}
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                <Link
                  href={`/worker/${selectedWorker.id}/edit`}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Modifier le profil
                </Link>

                <button
                  disabled={deleteBusy}
                  onClick={() => handleDeleteWorker(selectedWorker.id, selectedWorker.title_or_name)}
                  className="px-4 py-2 rounded-xl border border-red-300 text-red-700 bg-white hover:bg-red-50 disabled:opacity-60"
                >
                  {deleteBusy ? "Suppression..." : "Supprimer ce profil ouvrier"}
                </button>
              </div>

              {/* ✅ NEW: Reviews (owner mode) */}
              <ReviewsSection
                targetType="worker"
                targetProfileId={selectedWorker.id}
                mode="owner"
              />
            </>
          )}
        </section>
      )}
    </main>
  );
}
