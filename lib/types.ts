export type City = {
  id: number; slug: string; name_fr: string; name_ar?: string; region?: string;
};

export type Sector = {
  id: number; slug: string; name: string;
  worker_label_fr?: string; company_label_fr?: string;
  label?: string; // renvoyé par /sectors?context=...
};

export type WorkerProfile = {
  id: number;
  user_id: number;
  title?: string;
  location?: string;
  city_id?: number | null;
  sector_id?: number | null;
  // ...tes autres champs
};

export type CompanyProfile = {
  id: number;
  user_id: number;
  name?: string;
  location?: string;
  city_id?: number | null;
  // ...tes autres champs
};

export type CompanySectorLink = {
  id: number;
  company_id: number;
  sector_id: number | null; // peut être null sur vieux liens
  sector?: string | null;   // legacy texte
  slug?: string; name?: string;
  worker_label_fr?: string; company_label_fr?: string;
};
