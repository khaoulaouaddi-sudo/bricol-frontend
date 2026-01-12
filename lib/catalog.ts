import { api } from "./api";

export type City = { id: number; name_fr: string };
export type Sector = { id: number; name: string; slug: string };

function pick<T=any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (payload?.rows && Array.isArray(payload.rows)) return payload.rows;
  if (payload?.data && Array.isArray(payload.data)) return payload.data;
  if (payload?.data?.rows && Array.isArray(payload.data.rows)) return payload.data.rows;
  return [];
}

export async function fetchCities(): Promise<City[]> {
  const res = await api.get("/cities");
  const rows = pick(res.data);
  return rows.map((c: any) => ({
    id: Number(c.id),
    name_fr: c.name_fr ?? c.name ?? c.label ?? "",
  }));
}

export async function fetchSectors(): Promise<Sector[]> {
  const res = await api.get("/sectors");
  const rows = pick(res.data);
  return rows.map((s: any) => ({
    id: Number(s.id),
    name: s.name ?? s.title ?? "",
    slug: s.slug ?? "",
  }));
}
