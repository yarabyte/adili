import type { RoleEffectif } from "@/lib/permissions/affaires";

/**
 * Matrice permissions comptes rendus (cf. brief §10).
 * `admin_cabinet` = rôle effectif issu de getEffectiveRole.
 */
const PERMS_CR = {
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

export type ResourceCompteRendu = keyof typeof PERMS_CR;
export type ActionCompteRendu<R extends ResourceCompteRendu> =
  keyof (typeof PERMS_CR)[R];

export function hasCompteRenduPermission<
  R extends ResourceCompteRendu,
  A extends ActionCompteRendu<R>,
>(role: RoleEffectif | null, resource: R, action: A): boolean {
  if (!role) return false;
  return (PERMS_CR[resource][action] as readonly RoleEffectif[]).includes(role);
}

/** Détail d'un CR sensible : auteur, responsable affaire ou admin cabinet. */
export function canViewCompteRenduDetail(opts: {
  confidentialite: "standard" | "sensible";
  auteurId: string;
  affaireResponsableId: string;
  userId: string;
  role: RoleEffectif | null;
}): boolean {
  if (opts.confidentialite === "standard") return true;
  if (opts.userId === opts.auteurId) return true;
  if (opts.userId === opts.affaireResponsableId) return true;
  return opts.role === "admin_cabinet";
}
