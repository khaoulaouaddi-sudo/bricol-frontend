import { api } from "./api";


export type WorkerRow = {
id: number; // wp.id (worker_profile_id)
user_id: number;
title: string | null;
description: string | null;
skills: string | null;
experience: string | null;
location: string | null;
available: boolean | null;
verification_status: string | null;
trust_badge: boolean | null;
created_at?: string;
updated_at?: string;
// jointures
user_name: string | null;
user_photo: string | null;
sector_name?: string | null;
city_name?: string | null;
};


export async function fetchWorkerProfiles(params: {
city_id?: number | null;
sector_id?: number | null;
q?: string;
page?: number;
limit?: number;
}): Promise<WorkerRow[]> {
const { city_id, sector_id, q, page = 1, limit = 18 } = params;
const res = await api.get("/worker-profiles/search", {
params: { city_id, sector_id, q, page, limit },
});
// Le contrôleur renvoie rows directement (pas d'objet { total, ... })
return res.data as WorkerRow[];
}