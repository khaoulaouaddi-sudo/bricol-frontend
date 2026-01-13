"use client";

import * as React from "react";
import { UmbrellaIcons } from "@/components/UmbrellaIcons";
import { fetchUmbrellas } from "@/services/taxonomies";

export default function UmbrellaIconsClient() {
  const [umbrellas, setUmbrellas] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchUmbrellas();
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
  }, []);

  if (loading) return <div className="text-sm text-muted-foreground">Chargement…</div>;
  return <UmbrellaIcons umbrellas={umbrellas} />;
}
