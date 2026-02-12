"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/LangProvider";
import { uploadImage } from "@/lib/uploadImage";

const i18n = {
  fr: {
    title: "Modifier mon compte",
    loading: "Chargement…",
    back: "Retour",
    saving: "Enregistrement…",
    save: "Enregistrer",
    cancel: "Annuler",
    section: "Informations du compte",
    photo: "Photo de profil",
    changePhoto: "Modifier",
    removePhoto: "Retirer",
    name: "Nom",
    phone: "Téléphone",
    facebook: "Facebook",
    instagram: "Instagram",
    tiktok: "TikTok",
    email: "Email (lecture seule)",
    updated: "Compte mis à jour.",
    error: "Erreur serveur.",
  },
  ar: {
    title: "تعديل الحساب",
    loading: "جار التحميل…",
    back: "رجوع",
    saving: "جار الحفظ…",
    save: "حفظ",
    cancel: "إلغاء",
    section: "معلومات الحساب",
    photo: "صورة الحساب",
    changePhoto: "تعديل",
    removePhoto: "إزالة",
    name: "الاسم",
    phone: "الهاتف",
    facebook: "فيسبوك",
    instagram: "إنستغرام",
    tiktok: "تيك توك",
    email: "البريد الإلكتروني (قراءة فقط)",
    updated: "تم تحديث الحساب.",
    error: "خطأ في الخادم.",
  },
} as const;

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

export default function AccountEditPage() {
  return (
    <RequireAuth>
      <AccountEditClient />
    </RequireAuth>
  );
}

function AccountEditClient() {
  const router = useRouter();
  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const base = `/${lang}`;

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [me, setMe] = useState<Me | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const data = await api.get("/users/me").then((r) => r.data as Me);
        if (!alive) return;

        setMe(data);
        setName(data.name ?? "");
        setPhone(data.phone ?? "");
        setFacebook(data.facebook_url ?? "");
        setInstagram(data.instagram_url ?? "");
        setTiktok(data.tiktok_url ?? "");
        setPhoto(data.profile_photo ?? null);
        setDirty(false);
      } catch (e) {
        console.error(e);
        if (alive) setErr(t.error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [t.error]);

  async function changeUserPhoto() {
    setMsg(null);
    setErr(null);

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      try {
        setBusy(true);
        const url = await uploadImage(file);
        setPhoto(url);
        setDirty(true);
      } catch (e: any) {
        console.error(e);
        setErr(e?.message || t.error);
      } finally {
        setBusy(false);
      }
    };

    input.click();
  }

  async function save() {
    if (!me) return;
    try {
      setBusy(true);
      setMsg(null);
      setErr(null);

      const payload = {
        name: name.trim() || null,
        phone: phone.trim() || null,
        profile_photo: photo || null,
        facebook_url: facebook.trim() || null,
        instagram_url: instagram.trim() || null,
        tiktok_url: tiktok.trim() || null,
      };

      const updated = await api.patch("/users/me", payload).then((r) => r.data as Me);
      setMe(updated);
      setDirty(false);
      setMsg(t.updated);

      // retour vers account après save
      router.replace(`${base}/account?tab=account`);
    } catch (e: any) {
      console.error(e);
      setErr(e?.response?.data?.msg || t.error);
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    if (!me) return;
    setName(me.name ?? "");
    setPhone(me.phone ?? "");
    setFacebook(me.facebook_url ?? "");
    setInstagram(me.instagram_url ?? "");
    setTiktok(me.tiktok_url ?? "");
    setPhoto(me.profile_photo ?? null);
    setDirty(false);
    setMsg(null);
    setErr(null);
  }

  if (loading) {
    return (
      <main dir={dir} className="max-w-5xl mx-auto p-6">
        <div className="border rounded-xl p-4">{t.loading}</div>
      </main>
    );
  }

  if (err && !me) {
    return (
      <main dir={dir} className="max-w-5xl mx-auto p-6 space-y-4">
        <div className="border rounded-xl p-4 text-red-600">{err}</div>
        <Link className="underline" href={`${base}/account?tab=account`}>{t.back}</Link>
      </main>
    );
  }

  return (
    <main dir={dir} className="max-w-5xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <Link href={`${base}/account?tab=account`} className="underline">
          {t.back}
        </Link>
      </header>

      <section className="rounded-2xl border bg-white p-5 space-y-4">
        <div className="font-semibold">{t.section}</div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-20 h-20 rounded-full border overflow-hidden bg-gray-50 flex items-center justify-center">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="text-xs opacity-60">—</div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={changeUserPhoto} disabled={busy}>
              {t.changePhoto}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPhoto(null);
                setDirty(true);
              }}
              disabled={busy || !photo}
            >
              {t.removePhoto}
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <Field label={t.name} value={name} onChange={(v) => { setName(v); setDirty(true); }} />
          <Field label={t.phone} value={phone} onChange={(v) => { setPhone(v); setDirty(true); }} />
          <Field label={t.facebook} value={facebook} onChange={(v) => { setFacebook(v); setDirty(true); }} />
          <Field label={t.instagram} value={instagram} onChange={(v) => { setInstagram(v); setDirty(true); }} />
          <Field label={t.tiktok} value={tiktok} onChange={(v) => { setTiktok(v); setDirty(true); }} />
          <div className="space-y-1">
            <div className="text-sm opacity-70">{t.email}</div>
            <input className="w-full rounded-xl border px-3 py-2 bg-gray-50" value={me?.email || ""} readOnly />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={save} disabled={busy || !dirty}>
            {busy ? t.saving : t.save}
          </Button>
          <Button
             type="button"
          variant="outline"
             onClick={() => router.replace(`${base}/account?tab=account`)}
            disabled={busy}
              >
            {t.cancel}
            </Button>
          {msg ? <div className="text-sm opacity-80">{msg}</div> : null}
          {err ? <div className="text-sm text-red-600">{err}</div> : null}
        </div>
      </section>
    </main>
  );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <div className="text-sm opacity-70">{props.label}</div>
      <input
        className="w-full rounded-xl border px-3 py-2"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </div>
  );
}
