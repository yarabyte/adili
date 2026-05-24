import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { affaires, comptesRendus } from "@/lib/db/schema";
import type { CurrentProfile } from "@/lib/auth/profile";
import {
  type AffaireContext,
  getEffectiveRole,
} from "@/lib/permissions/affaires";
import {
  type ActionCompteRendu,
  hasCompteRenduPermission,
} from "@/lib/permissions/comptes-rendus";

export type CompteRenduRow = {
  id: string;
  affaireId: string;
  auteurId: string;
  statut: "brouillon" | "finalise" | "en_revue" | "valide" | "rejete";
  soumisValidation: boolean;
  confidentialite: "standard" | "sensible";
  titre: string;
};

export type CompteRenduAuthContext = AffaireContext & {
  compteRendu: CompteRenduRow;
  affaireResponsableId: string;
};

export async function getCompteRenduRow(
  compteRenduId: string
): Promise<(CompteRenduRow & { affaireResponsableId: string }) | null> {
  const [row] = await db
    .select({
      id: comptesRendus.id,
      affaireId: comptesRendus.affaireId,
      auteurId: comptesRendus.auteurId,
      statut: comptesRendus.statut,
      soumisValidation: comptesRendus.soumisValidation,
      confidentialite: comptesRendus.confidentialite,
      titre: comptesRendus.titre,
      affaireResponsableId: affaires.responsableId,
    })
    .from(comptesRendus)
    .innerJoin(affaires, eq(comptesRendus.affaireId, affaires.id))
    .where(eq(comptesRendus.id, compteRenduId))
    .limit(1);

  return row ?? null;
}

export async function authorizeCompteRendu(
  session: CurrentProfile,
  compteRenduId: string,
  action: ActionCompteRendu<"compte_rendu">
): Promise<CompteRenduAuthContext | null> {
  const cr = await getCompteRenduRow(compteRenduId);
  if (!cr) return null;

  const ctx = await getEffectiveRole(session, cr.affaireId);
  if (!ctx) return null;
  if (!hasCompteRenduPermission(ctx.role, "compte_rendu", action)) return null;

  const { affaireResponsableId, ...compteRendu } = cr;
  return { ...ctx, compteRendu, affaireResponsableId };
}

/** Édition du contenu : brouillon/rejeté, auteur ou admin cabinet. */
export function canEditCompteRenduContent(
  session: CurrentProfile,
  auth: CompteRenduAuthContext
): boolean {
  const { statut, auteurId } = auth.compteRendu;
  if (statut !== "brouillon" && statut !== "rejete") return false;
  if (auth.role === "admin_cabinet") return true;
  return auteurId === session.user.id;
}

/** Finaliser / soumettre : auteur du CR (ou admin). */
export function isCompteRenduAuteur(
  session: CurrentProfile,
  auth: CompteRenduAuthContext
): boolean {
  return (
    auth.compteRendu.auteurId === session.user.id ||
    auth.role === "admin_cabinet"
  );
}

export function isCompteRenduLocked(statut: CompteRenduRow["statut"]): boolean {
  return statut === "finalise" || statut === "valide" || statut === "en_revue";
}
