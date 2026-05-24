import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { affaireMembres, affaires, cabinets } from "@/lib/db/schema";
import type { CurrentProfile } from "@/lib/auth/profile";

/**
 * Permissions du module Affaires (cf. §4 du brief).
 *
 * Rôle effectif d'un user sur une affaire :
 *   - `responsable` / `contributeur` / `lecteur` : appartenance explicite
 *     via `affaire_membres`.
 *   - `admin_cabinet` (virtuel) : utilisateur avec `users.role='admin'`
 *     ou propriétaire du cabinet (`cabinets.owner_id`). Accès implicite
 *     aux affaires `confidentialite='standard'` ; pour les affaires
 *     `sensible`, l'appartenance explicite reste requise.
 *   - `null` : aucun droit (refus).
 *
 * Priorité : si l'utilisateur est admin ET membre explicite, on prend
 * `admin_cabinet` (rôle le plus permissif).
 */

export type RoleAffaire = "responsable" | "contributeur" | "lecteur";
export type RoleEffectif = RoleAffaire | "admin_cabinet";

export type ResourceAffaires = keyof typeof PERMS;
export type ActionFor<R extends ResourceAffaires> = keyof (typeof PERMS)[R];

// ─── Matrice ──────────────────────────────────────────────────────
const PERMS = {
  affaire: {
    voir: ["responsable", "contributeur", "lecteur", "admin_cabinet"],
    modifier: ["responsable", "admin_cabinet"],
    supprimer: ["admin_cabinet"],
    inviter: ["responsable", "admin_cabinet"],
  },
  document: {
    voir: ["responsable", "contributeur", "lecteur", "admin_cabinet"],
    creer: ["responsable", "contributeur", "admin_cabinet"],
    editer: ["responsable", "contributeur", "admin_cabinet"],
    soumettre: ["responsable", "contributeur", "admin_cabinet"],
    valider: ["admin_cabinet"],
    rejeter: ["admin_cabinet"],
    rouvrir: ["admin_cabinet"],
    supprimer: ["admin_cabinet"],
    commenter: ["responsable", "contributeur", "lecteur", "admin_cabinet"],
  },
  echeance: {
    creer: ["responsable", "contributeur", "admin_cabinet"],
    modifier: ["responsable", "admin_cabinet"],
    supprimer: ["responsable", "admin_cabinet"],
  },
  compte_rendu: {
    voir: ["responsable", "contributeur", "lecteur", "admin_cabinet"],
    creer: ["responsable", "contributeur", "admin_cabinet"],
    modifier: ["responsable", "contributeur", "admin_cabinet"],
    finaliser: ["responsable", "contributeur", "admin_cabinet"],
    soumettre: ["responsable", "contributeur", "admin_cabinet"],
    valider: ["admin_cabinet"],
    rejeter: ["admin_cabinet"],
    supprimer: ["admin_cabinet"],
    commenter: ["responsable", "contributeur", "lecteur", "admin_cabinet"],
  },
} as const satisfies Record<string, Record<string, readonly RoleEffectif[]>>;

// ─── Rôle effectif (1 requête, jointures incluses) ────────────────
export type AffaireContext = {
  affaireId: string;
  cabinetId: string;
  confidentialite: "standard" | "sensible";
  responsableId: string;
  role: RoleEffectif | null;
};

export async function getEffectiveRole(
  session: CurrentProfile,
  affaireId: string
): Promise<AffaireContext | null> {
  const [row] = await db
    .select({
      cabinetId: affaires.cabinetId,
      confidentialite: affaires.confidentialite,
      responsableId: affaires.responsableId,
      ownerId: cabinets.ownerId,
      memberRole: affaireMembres.role,
    })
    .from(affaires)
    .innerJoin(cabinets, eq(affaires.cabinetId, cabinets.id))
    .leftJoin(
      affaireMembres,
      and(
        eq(affaireMembres.affaireId, affaires.id),
        eq(affaireMembres.userId, session.user.id)
      )
    )
    .where(eq(affaires.id, affaireId))
    .limit(1);

  if (!row) return null;
  if (row.cabinetId !== session.profile?.cabinetId) return null;

  const isCabinetAdmin =
    session.profile?.role === "admin" || row.ownerId === session.user.id;

  let role: RoleEffectif | null = null;
  if (isCabinetAdmin) {
    if (row.confidentialite === "standard" || row.memberRole) {
      role = "admin_cabinet";
    }
  } else if (row.memberRole) {
    role = row.memberRole as RoleAffaire;
  }

  return {
    affaireId,
    cabinetId: row.cabinetId,
    confidentialite: row.confidentialite,
    responsableId: row.responsableId,
    role,
  };
}

// ─── Helpers de check ─────────────────────────────────────────────
export function hasPermission<R extends ResourceAffaires>(
  role: RoleEffectif | null,
  resource: R,
  action: ActionFor<R>
): boolean {
  if (!role) return false;
  const allowed = PERMS[resource][action] as readonly RoleEffectif[];
  return allowed.includes(role);
}

/**
 * Combine `getEffectiveRole` + `hasPermission`. Renvoie le contexte
 * (avec rôle) si l'action est autorisée, `null` sinon.
 */
export async function authorize<R extends ResourceAffaires>(
  session: CurrentProfile,
  affaireId: string,
  resource: R,
  action: ActionFor<R>
): Promise<AffaireContext | null> {
  const ctx = await getEffectiveRole(session, affaireId);
  if (!ctx) return null;
  if (!hasPermission(ctx.role, resource, action)) return null;
  return ctx;
}
