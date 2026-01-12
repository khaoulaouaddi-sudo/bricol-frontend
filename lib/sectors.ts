import api from "@/lib/api";
import type { Sector, CompanySectorLink } from "@/lib/types";

export async function searchSectors(q: string, context: "worker"|"company", limit = 30): Promise<Sector[]> {
  const { data } = await api.get("/sectors", { params: { q, limit, context } });
  return data as Sector[];
}

export async function listCompanySectors(companyId: number): Promise<CompanySectorLink[]> {
  const { data } = await api.get(`/company-profiles/${companyId}/sectors`);
  return data as CompanySectorLink[];
}

export async function addCompanySector(companyId: number, sector_id: number) {
  const { data } = await api.post(`/company-profiles/${companyId}/sectors`, { sector_id });
  return data as CompanySectorLink;
}

export async function removeCompanySector(companyId: number, sectorId: number) {
  await api.delete(`/company-profiles/${companyId}/sectors/${sectorId}`);
}
