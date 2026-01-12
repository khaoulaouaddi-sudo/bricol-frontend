"use client";
import { useEffect, useState } from "react";
import { getAd, Ad } from "@/lib/ads";

export default function AdDetail({ params }: { params: { id: string } }) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await getAd(Number(params.id));
        setAd(r);
      } catch (e: any) {
        setErr(e?.response?.data?.msg || e?.message || "Erreur");
      }
    })();
  }, [params.id]);

  if (err) return <p style={{color:"#c00"}}>{err}</p>;
  if (!ad) return <p>Chargement…</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">{ad.title}</h1>
      {ad.image_url && <img src={ad.image_url} alt="" style={{maxWidth:480, borderRadius:12}} />}
      {ad.description && <p style={{marginTop:12}}>{ad.description}</p>}
      <div style={{opacity:.7, marginTop:8}}>
        {(ad.type ?? "—")} • {(ad.location ?? "—")} {ad.price != null ? `• ${ad.price} MAD` : ""}
      </div>
    </div>
  );
}
