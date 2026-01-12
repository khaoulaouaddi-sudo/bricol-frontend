// services/taxonomies.ts
import api  from "@/lib/api";
import { City, Umbrella, Sector } from "@/types";

export async function fetchCities(): Promise<City[]> {
  const { data } = await api.get<City[]>("/cities");
  return data;
}

export async function fetchUmbrellas(type?: "worker" | "company"): Promise<Umbrella[]> {
  const { data } = await api.get<Umbrella[]>("/umbrellas", {
    params: type ? { type } : undefined,
  });
  return data;
}

export async function fetchSectors(params?: { umbrella?: string; type?: "worker" | "company" }): Promise<Sector[]> {
  const { data } = await api.get<Sector[]>("/sectors", { params });
  return data;
}
