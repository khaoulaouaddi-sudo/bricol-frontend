// services/taxonomies.ts
import api from "@/lib/api";
import { City, Umbrella, Sector } from "@/types";

export async function fetchCities(lang?: "fr" | "ar"): Promise<City[]> {
  const { data } = await api.get<City[]>("/cities", {
    params: { ...(lang ? { lang } : {}), limit: 100 }, // <-- IMPORTANT
  });
  return data;
}

export async function fetchUmbrellas(
  type?: "worker" | "company",
  lang?: "fr" | "ar"
): Promise<Umbrella[]> {
  const params: any = {};
  if (type) params.type = type;
  if (lang) params.lang = lang;

  const { data } = await api.get<Umbrella[]>("/umbrellas", {
    params: Object.keys(params).length ? params : undefined,
  });
  return data;
}

export async function fetchSectors(params?: {
  umbrella?: string;
  type?: "worker" | "company";
  lang?: "fr" | "ar";
}): Promise<Sector[]> {
  const { data } = await api.get<Sector[]>("/sectors", { params });
  return data;
}
