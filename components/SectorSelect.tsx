"use client";
import { useEffect, useState } from "react";
import { searchSectors } from "@/lib/sectors";
import type { Sector } from "@/lib/types";

export default function SectorSelect({
  value,
  onChange,
  context = "worker",
  placeholder = "Secteur…",
}: { value?: number|null; onChange: (id:number|null)=>void; context?: "worker"|"company"; placeholder?:string }) {
  const [q, setQ] = useState("");
  const [options, setOptions] = useState<Sector[]>([]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      const list = await searchSectors(q, context, 30);
      if (alive) setOptions(list);
    };
    const t = setTimeout(run, 300);
    return () => { alive = false; clearTimeout(t); };
  }, [q, context]);

  return (
    <div style={{display:"grid", gap:8}}>
      <input value={q} onChange={e=>setQ(e.target.value)} placeholder={placeholder} />
      <select value={value ?? ""} onChange={e=>onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">(Aucun secteur)</option>
        {options.map(s => <option key={s.id} value={s.id}>{s.label ?? s.name}</option>)}
      </select>
    </div>
  );
}
