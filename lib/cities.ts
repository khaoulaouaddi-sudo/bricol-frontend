import api from "./api";
import type { City } from "./types";

export async function searchCities(q: string, limit = 20): Promise<City[]> {
  const { data } = await api.get("/cities", { params: { q, limit } });
  return data as City[];
}
