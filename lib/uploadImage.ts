// lib/uploadImage.ts
// Upload un fichier image vers le backend (Render) qui le stocke sur Cloudinary

import { api } from "./api";

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const { data } = await api.post("/uploads/image", form, {
    headers: {
      // IMPORTANT: ne pas fixer la boundary manuellement
      "Content-Type": "multipart/form-data",
    },
  });

  const url = (data as any)?.url;
  if (!url || typeof url !== "string") {
    throw new Error("Upload réussi mais URL introuvable");
  }
  return url;
}
