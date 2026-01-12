"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import  api  from "@/lib/api";

type User = { id: number; name: string | null; email: string; role: string };

type Ctx = {
  user: User | null;
  loading: boolean;
  login: (accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMe(): Promise<User | null> {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const { data } = await api.get<User>("/users/me");
      setUser(data);
      return data;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "accessToken") loadMe();
    };
    window.addEventListener("storage", onStorage);

    const onAuthUpdated = () => loadMe();
    window.addEventListener("auth-updated", onAuthUpdated as any);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth-updated", onAuthUpdated as any);
    };
  }, []);

  async function refreshUser() {
    // met à jour le state depuis /users/me (si token)
    return await loadMe();
  }

  async function login(accessToken: string) {
    localStorage.setItem("accessToken", accessToken);

    // IMPORTANT: on charge tout de suite /users/me pour éviter rôle “stale”
    await loadMe();

    // et on notifie le reste de l'app (header, pages…)
    window.dispatchEvent(new Event("auth-updated"));
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {}

    localStorage.removeItem("accessToken");
    setUser(null);

    window.dispatchEvent(new Event("auth-updated"));
  }

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
