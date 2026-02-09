export type Lang = "fr" | "ar";

const KEY = "bricol_lang";

export function getLang(): Lang {
  if (typeof window === "undefined") return "fr";

  // ✅ Source of truth: URL prefix (/fr/... or /ar/...)
  const seg = window.location.pathname.split("/")[1];
  if (seg === "ar") return "ar";
  if (seg === "fr") return "fr";

  // Fallback (legacy): localStorage
  const v = window.localStorage.getItem(KEY);
  return v === "ar" ? "ar" : "fr";
}

export function setLang(l: Lang) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, l);
}
