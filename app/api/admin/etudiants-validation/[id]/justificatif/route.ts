import { eq } from "drizzle-orm";

import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { getEtudiantJustificatifSignedUrl } from "@/lib/billing/etudiant-storage";
import { jsonError, jsonOk } from "@/lib/api/json";
import { db } from "@/lib/db/client";
import { validationsEtudiants } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

export async function GET(req: Request, { params }: Params) {
  const auth = await requireAdminApi("etudiant_validation.decide", req);
  if (auth instanceof Response) return auth;

  const [row] = await db
    .select()
    .from(validationsEtudiants)
    .where(eq(validationsEtudiants.id, params.id))
    .limit(1);

  if (!row?.justificatifUrl) {
    return jsonError("Aucun justificatif", 404);
  }

  try {
    const url = await getEtudiantJustificatifSignedUrl(row.justificatifUrl);
    return jsonOk({ url });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Lien indisponible",
      500
    );
  }
}
