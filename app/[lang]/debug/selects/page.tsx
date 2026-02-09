"use client";
import { useState } from "react";
import CitySelect from "@/components/CitySelect";
import SectorSelect from "@/components/SectorSelect";

export default function Page() {
  const [cityId, setCityId] = useState<number|null>(null);
  const [sectorId, setSectorId] = useState<number|null>(null);

  return (
    <div style={{padding:24, display:"grid", gap:16, maxWidth:600}}>
      <h1>Test sélecteurs</h1>
      <CitySelect value={cityId} onChange={setCityId} />
      <SectorSelect value={sectorId} onChange={setSectorId} context="worker" />
      <pre>{JSON.stringify({ cityId, sectorId }, null, 2)}</pre>
    </div>
  );
}
