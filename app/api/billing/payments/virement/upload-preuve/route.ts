import { eq } from "drizzle-orm";

import { jsonError, jsonOk } from "@/lib/api/json";
import { requireCabinetOwnerApi } from "@/lib/billing/require-owner";
import { uploadPreuveVirement } from "@/lib/billing/virement-storage";
import { db } from "@/lib/db/client";
import { paiements } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const owner = await requireCabinetOwnerApi();
  if (owner instanceof Response) return owner;
  const session = owner;

  const formData = await req.formData();
  const file = formData.get("preuve");
  const paiementId = formData.get("paiement_id");

  if (!(file instanceof File) || typeof paiementId !== "string") {
    return jsonError("Fichier ou paiement_id manquant", 400);
  }

  if (file.size > 5 * 1024 * 1024) {
    return jsonError("Fichier trop volumineux (max 5 Mo)", 400);
  }

  const [paiement] = await db
    .select()
    .from(paiements)
    .where(eq(paiements.id, paiementId))
    .limit(1);

  if (!paiement || paiement.cabinetId !== session.profile.cabinetId) {
    return jsonError("Paiement introuvable", 404);
  }

  if (paiement.methode !== "virement") {
    return jsonError("Ce paiement n'est pas un virement", 400);
  }

  try {
    const path = await uploadPreuveVirement(paiementId, file);
    await db
      .update(paiements)
      .set({ preuveVirementUrl: path, updatedAt: new Date() })
      .where(eq(paiements.id, paiementId));

    return jsonOk({ ok: true, path });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Échec de l'upload",
      500
    );
  }
}
