import { asc, eq } from "drizzle-orm";

import { jsonOk } from "@/lib/api/json";
import { db } from "@/lib/db/client";
import { ecolesEtudiant } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: ecolesEtudiant.id,
      nom: ecolesEtudiant.nom,
      ville: ecolesEtudiant.ville,
    })
    .from(ecolesEtudiant)
    .where(eq(ecolesEtudiant.actif, true))
    .orderBy(asc(ecolesEtudiant.ordreAffichage), asc(ecolesEtudiant.nom));

  return jsonOk({ ecoles: rows });
}
