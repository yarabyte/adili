import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const ETUDIANTS_BUCKET = "etudiants";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function validateEtudiantJustificatif(file: File): string | null {
  if (!file.size) return "Fichier vide.";
  if (file.size > MAX_BYTES) return "Fichier trop volumineux (max. 5 Mo).";
  if (!ALLOWED.has(file.type)) {
    return "Format accepté : PDF, JPEG, PNG ou WebP.";
  }
  return null;
}

export async function uploadEtudiantJustificatif(
  userId: string,
  validationId: string,
  file: File
): Promise<string> {
  const err = validateEtudiantJustificatif(file);
  if (err) throw new Error(err);

  const supabase = createSupabaseAdminClient();
  const ext =
    file.type === "application/pdf"
      ? "pdf"
      : file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";
  const path = `justificatifs/${userId}/${validationId}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(ETUDIANTS_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    throw new Error(
      error.message.includes("Bucket not found")
        ? `Bucket Storage « ${ETUDIANTS_BUCKET} » absent — créez-le dans Supabase (privé).`
        : error.message
    );
  }

  return path;
}

export async function getEtudiantJustificatifSignedUrl(
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(ETUDIANTS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Impossible de générer le lien.");
  }
  return data.signedUrl;
}
