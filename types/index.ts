// types/index.ts
export type Role = "visitor" | "worker" | "company" | "admin";

export type City = {
  id: number;
  slug: string;
  name_fr: string;
  name_ar?: string;
  display_name?: string | null;
};

export type Sector = {
  id: number;
  slug: string;

  name: string;
  name_ar?: string;

  label?: string;
  label_ar?: string;

  display_name?: string | null;
  display_label?: string | null;

  umbrella?: { slug: string; name: string; name_ar?: string; display_name?: string | null } | null;
};

export type Umbrella = {
  id?: number;
  slug: string;

  name: string;
  name_ar?: string;
  display_name?: string | null;

  sectors: {
    id: number;
    slug: string;

    name: string;
    name_ar?: string;

    label?: string;
    label_ar?: string;

    display_name?: string | null;
    display_label?: string | null;
  }[];
};
