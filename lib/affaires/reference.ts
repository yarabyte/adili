import "server-only";

import { and, eq, gte, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { affaires } from "@/lib/db/schema";

/**
 * Génère une référence de la forme `YYYY-NNN` à partir du nombre
 * d'affaires ouvertes dans le cabinet pour l'année en cours.
 *
 * Garantit l'unicité au niveau du cabinet, mais reste vulnérable aux
 * collisions sous forte concurrence — on s'appuie sur l'index unique
 * `affaires_cabinet_reference_uniq` côté DB + retry dans l'appelant.
 */
export async function generateAffaireReference(
  cabinetId: string
): Promise<string> {
  const year = new Date().getFullYear();
  const yearStartIso = `${year}-01-01`;

  const [row] = await db
    .select({ count: sql<string>`count(*)` })
    .from(affaires)
    .where(
      and(
        eq(affaires.cabinetId, cabinetId),
        gte(affaires.dateOuverture, yearStartIso)
      )
    );

  const current = Number(row?.count ?? 0);
  const next = current + 1;
  return `${year}-${String(next).padStart(3, "0")}`;
}

/**
 * Valide qu'une référence saisie est libre dans le cabinet.
 */
export async function isReferenceAvailable(
  cabinetId: string,
  reference: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: affaires.id })
    .from(affaires)
    .where(
      and(
        eq(affaires.cabinetId, cabinetId),
        eq(affaires.reference, reference)
      )
    )
    .limit(1);
  return !row;
}
