"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { api } from "@/lib/api";

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
  region?: string | null;
};

type Umbrella = {
  id: number;
  slug: string;
  name: string;
  sectors: Array<{ id: number; slug: string; name: string; label: string }>;
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

export default function WorkerNewPage() {
  return (
    <RequireAuth>
      <WorkerNewInner />
    </RequireAuth>
  );
}

function WorkerNewInner() {
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [workerCount, setWorkerCount] = useState<number>(0);

  const [cities, setCities] = useState<City[]>([]);
  const [cityQuery, setCityQuery] = useState("");
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

  // Photos (URLs)
  const [photoUrls, setPhotoUrls] = useState<string[]>([""]);
  const [coverIndex, setCoverIndex] = useState<number>(0);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const selectedCityName = useMemo(() => {
    if (!cityId) return null;
    return cities.find((c) => c.id === cityId)?.name_fr ?? null;
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

        // interdit si company
        if (meData.role === "company") {
          router.replace("/account?tab=account");
          return;
        }

        // compter profils worker
        const profs: ProfileRow[] = await api
         .get(`/users/me/profiles`)
          .then((r) => r.data);

        const wc = Array.isArray(profs)
          ? profs.filter((p) => p.profile_type === "worker").length
          : 0;

        if (!alive) return;
        setWorkerCount(wc);

        if (meData.role === "worker" && wc >= 7) {
          router.replace("/account?tab=account");
          return;
        }

        // référentiels
        loadUmbrellas();
        loadCities("");
      } catch (e: any) {
        console.error(e);
        if (alive) setErr("Impossible de charger la page de création.");
      } finally {
        if (alive) setPageLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCities(q: string) {
    try {
      setLoadingCities(true);
      const res: City[] = await api
        .get("/cities", { params: q ? { q } : {} })
        .then((r) => r.data);
      setCities(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  }

  async function loadUmbrellas() {
    try {
      setLoadingUmbrellas(true);
      const res: Umbrella[] = await api
        .get("/umbrellas", { params: { type: "worker" } })
        .then((r) => r.data);
      setUmbrellas(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
      setUmbrellas([]);
    } finally {
      setLoadingUmbrellas(false);
    }
  }

  function addPhotoField() {
    if (photoUrls.length >= 8) return;
    setPhotoUrls((p) => [...p, ""]);
  }
  function removePhotoField(i: number) {
    setPhotoUrls((p) => p.filter((_, idx) => idx !== i));
    setCoverIndex((c) => (c === i ? 0 : c > i ? c - 1 : c));
  }
  function updatePhotoField(i: number, v: string) {
    setPhotoUrls((p) => p.map((x, idx) => (idx === i ? v : x)));
  }

  async function handleSubmit() {
    setErr(null);

    if (!title.trim()) {
      setErr("Le titre est obligatoire.");
      return;
    }
    if (!sectorId) {
      setErr("Veuillez choisir un secteur.");
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
        setErr("Création réussie mais ID introuvable.");
        return;
      }

      // 2) photos (optionnel) — backend attend url (pas image_url)
      const cleaned = photoUrls.map((u) => u.trim()).filter(Boolean);
      if (cleaned.length > 0) {
        await api.post(`/worker-profiles/${newId}/photos`, {
          photos: cleaned.map((url, idx) => ({
            url,
            caption: null,
            is_cover: idx === coverIndex,
          })),
        });
      }

      // 3) redirect onglet
      router.push(`/account?tab=worker-${newId}`);
    } catch (e: any) {
      console.error(e);
      const msg =
        e?.response?.data?.msg ||
        e?.response?.data?.error ||
        "Erreur lors de la création du profil ouvrier.";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  if (pageLoading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="rounded-2xl border bg-white p-5">Chargement…</div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Créer un profil ouvrier</h1>
          <div className="text-sm opacity-70">
            {me?.role === "worker"
              ? `Vous avez déjà ${workerCount}/7 profils.`
              : "Créez votre premier profil artisan."}
          </div>
        </div>

        <Link
          href="/account?tab=account"
          className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
        >
          Retour
        </Link>
      </div>

      {isUserIncomplete(me) && (
        <div className="rounded-2xl border bg-amber-50 p-4">
          <div className="font-medium">Votre compte n’est pas encore complet</div>
          <div className="text-sm opacity-80">
            Vous pouvez créer un profil ouvrier maintenant, mais pensez à compléter votre téléphone et/ou photo de profil.
          </div>
          <div className="mt-3">
            <Link
              href="/account?tab=account"
              className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 inline-block"
            >
              Compléter mon compte
            </Link>
          </div>
        </div>
      )}

      {err && <div className="rounded-2xl border bg-white p-4 text-red-600">{err}</div>}

      {/* Form */}
      <section className="rounded-2xl border bg-white p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Titre *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Plombier, Électricien, Peintre…"
              className="mt-1 w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Ville{selectedCityName ? ` (sélectionnée : ${selectedCityName})` : ""}
            </label>

            <div className="mt-1 space-y-2">
              <div className="flex gap-2">
                <input
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                  placeholder="Rechercher une ville…"
                  className="w-full rounded-xl border px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => loadCities(cityQuery.trim())}
                  className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
                  disabled={loadingCities}
                >
                  {loadingCities ? "…" : "OK"}
                </button>
              </div>

              <select
                value={cityId ?? ""}
                onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-xl border px-3 py-2"
              >
                <option value="">— Choisir —</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_fr} {c.region ? `(${c.region})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ✅ 1 seule liste secteur (avec umbrellas comme titres) */}
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Secteur *</label>
            <select
              value={sectorId ?? ""}
              onChange={(e) => setSectorId(e.target.value ? Number(e.target.value) : null)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              disabled={loadingUmbrellas}
            >
              <option value="">— Choisir —</option>

              {umbrellas.map((u) => (
                <optgroup key={u.slug} label={u.name}>
                  {u.sectors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            <div className="text-xs opacity-70 mt-1">
              {loadingUmbrellas ? "Chargement des secteurs…" : " "}
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Présentez vos services…"
              className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[110px]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Compétences</label>
            <textarea
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="Ex: Installation, réparation, entretien…"
              className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[90px]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Expérience</label>
            <textarea
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="Ex: 5 ans, chantiers réalisés, etc."
              className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[90px]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Adresse / Localisation (texte)</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Quartier, rue, zone…"
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
              Disponible
            </label>
          </div>
        </div>
      </section>

      {/* Photos */}
      <section className="rounded-2xl border bg-white p-5 space-y-3">
        <div className="font-semibold">Photos (optionnel)</div>
        <div className="text-sm opacity-70">Ajoutez des URLs d’images.</div>

        <div className="space-y-3">
          {photoUrls.map((u, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <input
                value={u}
                onChange={(e) => updatePhotoField(idx, e.target.value)}
                placeholder="https://…"
                className="flex-1 rounded-xl border px-3 py-2"
              />

              <label className="text-sm flex items-center gap-2">
                <input
                  type="radio"
                  name="cover"
                  checked={coverIndex === idx}
                  onChange={() => setCoverIndex(idx)}
                />
                Couverture
              </label>

              <button
                type="button"
                onClick={() => removePhotoField(idx)}
                className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
                disabled={photoUrls.length <= 1}
              >
                Retirer
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addPhotoField}
          className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
          disabled={photoUrls.length >= 8}
        >
          + Ajouter une photo
        </button>
      </section>

      <div className="flex items-center justify-end gap-2">
        <Link
          href="/account?tab=account"
          className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
        >
          Annuler
        </Link>

        <button
          onClick={handleSubmit}
          disabled={busy}
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
        >
          {busy ? "Création…" : "Créer le profil"}
        </button>
      </div>
    </main>
  );
}
