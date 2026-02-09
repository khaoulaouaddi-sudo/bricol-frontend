"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Lang } from "@/lib/lang";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
};

const LangContext = React.createContext<Ctx | null>(null);

export function useLang() {
  const ctx = React.useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();

  const lang: Lang = React.useMemo(() => {
    const seg = pathname.split("/")[1];
    return seg === "ar" ? "ar" : "fr";
  }, [pathname]);

  const setLangSafe = (l: Lang) => {
    const parts = pathname.split("/");
    // parts[0] is always "" because pathname starts with '/'
    if (parts.length < 2) {
      parts.push(l);
    } else {
      parts[1] = l;
    }
    const nextPath = parts.join("/") || "/";
    const qs = searchParams?.toString();
    router.push(qs ? `${nextPath}?${qs}` : nextPath);
  };

  return (
    <LangContext.Provider value={{ lang, setLang: setLangSafe }}>
      {children}
    </LangContext.Provider>
  );
}
