"use client";

import React, { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();

  // Déduire la langue depuis l'URL (même logique que LangProvider)
  const lang = useMemo(() => {
    const seg = pathname.split("/")[1];
    return seg === "ar" ? "ar" : "fr";
  }, [pathname]);

  useEffect(() => {
    if (loading) return;
    if (user) return;

    // Par sécurité: éviter boucle si ce composant était utilisé sur /login
    if (pathname === `/${lang}/login`) return;

    const qs = searchParams?.toString();
    const current = qs ? `${pathname}?${qs}` : pathname;

    router.replace(`/${lang}/login?next=${encodeURIComponent(current)}`);
  }, [loading, user, router, pathname, searchParams, lang]);

  if (loading || !user) return null; // petit skeleton possible

  return <>{children}</>;
}
