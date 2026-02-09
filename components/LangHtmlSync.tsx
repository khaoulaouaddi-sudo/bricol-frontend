"use client";

import { useEffect } from "react";
import { useLang } from "@/components/LangProvider";

export default function LangHtmlSync() {
  const { lang } = useLang();

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("lang", lang === "ar" ? "ar" : "fr");
    html.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  }, [lang]);

  return null;
}
