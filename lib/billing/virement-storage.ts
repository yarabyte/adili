import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const PREUVES_BUCKET = "paiements";

export async function uploadPreuveVirement(
  paiementId: string,
  file: File
): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const path = `preuves-virement/${paiementId}/${Date.now()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage
    .from(PREUVES_BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    throw new Error(
      error.message.includes("Bucket not found")
        ? `Bucket Storage « ${PREUVES_BUCKET} » absent — créez-le dans Supabase (privé).`
        : error.message
    );
  }

  return path;
}
