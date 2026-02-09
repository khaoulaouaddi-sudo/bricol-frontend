"use client";

import * as React from "react";
import { UmbrellaIcons } from "@/components/UmbrellaIcons";
import { fetchUmbrellas } from "@/services/taxonomies";
import { useLang } from "@/components/LangProvider";

const i18n = {
  fr: { loading: "Chargement…" },
  ar: { loading: "جار التحميل…" },
} as const;

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

  if (loading) return <div className="text-sm text-muted-foreground">{t.loading}</div>;
  return <UmbrellaIcons umbrellas={umbrellas} />;
}
