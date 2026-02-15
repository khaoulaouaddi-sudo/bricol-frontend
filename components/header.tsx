"use client";

import Link from "next/link";
import React, { useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MenuIcon } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
    brand: "Bricola",
    langBtn: "Arabe",
    langTitle: "Passer à l’arabe",
    menu: "Menu",
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
    brand: "Bricola",
    langBtn: "Français",
    langTitle: "العودة إلى الفرنسية",
    menu: "القائمة",
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

  const side = isRTL ? "left" : "right";

  const MobileMenu = (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="rounded-lg bg-transparent sm:hidden"
          aria-label={t.menu}
          title={t.menu}
        >
          <MenuIcon className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side={side} className="w-[320px] sm:w-[380px]" dir={isRTL ? "rtl" : "ltr"}>
        <SheetHeader>
          <SheetTitle className="text-lg">{t.brand}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-2">
          <SheetClose asChild>
            <Link href={prefix}>
              <Button variant="outline" className="w-full justify-start rounded-xl bg-transparent">
                {t.home}
              </Button>
            </Link>
          </SheetClose>

          <SheetClose asChild>
            <Link href={`${prefix}/history`}>
              <Button variant="outline" className="w-full justify-start rounded-xl bg-transparent">
                {t.history}
              </Button>
            </Link>
          </SheetClose>

          {!user ? (
            <>
              <SheetClose asChild>
                <Link href={`${prefix}/login`}>
                  <Button variant="outline" className="w-full justify-start rounded-xl bg-transparent">
                    {t.login}
                  </Button>
                </Link>
              </SheetClose>

              <SheetClose asChild>
                <Link href={buildLoginNext(lang, `${prefix}/worker/new`)}>
                  <Button variant="outline" className="w-full justify-start rounded-xl bg-transparent">
                    {t.createWorker}
                  </Button>
                </Link>
              </SheetClose>

              <SheetClose asChild>
                <Link href={buildLoginNext(lang, `${prefix}/company/new`)}>
                  <Button className="w-full justify-start rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                    {t.createCompany}
                  </Button>
                </Link>
              </SheetClose>
            </>
          ) : (
            <>
              <div className="px-1 py-2 text-sm text-gray-600">
                {t.hello}, <span className="font-semibold">{user.name || user.email}</span>
              </div>

              <SheetClose asChild>
                <Link href={`${prefix}/account?tab=account`}>
                  <Button variant="outline" className="w-full justify-start rounded-xl bg-transparent">
                    {t.mySpace}
                  </Button>
                </Link>
              </SheetClose>

              <Button
                onClick={logout}
                variant="outline"
                className="w-full justify-start rounded-xl bg-transparent"
              >
                {t.logout}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );

  // Layout commun (responsive)
  const BrandArea = (
    <div className="flex items-center gap-3">
      <Link href={prefix} className="text-2xl font-bold text-blue-600">
        {t.brand}
      </Link>

      {/* Sur mobile, le clic sur le logo suffit pour revenir à l'accueil */}
      <Link href={prefix} className="hidden sm:inline-flex">
        <Button variant="outline" className="rounded-lg bg-transparent">
          {t.home}
        </Button>
      </Link>
    </div>
  );

  if (loading) {
    return (
      <header className="w-full bg-white border-b border-gray-200" dir={isRTL ? "rtl" : "ltr"}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {BrandArea}

            <div className="flex items-center gap-2 sm:gap-3">
              {LangToggle}
              {MobileMenu}

              {/* Desktop skeleton */}
              <div className="hidden sm:block h-9 w-24 bg-gray-100 rounded-lg" />
              <div className="hidden sm:block h-9 w-40 bg-gray-100 rounded-lg" />
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {BrandArea}

            {/* Mobile: Lang + Drawer. Desktop: nav complet */}
            <div className="flex items-center gap-2 sm:gap-3">
              {LangToggle}
              {MobileMenu}

              <nav className="hidden sm:flex items-center gap-3 justify-end">
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
        </div>
      </header>
    );
  }

  // CONNECTÉ
  const name = user.name || user.email;

  return (
    <header className="w-full bg-white border-b border-gray-200" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {BrandArea}

          {/* Mobile: Lang + Drawer. Desktop: nav complet */}
          <div className="flex items-center gap-2 sm:gap-3">
            {LangToggle}
            {MobileMenu}

            <nav className="hidden sm:flex items-center gap-3 justify-end">
              <span className="text-sm text-gray-600 hidden md:inline">
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
      </div>
    </header>
  );
}
