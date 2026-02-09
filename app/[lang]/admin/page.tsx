"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { usePathname, useRouter } from "next/navigation";

type Meta = { page: number; limit: number; total: number };
type UserRow = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  suspended_at: string | null;
  last_login_at: string | null;
  created_at: string;
};

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-4 py-2 rounded-xl border text-sm transition",
        active ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function formatDt(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function AdminPage() {
  const router = useRouter();
  const pathname = usePathname() || "/fr";
  const lang = pathname.split("/")[1] === "ar" ? "ar" : "fr";
  const base = `/${lang}`;

  const [tab, setTab] = useState<
    "dashboard" | "users" | "moderation" | "security" | "audit"
  >("dashboard");

  // ✅ UX: erreurs d'accès / session
  const [pageError, setPageError] = useState<string | null>(null);

  // ✅ permet de forcer un refetch après actions
  const [refreshKey, setRefreshKey] = useState(0);

  // dashboard
  const [dash, setDash] = useState<any>(null);

  // users
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | "active" | "suspended">("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersMeta, setUsersMeta] = useState<Meta>({ page: 1, limit: 20, total: 0 });

  // moderation
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsMeta, setReviewsMeta] = useState<Meta>({ page: 1, limit: 20, total: 0 });

  const [photoType, setPhotoType] = useState<"worker" | "company">("worker");
  const [photos, setPhotos] = useState<any[]>([]);
  const [photosMeta, setPhotosMeta] = useState<Meta>({ page: 1, limit: 20, total: 0 });

  // audit
  const [logs, setLogs] = useState<any[]>([]);
  const [logsMeta, setLogsMeta] = useState<Meta>({ page: 1, limit: 20, total: 0 });

  const totalUsersPages = Math.max(1, Math.ceil(usersMeta.total / usersMeta.limit));
  const totalReviewsPages = Math.max(1, Math.ceil(reviewsMeta.total / reviewsMeta.limit));
  const totalPhotosPages = Math.max(1, Math.ceil(photosMeta.total / photosMeta.limit));
  const totalLogsPages = Math.max(1, Math.ceil(logsMeta.total / logsMeta.limit));

  // ✅ gestion centralisée erreurs API
  function handleApiError(err: any) {
    const statusCode = err?.response?.status;
    const msg = err?.response?.data?.msg;

    if (statusCode === 401) {
      setPageError("Session expirée. Merci de vous reconnecter.");
      router.push(`${base}/login?next=${encodeURIComponent(`${base}/admin`)}`);
      return;
    }

    if (statusCode === 403) {
      setPageError(msg || "Accès interdit (admin uniquement).");
      return;
    }

    setPageError(msg || "Erreur inattendue. Vérifie la console.");
    console.error(err);
  }

  // reset message quand on change d’onglet
  useEffect(() => {
    setPageError(null);
  }, [tab]);

  // -------------------------
  // FETCH: Dashboard
  // -------------------------
  useEffect(() => {
    if (tab !== "dashboard") return;
    api.get("/admin/dashboard")
      .then((r) => setDash(r.data))
      .catch(handleApiError);
  }, [tab, refreshKey]);

  // -------------------------
  // FETCH: Users
  // -------------------------
  useEffect(() => {
    if (tab !== "users") return;

    const sp = new URLSearchParams();
    sp.set("page", String(usersMeta.page));
    sp.set("limit", String(usersMeta.limit));
    if (q.trim()) sp.set("q", q.trim());
    if (status) sp.set("status", status);

    api.get(`/admin/users?${sp.toString()}`)
      .then((r) => {
        setUsers(r.data.items);
        setUsersMeta(r.data.meta);
      })
      .catch(handleApiError);
  }, [tab, usersMeta.page, usersMeta.limit, q, status, refreshKey]);

  // -------------------------
  // FETCH: Reviews
  // -------------------------
  useEffect(() => {
    if (tab !== "moderation") return;
    api.get(`/admin/reviews?page=${reviewsMeta.page}&limit=${reviewsMeta.limit}`)
      .then((r) => {
        setReviews(r.data.items);
        setReviewsMeta(r.data.meta);
      })
      .catch(handleApiError);
  }, [tab, reviewsMeta.page, reviewsMeta.limit, refreshKey]);

  // -------------------------
  // FETCH: Photos
  // -------------------------
  useEffect(() => {
    if (tab !== "moderation") return;
    api.get(`/admin/photos?type=${photoType}&page=${photosMeta.page}&limit=${photosMeta.limit}`)
      .then((r) => {
        setPhotos(r.data.items);
        setPhotosMeta(r.data.meta);
      })
      .catch(handleApiError);
  }, [tab, photoType, photosMeta.page, photosMeta.limit, refreshKey]);

  // -------------------------
  // FETCH: Audit
  // -------------------------
  useEffect(() => {
    if (tab !== "audit") return;
    api.get(`/admin/audit-logs?page=${logsMeta.page}&limit=${logsMeta.limit}`)
      .then((r) => {
        setLogs(r.data.items);
        setLogsMeta(r.data.meta);
      })
      .catch(handleApiError);
  }, [tab, logsMeta.page, logsMeta.limit, refreshKey]);

  // -------------------------
  // ACTIONS
  // -------------------------
  async function suspendUser(id: number, forceLogout: boolean) {
    try {
      await api.patch(`/admin/users/${id}/suspend`, { force_logout: forceLogout });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      handleApiError(err);
    }
  }

  async function unsuspendUser(id: number) {
    try {
      await api.patch(`/admin/users/${id}/unsuspend`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      handleApiError(err);
    }
  }

  async function revokeSessions(id: number) {
    try {
      await api.post(`/admin/users/${id}/revoke-sessions`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      handleApiError(err);
    }
  }

  async function deleteReview(id: number) {
    try {
      await api.delete(`/admin/reviews/${id}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      handleApiError(err);
    }
  }

  async function deletePhoto(type: "worker" | "company", id: number) {
    try {
      await api.delete(`/admin/photos/${type}/${id}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      handleApiError(err);
    }
  }

  // ✅ UI si accès refusé / session expirée
  if (pageError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="rounded-2xl border bg-white p-6 space-y-3">
          <div className="text-lg font-semibold">Admin</div>
          <div className="text-sm text-red-700 bg-red-100 rounded p-3">
            {pageError}
          </div>
          <div className="text-sm text-gray-600">
            Si tu es admin, reconnecte-toi. Sinon, cette page est réservée aux admins.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-4">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 -mx-3 sm:-mx-6 px-3 sm:px-6 py-3 bg-white/90 backdrop-blur border-b">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-semibold">Admin</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <button
            type="button"
              onClick={() => router.push(`${base}/admin/ads`)}
              className="px-4 py-2 rounded-xl border text-sm transition bg-white hover:bg-gray-50"
            >
              Gérer les Ads
            </button>

            <TabButton active={tab === "dashboard"} label="Dashboard" onClick={() => setTab("dashboard")} />
            <TabButton active={tab === "users"} label="Utilisateurs" onClick={() => setTab("users")} />
            <TabButton active={tab === "moderation"} label="Modération" onClick={() => setTab("moderation")} />
            <TabButton active={tab === "security"} label="Sécurité" onClick={() => setTab("security")} />
            <TabButton active={tab === "audit"} label="Audit" onClick={() => setTab("audit")} />
          </div>
        </div>
      </div>

      {/* Dashboard */}
      {tab === "dashboard" && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-white p-4">
            <div className="font-semibold mb-2">Stats</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>Users: <b>{dash?.stats?.users ?? "—"}</b></div>
              <div>Workers: <b>{dash?.stats?.worker_profiles ?? "—"}</b></div>
              <div>Companies: <b>{dash?.stats?.company_profiles ?? "—"}</b></div>
              <div>Ads: <b>{dash?.stats?.ads ?? "—"}</b></div>
              <div>Reviews: <b>{dash?.stats?.reviews ?? "—"}</b></div>
              <div>Messages: <b>{dash?.stats?.messages ?? "—"}</b></div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="font-semibold mb-2">Connexions récentes</div>
            <div className="space-y-2 text-sm">
              {(dash?.recent?.logins || []).map((u: any) => (
                <div key={u.id} className="flex justify-between gap-2">
                  <span className="truncate">{u.name} — {u.email}</span>
                  <span className="opacity-70">{formatDt(u.last_login_at)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {tab === "users" && (
        <div className="space-y-3">
          <div className="rounded-2xl border bg-white p-4 flex flex-wrap gap-2 items-center">
            <input
              value={q}
              onChange={(e) => { setUsersMeta((m) => ({ ...m, page: 1 })); setQ(e.target.value); }}
              placeholder="Recherche nom/email..."
              className="border rounded-xl px-3 py-2 text-sm w-full sm:w-72"
            />
            <select
              value={status}
              onChange={(e) => { setUsersMeta((m) => ({ ...m, page: 1 })); setStatus(e.target.value as any); }}
              className="border rounded-xl px-3 py-2 text-sm"
            >
              <option value="">Tous</option>
              <option value="active">Actifs</option>
              <option value="suspended">Suspendus</option>
            </select>
            <div className="text-sm opacity-70 ml-auto">
              {usersMeta.total} users • Page {usersMeta.page}/{totalUsersPages}
            </div>
          </div>

          <div className="rounded-2xl border bg-white overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-semibold bg-gray-50">
              <div className="col-span-3">Nom</div>
              <div className="col-span-3">Email</div>
              <div className="col-span-2">Rôle</div>
              <div className="col-span-2">Last login</div>
              <div className="col-span-2">Actions</div>
            </div>

            {users.map((u) => (
              <div key={u.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-t">
                <div className="col-span-3 truncate">{u.name}</div>
                <div className="col-span-3 truncate">{u.email}</div>
                <div className="col-span-2">{u.role}</div>
                <div className="col-span-2 text-xs opacity-70">{formatDt(u.last_login_at)}</div>
                <div className="col-span-2 flex gap-2 flex-wrap">
                  {u.role === "admin" ? (
                    <span className="text-xs opacity-60">BD-only</span>
                  ) : (
                    <>
                      {!u.suspended_at && u.is_active ? (
                        <>
                          <button
                            className="px-2 py-1 rounded-lg border text-xs hover:bg-gray-50"
                            onClick={() => suspendUser(u.id, false)}
                          >
                            Suspendre
                          </button>
                          <button
                            className="px-2 py-1 rounded-lg border text-xs hover:bg-gray-50"
                            onClick={() => suspendUser(u.id, true)}
                            title="Suspendre + forcer déconnexion (token_version++)"
                          >
                            Suspendre + logout
                          </button>
                        </>
                      ) : (
                        <button
                          className="px-2 py-1 rounded-lg border text-xs hover:bg-gray-50"
                          onClick={() => unsuspendUser(u.id)}
                        >
                          Réactiver
                        </button>
                      )}
                      <button
                        className="px-2 py-1 rounded-lg border text-xs hover:bg-gray-50"
                        onClick={() => revokeSessions(u.id)}
                        title="Révoquer sessions (token_version++)"
                      >
                        Revoke
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-2 py-4">
            <button
              className="px-3 py-2 rounded-xl border text-sm disabled:opacity-50"
              disabled={usersMeta.page <= 1}
              onClick={() => setUsersMeta((m) => ({ ...m, page: m.page - 1 }))}
            >
              Précédent
            </button>
            <button
              className="px-3 py-2 rounded-xl border text-sm disabled:opacity-50"
              disabled={usersMeta.page >= totalUsersPages}
              onClick={() => setUsersMeta((m) => ({ ...m, page: m.page + 1 }))}
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {/* Moderation */}
      {tab === "moderation" && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-white p-4">
            <div className="font-semibold mb-2">Reviews</div>
            <div className="text-sm opacity-70 mb-2">
              {reviewsMeta.total} • Page {reviewsMeta.page}/{totalReviewsPages}
            </div>
            <div className="space-y-2">
              {reviews.map((r) => (
                <div key={r.id} className="border rounded-xl p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <div className="font-medium">
                      #{r.id} • {r.rating}★ • {r.reviewer_name || "—"}
                    </div>
                    <button
                      className="px-2 py-1 rounded-lg border text-xs hover:bg-gray-50"
                      onClick={() => deleteReview(r.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                  <div className="opacity-70 text-xs">{formatDt(r.created_at)}</div>
                  <div className="mt-2">{r.comment || <span className="opacity-60">—</span>}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="font-semibold">Photos</div>
              <select
                value={photoType}
                onChange={(e) => { setPhotosMeta((m) => ({ ...m, page: 1 })); setPhotoType(e.target.value as any); }}
                className="border rounded-xl px-3 py-2 text-sm"
              >
                <option value="worker">Worker</option>
                <option value="company">Company</option>
              </select>
            </div>

            <div className="text-sm opacity-70 mb-2">
              {photosMeta.total} • Page {photosMeta.page}/{totalPhotosPages}
            </div>

            <div className="space-y-2">
              {photos.map((p) => (
                <div key={p.id} className="border rounded-xl p-3 text-sm flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">#{p.id} • profile_id={p.profile_id}</div>
                    <div className="text-xs opacity-70 truncate">{p.image_url}</div>
                  </div>
                  <button
                    className="px-2 py-1 rounded-lg border text-xs hover:bg-gray-50"
                    onClick={() => deletePhoto(photoType, p.id)}
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Security */}
      {tab === "security" && (
        <div className="rounded-2xl border bg-white p-4 text-sm">
          <div className="font-semibold mb-2">Sécurité</div>
          <div className="opacity-80">
            - Logout forcé via <b>token_version</b> (boutons Suspendre+logout / Revoke).<br />
            - Les admins ne sont pas modifiables via API (BD-only).<br />
            - Les users suspendus ne peuvent plus effectuer d’actions authentifiées.
          </div>
        </div>
      )}

      {/* Audit */}
      {tab === "audit" && (
        <div className="space-y-3">
          <div className="rounded-2xl border bg-white p-4">
            <div className="font-semibold mb-2">Audit logs</div>
            <div className="text-sm opacity-70 mb-2">
              {logsMeta.total} • Page {logsMeta.page}/{totalLogsPages}
            </div>
            <div className="space-y-2 text-sm">
              {logs.map((l) => (
                <div key={l.id} className="border rounded-xl p-3">
                  <div className="font-medium">#{l.id} • {l.action}</div>
                  <div className="text-xs opacity-70">
                    {l.admin_name} ({l.admin_email}) • {formatDt(l.created_at)}
                  </div>
                  <div className="text-xs opacity-70">
                    target_user_id={l.target_user_id ?? "—"} • target={l.target_type ?? "—"}:{l.target_id ?? "—"}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-2 pt-4">
              <button
                className="px-3 py-2 rounded-xl border text-sm disabled:opacity-50"
                disabled={logsMeta.page <= 1}
                onClick={() => setLogsMeta((m) => ({ ...m, page: m.page - 1 }))}
              >
                Précédent
              </button>
              <button
                className="px-3 py-2 rounded-xl border text-sm disabled:opacity-50"
                disabled={logsMeta.page >= totalLogsPages}
                onClick={() => setLogsMeta((m) => ({ ...m, page: m.page + 1 }))}
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
