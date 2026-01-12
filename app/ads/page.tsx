"use client";
import { useEffect, useState } from "react";
import { listAds, Ad } from "@/lib/ads";

export default function AdsPage() {
  const [items, setItems] = useState<Ad[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const load = async (p = 1) => {
    setLoading(true); setErr(null);
    try {
      const rows = await listAds({ page: p, limit: 10, sort_by: "created_at", sort_dir: "desc" });
      setItems(rows);
    } catch (e: any) {
      setErr(e?.response?.data?.msg || e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Annonces</h1>
      {loading && <p>Chargement…</p>}
      {err && <p style={{color:"#c00"}}>{err}</p>}
      {!loading && !err && items.length === 0 && <p>Aucune annonce pour le moment.</p>}

      <ul style={{display:"grid",gap:12}}>
        {items.map(ad => (
          <li key={ad.id} style={{border:"1px solid #eee", borderRadius:12, padding:12}}>
            <div style={{fontWeight:600}}>{ad.title}</div>
            {ad.description && <div style={{opacity:.8, marginTop:6}}>{ad.description}</div>}
            <div style={{opacity:.6, marginTop:6, fontSize:12}}>
              {(ad.type ?? "—")} • {(ad.location ?? "—")} {ad.price != null ? `• ${ad.price} MAD` : ""}
            </div>
          </li>
        ))}
      </ul>

      <div style={{display:"flex",gap:8,marginTop:16}}>
        <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Précédent</button>
        <span>Page {page}</span>
        <button onClick={()=>setPage(p=>p+1)} disabled={items.length < 10}>Suivant</button>
      </div>
    </div>
  );
}
