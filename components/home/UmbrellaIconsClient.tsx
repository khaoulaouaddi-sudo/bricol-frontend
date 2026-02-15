"use client";

import * as React from "react";
import { UmbrellaIcons } from "@/components/UmbrellaIcons";
import { fetchUmbrellas } from "@/services/taxonomies";
import { useLang } from "@/components/LangProvider";

const i18n = {
  fr: {
    loading: "Chargement…",
    empty: "Aucune catégorie à afficher pour le moment.",
  },
  ar: {
    loading: "جار التحميل…",
    empty: "لا توجد فئات لعرضها حالياً.",
  },
} as const;

function UmbrellaIconsSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="w-full">
      {/* Skeleton grid that roughly matches icons layout */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="animate-pulse rounded-xl border bg-muted/40"
          >
            <div className="p-3 flex flex-col items-center gap-2">
              {/* icon bubble */}
              <div className="h-10 w-10 rounded-full bg-muted" />
              {/* label */}
              <div className="h-3 w-14 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-muted-foreground">{/* keeps rhythm */}</div>
    </div>
  );
}

export default function UmbrellaIconsClient() {
  const { lang } = useLang();
  const t = lang === "ar" ? i18n.ar : i18n.fr;

  const [umbrellas, setUmbrellas] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchUmbrellas(undefined, lang);
        if (mounted) setUmbrellas(data || []);
      } catch (e) {
        if (mounted) setUmbrellas([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [lang]);

  return (
    <div className="w-full space-y-3">
      {loading ? (
        <>
          <div className="text-sm text-muted-foreground">{t.loading}</div>
          <UmbrellaIconsSkeleton count={12} />
        </>
      ) : umbrellas.length === 0 ? (
        <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
          {t.empty}
        </div>
      ) : (
        <UmbrellaIcons umbrellas={umbrellas} />
      )}
    </div>
  );
}
