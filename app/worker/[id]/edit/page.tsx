"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { api } from "@/lib/api";

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
  region?: string | null;
};

type Umbrella = {
  id: number;
  slug: string;
  name: string;
  sectors: Array<{
    id: number;
    slug: string;
    name: string;
    label: string;
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

  city?: { id: number; name_fr?: string | null } | null;
  sector?: { id: number; name?: string | null } | null;

  photos?: WorkerPhoto[];
};

/* =======================
   Utils
======================= */

function isUserIncomplete(me: Me | null) {
  if (!me) return false;
  return !me.phone || !me.profile_photo;
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
  const workerId = Number(params.id);

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

  // photos
  const [existingPhotos, setExistingPhotos] = useState<WorkerPhoto[]>([]);
  const [newPhotos, setNewPhotos] = useState<string[]>([""]);
  const [newCoverIndex, setNewCoverIndex] = useState<number>(0);

  const selectedCityName = useMemo(() => {
    if (!cityId) return null;
    return cities.find((c) => c.id === cityId)?.name_fr ?? null;
  }, [cities, cityId]);

  // charge me + profile + refs
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const meData: Me = await api.get("/users/me").then((r) => r.data);
        if (!alive) return;
        setMe(meData);

        if (meData.role === "company") {
          router.replace("/account?tab=account");
          return;
        }

        const p: WorkerProfile = await api
          .get(`/worker-profiles/${workerId}`)
          .then((r) => r.data);

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
        setExistingPhotos(p.photos ?? []);

        const [citiesRes, umbrellasRes] = await Promise.all([
          api.get("/cities"),
          api.get("/umbrellas", { params: { type: "worker" } }),
        ]);

        if (!alive) return;
        setCities(citiesRes.data);
        setUmbrellas(umbrellasRes.data);
      } catch (e: any) {
        console.error(e);
        if (alive) setError("Impossible de charger le profil.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [workerId, router]);

  function addPhotoField() {
    if (newPhotos.length >= 8) return;
    setNewPhotos((p) => [...p, ""]);
  }
  function removePhotoField(i: number) {
    setNewPhotos((p) => p.filter((_, idx) => idx !== i));
    setNewCoverIndex((c) => (c === i ? 0 : c > i ? c - 1 : c));
  }
  function updatePhotoField(i: number, v: string) {
    setNewPhotos((p) => p.map((x, idx) => (idx === i ? v : x)));
  }

  async function handleSave() {
    setError(null);

    if (!title.trim()) {
      setError("Le titre est obligatoire.");
      return;
    }
    if (!sectorId) {
      setError("Veuillez choisir un secteur.");
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

      // Photos: backend attend { photos: [{ url, is_cover, caption }] }
      const urls = newPhotos.map((u) => u.trim()).filter(Boolean);
      if (urls.length > 0) {
        await api.post(`/worker-profiles/${workerId}/photos`, {
          photos: urls.map((url, i) => ({
            url,
            is_cover: i === newCoverIndex,
            caption: null,
          })),
        });
      }

      router.push(`/account?tab=worker-${workerId}`);
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.msg || "Erreur lors de l’enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <div className="border rounded-xl p-4">Chargement…</div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Modifier le profil ouvrier</h1>
          <p className="text-sm opacity-70">{profile?.title}</p>
        </div>

        <Link
          href={`/account?tab=worker-${workerId}`}
          className="px-4 py-2 border rounded-xl"
        >
          Retour
        </Link>
      </header>

      {isUserIncomplete(me) && (
        <div className="border rounded-xl bg-amber-50 p-4">
          <p className="font-medium">Compte incomplet</p>
          <Link href="/account?tab=account" className="underline text-sm">
            Compléter mes informations personnelles
          </Link>
        </div>
      )}

      {error && <div className="border p-4 text-red-600">{error}</div>}

      {/* FORM */}
      <section className="border rounded-xl p-5 space-y-4 bg-white">
        <input
          className="w-full border rounded-xl p-2"
          placeholder="Titre *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div>
          <label className="text-sm font-medium">
            Ville{selectedCityName ? ` (sélectionnée : ${selectedCityName})` : ""}
          </label>
          <select
            className="mt-1 w-full border rounded-xl p-2"
            value={cityId ?? ""}
            onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— Choisir —</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_fr} {c.region ? `(${c.region})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* ✅ 1 seule liste : umbrella = titres, sectors = options */}
        <div>
          <label className="text-sm font-medium">Secteur *</label>
          <select
            className="mt-1 w-full border rounded-xl p-2"
            value={sectorId ?? ""}
            onChange={(e) => setSectorId(e.target.value ? Number(e.target.value) : null)}
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
        </div>

        <textarea
          className="w-full border rounded-xl p-2"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <textarea
          className="w-full border rounded-xl p-2"
          placeholder="Compétences"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
        />

        <textarea
          className="w-full border rounded-xl p-2"
          placeholder="Expérience"
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
        />

        <input
          className="w-full border rounded-xl p-2"
          placeholder="Localisation"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
          />
          Disponible
        </label>
      </section>

      {/* Photos */}
      <section className="border rounded-xl p-5 space-y-3 bg-white">
        <div className="font-semibold">Ajouter des photos (optionnel)</div>

        <div className="space-y-3">
          {newPhotos.map((u, idx) => (
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
                  checked={newCoverIndex === idx}
                  onChange={() => setNewCoverIndex(idx)}
                />
                Couverture
              </label>

              <button
                type="button"
                onClick={() => removePhotoField(idx)}
                className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
                disabled={newPhotos.length <= 1}
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
          disabled={newPhotos.length >= 8}
        >
          + Ajouter une photo
        </button>
      </section>

      <div className="flex justify-end gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-xl disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </main>
  );
}
