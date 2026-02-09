"use client";

import Link from "next/link";
import React, { useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { useLang } from "@/components/LangProvider";

function buildLoginNext(lang: "fr" | "ar", pathWithQuery: string) {
  return `/${lang}/login?next=${encodeURIComponent(pathWithQuery)}`;
}

const i18n = {
  fr: {
    home: "Accueil",
    history: "Historique",
    login: "Se connecter",
    createWorker: "Créer un profil ouvrier",
    createCompany: "Créer un profil entreprise",
    hello: "Bonjour",
    mySpace: "Mon espace",
    logout: "Déconnexion",
    brand: "Bricol",
    langBtn: "Arabe",
    langTitle: "Passer à l’arabe",
  },
  ar: {
    home: "الرئيسية",
    history: "السجل",
    login: "تسجيل الدخول",
    createWorker: "إنشاء ملف عامل",
    createCompany: "إنشاء ملف شركة",
    hello: "مرحباً",
    mySpace: "مساحتي",
    logout: "تسجيل الخروج",
    brand: "Bricol",
    langBtn: "Français",
    langTitle: "العودة إلى الفرنسية",
  },
} as const;

function stripLangPrefix(pathname: string) {
  // enlève /fr ou /ar au début
  return pathname.replace(/^\/(fr|ar)(\/|$)/, "/");
}

export default function Header() {
  const { user, loading, logout } = useAuth();
  const { lang, setLang } = useLang();

  const router = useRouter();
  const pathname = usePathname() || "/fr";
  const searchParams = useSearchParams();

  const t = lang === "ar" ? i18n.ar : i18n.fr;
  const isRTL = lang === "ar";
  const prefix = `/${lang}`;

  const currentSearch = useMemo(() => {
    const s = searchParams?.toString() || "";
    return s ? `?${s}` : "";
  }, [searchParams]);

  const onToggleLang = () => {
    const nextLang: "fr" | "ar" = lang === "fr" ? "ar" : "fr";

    // Conserver exactement la même route + query, en remplaçant juste le préfixe /{lang}
    const rest = stripLangPrefix(pathname); // ex: "/results"
    const nextUrl = `/${nextLang}${rest}${currentSearch}`;

    setLang(nextLang);
    router.push(nextUrl);
  };

  const LangToggle = (
    <Button
      type="button"
      variant="outline"
      className="rounded-lg bg-transparent"
      title={t.langTitle}
      onClick={onToggleLang}
    >
      {t.langBtn}
    </Button>
  );

  if (loading) {
    return (
      <header className="w-full bg-white border-b border-gray-200" dir={isRTL ? "rtl" : "ltr"}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={prefix} className="text-2xl font-bold text-blue-600">
                {t.brand}
              </Link>

              <Link href={prefix}>
                <Button variant="outline" className="rounded-lg bg-transparent">
                  {t.home}
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {LangToggle}
              <div className="h-9 w-24 bg-gray-100 rounded-lg" />
              <div className="h-9 w-40 bg-gray-100 rounded-lg" />
            </div>
          </div>
        </div>
      </header>
    );
  }

  // NON CONNECTÉ
  if (!user) {
    return (
      <header className="w-full bg-white border-b border-gray-200" dir={isRTL ? "rtl" : "ltr"}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={prefix} className="text-2xl font-bold text-blue-600">
                {t.brand}
              </Link>

              <Link href={prefix}>
                <Button variant="outline" className="rounded-lg bg-transparent">
                  {t.home}
                </Button>
              </Link>
            </div>

            <nav className="flex items-center gap-3 flex-wrap justify-end">
              {LangToggle}

              <Link href={`${prefix}/history`}>
                <Button variant="outline" className="rounded-lg bg-transparent">
                  {t.history}
                </Button>
              </Link>

              <Link href={`${prefix}/login`}>
                <Button variant="outline" className="rounded-lg bg-transparent">
                  {t.login}
                </Button>
              </Link>

              {/* ✅ Essentiel : après login, revenir vers /worker/new */}
              <Link href={buildLoginNext(lang, `${prefix}/worker/new`)}>
                <Button variant="outline" className="rounded-lg bg-transparent">
                  {t.createWorker}
                </Button>
              </Link>

              {/* ✅ Essentiel : après login, revenir vers /company/new */}
              <Link href={buildLoginNext(lang, `${prefix}/company/new`)}>
                <Button className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white">
                  {t.createCompany}
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>
    );
  }

  // CONNECTÉ
  const name = user.name || user.email;

  return (
    <header className="w-full bg-white border-b border-gray-200" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={prefix} className="text-2xl font-bold text-blue-600">
              {t.brand}
            </Link>

            <Link href={prefix}>
              <Button variant="outline" className="rounded-lg bg-transparent">
                {t.home}
              </Button>
            </Link>
          </div>

          <nav className="flex items-center gap-3 flex-wrap justify-end">
            {LangToggle}

            <span className="text-sm text-gray-600 hidden sm:inline">
              {t.hello},{" "}
              <span className="font-semibold">{name}</span>
            </span>

            <Link href={`${prefix}/history`}>
              <Button variant="outline" className="rounded-lg bg-transparent">
                {t.history}
              </Button>
            </Link>

            <Link href={`${prefix}/account?tab=account`}>
              <Button variant="outline" className="rounded-lg bg-transparent">
                {t.mySpace}
              </Button>
            </Link>

            <Button onClick={logout} variant="outline" className="rounded-lg bg-transparent">
              {t.logout}
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
