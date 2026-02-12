"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/LangProvider";

const MAX_WORKER_PROFILES = 7;

const i18n = {
  fr: {
    title: "Mon espace",
    loading: "Chargement…",
    tabs: {
      account: "Compte",
      workers: "Profils ouvriers",
      company: "Profil entreprise",
      pro: "Espace professionnel",
      admin: "Administration",
    },
    common: {
      edit: "Modifier",
      del: "Supprimer",
      viewPublic: "Voir public",
      noData: "—",
    },
    account: {
      section: "Informations du compte",
      photo: "Photo de profil",
      name: "Nom",
      phone: "Téléphone",
      facebook: "Facebook",
      instagram: "Instagram",
      tiktok: "TikTok",
      email: "Email",
      editBtn: "Modifier le compte",
    },
    pro: {
      title: "Créer un profil",
      hint:
        "Choisissez un type de profil. Selon les règles métier : un utilisateur ne peut pas avoir à la fois un profil entreprise et des profils ouvriers.",
      createWorker: "Créer un profil ouvrier",
      createCompany: "Créer un profil entreprise",
    },
    workers: {
      empty: "Aucun profil ouvrier",
      create: "Créer un nouveau profil ouvrier",
      maxReached: `Limite atteinte : ${MAX_WORKER_PROFILES} profils maximum.`,
      trust: "Badge confiance",
      verified: "Vérifié",
      pending: "En attente",
      rejected: "Refusé",
      unknown: "—",
      confirmDel: "Supprimer ce profil ouvrier ?",
      photos: "Photos",
      description: "Description",
    },
    company: {
      empty: "Aucun profil entreprise",
      create: "Créer un profil entreprise",
      confirmDel: "Supprimer le profil entreprise ?",
      phone: "Téléphone",
      email: "Email",
      website: "Site web",
      desc: "Description",
      sectors: "Secteurs",
      photos: "Photos",
    },
    errors: {
      generic: "Erreur serveur.",
      loadCompanyFail: "Impossible de charger le profil entreprise.",
    },
  },
  ar: {
    title: "مساحتي",
    loading: "جار التحميل…",
    tabs: {
      account: "الحساب",
      workers: "ملفات العمال",
      company: "ملف الشركة",
      pro: "المجال المهني",
      admin: "الإدارة",
    },
    common: {
      edit: "تعديل",
      del: "حذف",
      viewPublic: "عرض عام",
      noData: "—",
    },
    account: {
      section: "معلومات الحساب",
      photo: "صورة الحساب",
      name: "الاسم",
      phone: "الهاتف",
      facebook: "فيسبوك",
      instagram: "إنستغرام",
      tiktok: "تيك توك",
      email: "البريد الإلكتروني",
      editBtn: "تعديل الحساب",
    },
    pro: {
      title: "إنشاء ملف",
      hint:
        "اختر نوع الملف. حسب قواعد المشروع: لا يمكن للمستخدم امتلاك ملف شركة وملفات عمال في نفس الوقت.",
      createWorker: "إنشاء ملف عامل",
      createCompany: "إنشاء ملف شركة",
    },
    workers: {
      empty: "لا يوجد ملف عامل",
      create: "إنشاء ملف عامل جديد",
      maxReached: `تم بلوغ الحد الأقصى: ${MAX_WORKER_PROFILES} ملفات.`,
      trust: "شارة الثقة",
      verified: "تم التحقق",
      pending: "قيد المراجعة",
      rejected: "مرفوض",
      unknown: "—",
      confirmDel: "هل تريد حذف ملف العامل؟",
      photos: "الصور",
      description: "الوصف",
    },
    company: {
      empty: "لا يوجد ملف شركة",
      create: "إنشاء ملف شركة",
      confirmDel: "هل تريد حذف ملف الشركة؟",
      phone: "الهاتف",
      email: "البريد الإلكتروني",
      website: "الموقع",
      desc: "الوصف",
      sectors: "القطاعات",
      photos: "الصور",
    },
    errors: {
      generic: "خطأ في الخادم.",
      loadCompanyFail: "تعذر تحميل ملف الشركة.",
    },
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

type ProfileRow = {
  id: number;
  profile_type: "worker" | "company";
  title_or_name: string | null;
  created_at: string;
};

type WorkerPhoto = {
  id: number;
  image_url: string;
  caption: string | null;
  is_cover: boolean;
};

type WorkerDetail = {
  id: number;
  user_id: number;
  title?: string | null;
  description?: string | null;
  user_name?: string | null;
  trust_badge?: boolean | null;
  verification_status?: string | null;
  city?: { display_name?: string | null; name_fr?: string | null; name_ar?: string | null; slug?: string } | null;
  sector?: {
    display_label?: string | null;
    label?: string | null;
    label_ar?: string | null;
    worker_label_fr?: string | null;
    worker_label_ar?: string | null;
    name?: string | null;
    name_ar?: string | null;
    slug?: string;
  } | null;
  photos?: WorkerPhoto[];
};

type CompanyPhoto = {
  id: number;
  image_url: string;
  caption: string | null;
  is_cover: boolean;
};

type CompanyDetail = {
  id: number;
  user_id?: number | null;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  location?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: { display_name?: string | null; name_fr?: string | null; name_ar?: string | null; slug?: string } | null;
  sectors?: Array<{ id: number; display_label?: string | null; display_name?: string | null; slug?: string }>;
  photos?: CompanyPhoto[];
};

function pickCoverUrl<T extends { is_cover: boolean; image_url: string }>(photos?: T[] | null) {
  if (!photos || photos.length === 0) return null;
  const cover = photos.find((p) => p.is_cover) ?? photos[0];
  return cover?.image_url ?? null;
}

function truncate(s: string, n = 170) {
  const t = s.trim();
  if (t.length <= n) return t;
  return t.slice(0, n).trimEnd() + "…";
}

function badgeLabel(status: string | null | undefined, t: any) {
  const v = (status || "").toLowerCase();
  if (!v) return t.workers.unknown;
  if (v.includes("approved") || v.includes("verif")) return t.workers.verified;
  if (v.includes("pending")) return t.workers.pending;
  if (v.includes("reject")) return t.workers.rejected;
  return status;
}

export default function AccountClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { lang } = useLang();

  const t = lang === "ar" ? i18n.ar : i18n.fr;
  const dir = lang === "ar" ? "rtl" : "ltr";
  const base = `/${lang}`;

  const tab = (params.get("tab") || "account") as "account" | "workers" | "company" | "pro";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [me, setMe] = useState<Me | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  const workerRows = useMemo(() => profiles.filter((p) => p.profile_type === "worker"), [profiles]);
  const companyRow = useMemo(() => profiles.find((p) => p.profile_type === "company") || null, [profiles]);

  const hasWorkers = workerRows.length > 0;
  const hasCompany = !!companyRow;

  // cache détails (affichage complet)
  const [workerDetails, setWorkerDetails] = useState<Record<number, WorkerDetail>>({});
  const [workerDetailLoading, setWorkerDetailLoading] = useState<Record<number, boolean>>({});

  const [companyDetail, setCompanyDetail] = useState<CompanyDetail | null>(null);
  const [companyDetailLoading, setCompanyDetailLoading] = useState(false);

  async function refreshMeAndProfiles() {
    const [meData, profData] = await Promise.all([
      api.get("/users/me").then((r) => r.data as Me),
      api.get("/users/me/profiles").then((r) => (Array.isArray(r.data) ? (r.data as ProfileRow[]) : [])),
    ]);
    setMe(meData);
    setProfiles(profData);
  }

  // load initial
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

  // Tabs visibles (règles métier respectées)
  const tabs = useMemo(() => {
    const out: Array<{ key: "account" | "workers" | "company" | "pro"; label: string; visible: boolean }> = [
      { key: "account", label: t.tabs.account, visible: true },
      { key: "workers", label: t.tabs.workers, visible: (hasWorkers || me?.role === "worker") && !hasCompany },
      { key: "company", label: t.tabs.company, visible: (hasCompany || me?.role === "company") && !hasWorkers },
      { key: "pro", label: t.tabs.pro, visible: me?.role === "visitor" && !hasWorkers && !hasCompany },
    ];
    return out.filter((x) => x.visible);
  }, [t.tabs, hasWorkers, hasCompany, me?.role]);

  const tabsKey = useMemo(() => tabs.map((x) => x.key).join("|"), [tabs]);

  // Si tab non visible => fallback vers 1er tab visible (gère aussi après suppression)
  useEffect(() => {
    const visibleKeys = new Set(tabs.map((x) => x.key));
    if (!visibleKeys.has(tab)) {
      const first = tabs[0]?.key ?? "account";
      router.replace(`${base}/account?tab=${first}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, tabsKey, base]);

  // charger détails workers (tab workers seulement)
  useEffect(() => {
    if (tab !== "workers") return;
    let alive = true;

    (async () => {
      for (const row of workerRows) {
        if (!alive) return;
        if (workerDetails[row.id]) continue;

        setWorkerDetailLoading((m) => ({ ...m, [row.id]: true }));
        try {
          const d = await api
            .get(`/worker-profiles/${row.id}`, { params: { lang } })
            .then((r) => r.data as WorkerDetail);
          if (!alive) return;
          setWorkerDetails((m) => ({ ...m, [row.id]: d }));
        } catch (e) {
          console.error(e);
        } finally {
          if (alive) setWorkerDetailLoading((m) => ({ ...m, [row.id]: false }));
        }
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, lang, workerRows.map((x) => x.id).join(",")]);

  // charger détail company (tab company seulement)
  useEffect(() => {
    if (tab !== "company") return;
    if (!companyRow) {
      setCompanyDetail(null);
      return;
    }

    let alive = true;
    (async () => {
      try {
        setCompanyDetailLoading(true);
        const d = await api
          .get(`/company-profiles/${companyRow.id}`, { params: { lang } })
          .then((r) => r.data as CompanyDetail);
        if (!alive) return;
        setCompanyDetail(d);
      } catch (e) {
        console.error(e);
        if (alive) setCompanyDetail(null);
      } finally {
        if (alive) setCompanyDetailLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [tab, companyRow?.id, lang]);

  async function deleteWorkerProfile(id: number) {
    if (!confirm(t.workers.confirmDel)) return;
    try {
      await api.delete(`/worker-profiles/${id}`);
      setWorkerDetails((m) => {
        const copy = { ...m };
        delete copy[id];
        return copy;
      });
      await refreshMeAndProfiles();
      // redirection auto via “tab visible”
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.msg || t.errors.generic);
    }
  }

  async function deleteCompanyProfile() {
    if (!companyRow) return;
    if (!confirm(t.company.confirmDel)) return;
    try {
      await api.delete(`/company-profiles/${companyRow.id}`);
      setCompanyDetail(null);
      await refreshMeAndProfiles();
      // redirection auto via “tab visible”
    } catch (e: any) {
      console.error(e);
      alert(e?.response?.data?.msg || t.errors.generic);
    }
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
      <header className="flex justify-between items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        {me?.role === "admin" ? (
          <Button variant="outline" onClick={() => router.push(`${base}/admin`)}>
            {t.tabs.admin}
          </Button>
        ) : null}
      </header>

      {err ? <div className="border rounded-xl p-4 text-red-600">{err}</div> : null}

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
      </div>

      {/* ACCOUNT */}
      {tab === "account" && me && (
        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <div className="font-semibold">{t.account.section}</div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-20 h-20 rounded-full border overflow-hidden bg-gray-50 flex items-center justify-center">
              {me.profile_photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={me.profile_photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-xs opacity-60">—</div>
              )}
            </div>

            <Link href={`${base}/account/edit`}>
              <Button>{t.account.editBtn}</Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="opacity-70">{t.account.name}:</span>{" "}
              <span className="font-medium">{me.name || t.common.noData}</span>
            </div>
            <div>
              <span className="opacity-70">{t.account.phone}:</span>{" "}
              <span className="font-medium">{me.phone || t.common.noData}</span>
            </div>
            <div>
              <span className="opacity-70">{t.account.facebook}:</span>{" "}
              <span className="font-medium break-words">{me.facebook_url || t.common.noData}</span>
            </div>
            <div>
              <span className="opacity-70">{t.account.instagram}:</span>{" "}
              <span className="font-medium break-words">{me.instagram_url || t.common.noData}</span>
            </div>
            <div>
              <span className="opacity-70">{t.account.tiktok}:</span>{" "}
              <span className="font-medium break-words">{me.tiktok_url || t.common.noData}</span>
            </div>
            <div>
              <span className="opacity-70">{t.account.email}:</span>{" "}
              <span className="font-medium break-words">{me.email || t.common.noData}</span>
            </div>
          </div>
        </section>
      )}

      {/* PRO (visitor sans profils) */}
      {tab === "pro" && me?.role === "visitor" && !hasWorkers && !hasCompany && (
        <section className="rounded-2xl border bg-white p-5 space-y-3">
          <div className="font-semibold">{t.pro.title}</div>
          <div className="text-sm opacity-70">{t.pro.hint}</div>
          <div className="flex gap-2 flex-wrap">
            <Link href={`${base}/worker/new`}>
              <Button>{t.pro.createWorker}</Button>
            </Link>
            <Link href={`${base}/company/new`}>
              <Button variant="outline">{t.pro.createCompany}</Button>
            </Link>
          </div>
        </section>
      )}

      {/* WORKERS */}
      {tab === "workers" && !hasCompany && (
        <section className="space-y-4">
          {workerRows.length === 0 ? (
            <div className="rounded-2xl border bg-white p-5">
              <div className="text-sm opacity-70">{t.workers.empty}</div>
              <div className="mt-3">
                <Link href={`${base}/worker/new`}>
                  <Button>{t.workers.create}</Button>
                </Link>
              </div>
            </div>
          ) : (
            workerRows.map((w) => {
              const d = workerDetails[w.id];
              const isLoading = workerDetailLoading[w.id];
              const cover = pickCoverUrl(d?.photos);

              const displayTitle = (d?.user_name || d?.title || w.title_or_name || "").trim() || `#${w.id}`;

              const sectorLabel =
                d?.sector?.display_label ||
                (lang === "ar" ? d?.sector?.worker_label_ar : d?.sector?.worker_label_fr) ||
                (lang === "ar" ? d?.sector?.label_ar : d?.sector?.label) ||
                (lang === "ar" ? d?.sector?.name_ar : d?.sector?.name) ||
                null;

              const cityLabel =
                d?.city?.display_name || (lang === "ar" ? d?.city?.name_ar : d?.city?.name_fr) || null;

              const trust = d?.trust_badge === true;
              const verification = badgeLabel(d?.verification_status ?? null, t);

              return (
                <div key={w.id} className="rounded-2xl border bg-white overflow-hidden">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt={displayTitle} className="w-full h-44 object-cover" />
                  ) : (
                    <div className="w-full h-44 bg-gray-100 flex items-center justify-center text-sm text-gray-500">—</div>
                  )}

                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="text-lg font-semibold break-words">{displayTitle}</div>
                        <div className="text-sm text-gray-600">
                          {sectorLabel ? <span>{sectorLabel}</span> : null}
                          {cityLabel ? <span> · {cityLabel}</span> : null}
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Link href={`${base}/worker/${w.id}`}>
                          <Button variant="outline">{t.common.viewPublic}</Button>
                        </Link>
                        <Link href={`${base}/worker/${w.id}/edit`}>
                          <Button>{t.common.edit}</Button>
                        </Link>
                        <Button variant="outline" onClick={() => deleteWorkerProfile(w.id)}>
                          {t.common.del}
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap text-xs">
                      <span className="px-2 py-1 rounded-full border bg-gray-50">ID: {w.id}</span>
                      <span className="px-2 py-1 rounded-full border bg-gray-50">{verification}</span>
                      {trust ? (
                        <span className="px-2 py-1 rounded-full border bg-gray-50">{t.workers.trust}</span>
                      ) : null}
                      {d?.photos?.length ? (
                        <span className="px-2 py-1 rounded-full border bg-gray-50">
                          {t.workers.photos}: {d.photos.length}
                        </span>
                      ) : null}
                    </div>

                    {isLoading ? (
                      <div className="text-sm opacity-70">{t.loading}</div>
                    ) : d?.description ? (
                      <div className="text-sm text-gray-700">
                        <div className="text-xs opacity-70 mb-1">{t.workers.description}</div>
                        <div className="whitespace-pre-line">{truncate(d.description)}</div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {workerRows.length >= MAX_WORKER_PROFILES ? (
              <Button disabled>{t.workers.maxReached}</Button>
            ) : (
              <Link href={`${base}/worker/new`}>
                <Button>{t.workers.create}</Button>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* COMPANY */}
      {tab === "company" && !hasWorkers && (
        <section className="space-y-4">
          {!companyRow ? (
            <div className="rounded-2xl border bg-white p-5 space-y-3">
              <div className="text-sm opacity-70">{t.company.empty}</div>
              <Link href={`${base}/company/new`}>
                <Button>{t.company.create}</Button>
              </Link>
            </div>
          ) : companyDetailLoading ? (
            <div className="rounded-2xl border bg-white p-5">{t.loading}</div>
          ) : !companyDetail ? (
            <div className="rounded-2xl border bg-white p-5 text-red-600">{t.errors.loadCompanyFail}</div>
          ) : (
            (() => {
              const companyTitle =
                (companyDetail.name ?? companyDetail.title ?? "").trim() || `#${companyRow.id}`;
              const companyCover = pickCoverUrl(companyDetail.photos);

              return (
                <div className="rounded-2xl border bg-white overflow-hidden">
                  {companyCover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={companyCover} alt={companyTitle} className="w-full h-44 object-cover" />
                  ) : (
                    <div className="w-full h-44 bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                      —
                    </div>
                  )}

                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="text-lg font-semibold break-words">{companyTitle}</div>
                        <div className="text-sm text-gray-600">
                          {companyDetail.city?.display_name ? (
                            <span>📍 {companyDetail.city.display_name}</span>
                          ) : null}
                          {companyDetail.location ? <span> · {companyDetail.location}</span> : null}
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Link href={`${base}/company/${companyRow.id}`}>
                          <Button variant="outline">{t.common.viewPublic}</Button>
                        </Link>
                        <Link href={`${base}/company/${companyRow.id}/edit`}>
                          <Button>{t.common.edit}</Button>
                        </Link>
                        <Button variant="outline" onClick={deleteCompanyProfile}>
                          {t.common.del}
                        </Button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="opacity-70">{t.company.phone}:</span>{" "}
                        {companyDetail.phone || t.common.noData}
                      </div>
                      <div>
                        <span className="opacity-70">{t.company.email}:</span>{" "}
                        {companyDetail.email || t.common.noData}
                      </div>
                      <div className="md:col-span-2">
                        <span className="opacity-70">{t.company.website}:</span>{" "}
                        {companyDetail.website || t.common.noData}
                      </div>
                    </div>

                    {Array.isArray(companyDetail.sectors) && companyDetail.sectors.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-sm opacity-70">{t.company.sectors}</div>
                        <div className="flex flex-wrap gap-2">
                          {companyDetail.sectors.map((s) => (
                            <span key={s.id} className="text-xs px-2 py-1 rounded-full border bg-gray-50">
                              {s.display_label || s.display_name || s.slug || `#${s.id}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {companyDetail.description ? (
                      <div className="space-y-1">
                        <div className="text-sm opacity-70">{t.company.desc}</div>
                        <div className="text-sm text-gray-700 whitespace-pre-line">{companyDetail.description}</div>
                      </div>
                    ) : null}

                    {companyDetail.photos?.length ? (
                      <div className="text-xs opacity-70">
                        {t.company.photos}: {companyDetail.photos.length}
                      </div>
                    ) : null}

                    <div className="text-[11px] opacity-60">ID: {companyRow.id}</div>
                  </div>
                </div>
              );
            })()
          )}
        </section>
      )}
    </main>
  );
}
