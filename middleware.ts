import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SUPPORTED = new Set(["fr", "ar"]);
const LANG_COOKIE = "bricol_lang";

function isPublicAsset(pathname: string) {
  // Next internals + API
  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) return true;

  // Common public files
  if (
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  )
    return true;

  // Any file with an extension (images, fonts, etc.)
  return /\.[a-zA-Z0-9]+$/.test(pathname);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicAsset(pathname)) return NextResponse.next();

  const seg = pathname.split("/")[1];

  // If already prefixed with a supported locale: keep it, but stamp the request
  // with a header so Server Components (e.g. app/layout.tsx) can read it.
  if (SUPPORTED.has(seg)) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-bricol-lang", seg);

    const res = NextResponse.next({
      request: { headers: requestHeaders },
    });

    // Persist preference in a cookie (useful for future enhancements)
    res.cookies.set(LANG_COOKIE, seg, {
      path: "/",
      sameSite: "lax",
    });

    return res;
  }

  // Otherwise, redirect to default locale (/fr)
  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? "/fr" : `/fr${pathname}`;

  const res = NextResponse.redirect(url);
  res.cookies.set(LANG_COOKIE, "fr", {
    path: "/",
    sameSite: "lax",
  });
  return res;
}

export const config = {
  matcher: ["/:path*"],
};
