import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { affaireMembres, affaires, users } from "@/lib/db/schema";

const ROLE_LABELS: Record<string, string> = {
  responsable: "Responsable",
  contributeur: "Contributeur",
  lecteur: "Lecteur",
};

import { formatMemberDisplayName } from "@/lib/users/display-name";

import type { AffaireMembreOption } from "@/lib/echeances/types";

export type { AffaireMembreOption };

/** Membres assignables comme responsable d'une échéance (responsable dossier + membres). */
export async function listAffaireMembreOptions(
  affaireId: string
): Promise<AffaireMembreOption[]> {
  const [affaire] = await db
    .select({
      responsableId: affaires.responsableId,
      responsableNom: users.fullName,
      responsableEmail: users.email,
      responsableTitre: users.titre,
    })
    .from(affaires)
    .innerJoin(users, eq(affaires.responsableId, users.id))
    .where(eq(affaires.id, affaireId))
    .limit(1);

  const membres = await db
    .select({
      userId: affaireMembres.userId,
      role: affaireMembres.role,
      fullName: users.fullName,
      email: users.email,
      titre: users.titre,
    })
    .from(affaireMembres)
    .innerJoin(users, eq(affaireMembres.userId, users.id))
    .where(eq(affaireMembres.affaireId, affaireId));

  const byId = new Map<string, AffaireMembreOption>();

  if (affaire) {
    byId.set(affaire.responsableId, {
      userId: affaire.responsableId,
      fullName: formatMemberDisplayName(
        affaire.responsableNom,
        affaire.responsableEmail,
        affaire.responsableTitre
      ),
      email: affaire.responsableEmail,
      roleLabel: "Responsable du dossier",
    });
  }

  for (const m of membres) {
    byId.set(m.userId, {
      userId: m.userId,
      fullName: formatMemberDisplayName(m.fullName, m.email, m.titre),
      email: m.email,
      roleLabel: ROLE_LABELS[m.role] ?? m.role,
    });
  }

  return [...byId.values()].sort((a, b) => {
    const la = (a.fullName || a.email).toLocaleLowerCase("fr");
    const lb = (b.fullName || b.email).toLocaleLowerCase("fr");
    return la.localeCompare(lb, "fr");
  });
}

/** Vérifie que l'utilisateur fait partie de l'affaire (responsable dossier ou membre). */
export async function isUserOnAffaire(
  affaireId: string,
  userId: string
): Promise<boolean> {
  const [affaire] = await db
    .select({ responsableId: affaires.responsableId })
    .from(affaires)
    .where(eq(affaires.id, affaireId))
    .limit(1);
  if (!affaire) return false;
  if (affaire.responsableId === userId) return true;

  const [member] = await db
    .select({ userId: affaireMembres.userId })
    .from(affaireMembres)
    .where(
      and(
        eq(affaireMembres.affaireId, affaireId),
        eq(affaireMembres.userId, userId)
      )
    )
    .limit(1);

  return !!member;
}
