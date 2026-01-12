"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { api } from "@/lib/api";
import PhotoUrlPicker, { PhotoInput } from "@/components/PhotoUrlPicker";

type Me = {
  id: number;
  role: "visitor" | "worker" | "company" | "admin";
};

type City = { id: number; name_fr: string; region?: string | null };
type Umbrella = { id: number; name: string; sectors: Array<{ id: number; label: string }> };

export default function CompanyNewPage() {
  return (
    <RequireAuth>
      <CompanyNewInner />
    </RequireAuth>
  );
}

function CompanyNewInner() {
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // refs
  const [cities, setCities] = useState<City[]>([]);
  const [umbrellas, setUmbrellas] = useState<Umbrella[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  // form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cityId, setCityId] = useState<number | null>(null);

  // sectors selected
  const [sectorIds, setSectorIds] = useState<number[]>([]);

  // photos (url/caption/is_cover)
  const [photos, setPhotos] = useState<PhotoInput[]>([]);

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

        // si déjà company, pas de création
        if (meData.role === "company") {
          router.replace("/account?tab=account");
          return;
        }

        // load refs
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
            sectors: Array.isArray(u.sectors)
              ? u.sectors.map((s: any) => ({ id: s.id, label: s.label || s.name || s.slug }))
              : [],
          }))
        );
      } catch (e) {
        console.error(e);
        if (alive) setErr("Impossible de charger la page de création entreprise.");
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
  }, [router]);

  function toggleSector(id: number) {
    setSectorIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleCreate() {
    setErr(null);

    if (!name.trim()) {
      setErr("Le nom de l’entreprise est obligatoire.");
      return;
    }
    if (sectorIds.length === 0) {
      setErr("Veuillez choisir au moins un secteur.");
      return;
    }

    try {
      setBusy(true);

      // 1) create company profile
      const created = await api
        .post("/company-profiles", {
          name: name.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          website: website.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          city_id: cityId,
        })
        .then((r) => r.data);

      const companyId = created?.id;
      if (!companyId) {
        setErr("Création réussie mais ID entreprise introuvable.");
        return;
      }

      // 2) sectors
      for (const sid of sectorIds) {
        await api.post(`/company-profiles/${companyId}/sectors`, { sector_id: sid });
      }

      // 3) photos bulk (si ton backend supporte bulk)
      // -> Sinon, on fait POST /company-photos une par une.
      const cleaned = photos.filter((p) => p.url && p.url.trim());
      if (cleaned.length > 0) {
        for (const p of cleaned) {
          await api.post("/company-photos", {
            company_id: companyId,
            image_url: p.url.trim(),
            caption: p.caption?.trim() || null,
            is_cover: !!p.is_cover,
          });
        }
      }

      router.push(`/account?tab=company`);
    } catch (e: any) {
      console.error(e);
      setErr(e?.response?.data?.msg || "Erreur lors de la création entreprise.");
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
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Créer un compte entreprise</h1>
          <div className="text-sm opacity-70">Votre entreprise sera visible immédiatement.</div>
        </div>

        <Link
          href="/account?tab=account"
          className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
        >
          Retour
        </Link>
      </div>

      {err && <div className="rounded-2xl border bg-white p-4 text-red-600">{err}</div>}

      <section className="rounded-2xl border bg-white p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Nom entreprise *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="Ex: Bricol Services Casablanca"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[110px]"
              placeholder="Présentez votre entreprise..."
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Ville{selectedCityName ? ` (sélectionnée : ${selectedCityName})` : ""}
            </label>
            <select
              value={cityId ?? ""}
              onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : null)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
            >
              <option value="">— Choisir —</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_fr} {c.region ? `(${c.region})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Adresse / Quartier</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="Ex: Maarif, Bourgogne..."
            />
          </div>

          <div>
            <label className="text-sm font-medium">Téléphone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="+212..."
            />
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="contact@..."
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-medium">Site web</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="https://..."
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 space-y-3">
        <div className="font-semibold">Secteurs *</div>
        <div className="text-sm opacity-70">
          Choisissez au moins un secteur. (Vous pourrez modifier plus tard.)
        </div>

        <div className="space-y-4">
          {umbrellas.map((u) => (
            <div key={u.id} className="rounded-xl border p-3">
              <div className="font-medium">{u.name}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {u.sectors.map((s) => {
                  const active = sectorIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSector(s.id)}
                      className={`px-3 py-1 rounded-full border text-sm ${
                        active ? "bg-black text-white" : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {loadingRefs ? <div className="text-xs opacity-70">Chargement…</div> : null}
      </section>

      <PhotoUrlPicker
        title="Photos entreprise"
        subtitle="Choisissez une photo de couverture : c’est celle qui s’affiche sur la carte du profil (accueil, recherche, récemment consultés)."
        value={photos}
        onChange={setPhotos}
        max={8}
        defaultEmptyRows={1}
      />

      <div className="flex items-center justify-end gap-2">
        <Link
          href="/account?tab=account"
          className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
        >
          Annuler
        </Link>

        <button
          onClick={handleCreate}
          disabled={busy}
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
        >
          {busy ? "Création…" : "Créer"}
        </button>
      </div>
    </main>
  );
}
