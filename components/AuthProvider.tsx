"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

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
    if (typeof window === "undefined") {
      // (ne devrait pas arriver en "use client", mais safe)
      setUser(null);
      setLoading(false);
      return null;
    }

    const token = localStorage.getItem("accessToken");

    // 1) Si pas de token, tenter refresh (cookie httpOnly)
    if (!token) {
      try {
        const { data } = await api.post("/auth/refresh");
        const newAccess = (data as any)?.access_token;
        if (newAccess) {
          localStorage.setItem("accessToken", newAccess);
        } else {
          setUser(null);
          setLoading(false);
          return null;
        }
      } catch {
        setUser(null);
        setLoading(false);
        return null;
      }
      // pas de finally ici : on continue et on tente /users/me
    }

    // 2) Charger /users/me
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
    return await loadMe();
  }

  async function login(accessToken: string) {
    localStorage.setItem("accessToken", accessToken);

    // Charger /users/me tout de suite
    await loadMe();

    // Notifier le reste de l'app
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
