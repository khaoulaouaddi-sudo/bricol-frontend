// types/index.ts
export type Role = "visitor" | "worker" | "company" | "admin";

export type City = { id: number; slug: string; name_fr: string };
export type Sector = {
  id: number; slug: string; name: string;
  label?: string;
  umbrella?: { slug: string; name: string } | null;
};
export type Umbrella = {
  id?: number;
  slug: string;
  name: string;
  sectors: { id: number; slug: string; name: string; label?: string }[];
};
