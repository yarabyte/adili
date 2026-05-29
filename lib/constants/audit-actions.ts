/**
 * Catalogue exhaustif des actions tracées dans `audit_log`.
 * Cf. §7 du brief Module Affaires. Le champ `audit_log.action` est en TEXT
 * pour faciliter l'évolution, mais on valide via TypeScript à l'insertion.
 */

export const AUDIT_ACTIONS = {
  affaire: [
    "creee",
    "modifiee",
    "en_cours",
    "en_delibere",
    "archivee",
    "cloturee",
    "reouverte",
    "consultee",
    "membre_ajoute",
    "membre_retire",
    "role_change",
  ],
  document: [
    "cree",
    "edite",
    "sauvegarde",
    "verrou_pris",
    "verrou_libere",
    "soumis",
    "valide",
    "rejete",
    "reouvert",
    "exporte_docx",
    "exporte_pdf",
    "supprime",
  ],
  commentaire: ["ajoute", "modifie", "resolu", "supprime"],
  echeance: ["creee", "modifiee", "supprimee", "alerte_envoyee"],
  compte_rendu: [
    "cree",
    "edite",
    "finalise",
    "soumis",
    "valide",
    "rejete",
    "exporte_pdf",
    "structure_ia",
    "supprime",
    "confidentialite_changee",
  ],
} as const;

export type AuditEntity = keyof typeof AUDIT_ACTIONS;
export type AuditAction = {
  [E in AuditEntity]: `${E}.${(typeof AUDIT_ACTIONS)[E][number]}`;
}[AuditEntity];

/** Liste à plat des `entity.action` valides. */
export const ALL_AUDIT_ACTIONS: ReadonlyArray<AuditAction> = (
  Object.entries(AUDIT_ACTIONS).flatMap(([entity, actions]) =>
    actions.map((a) => `${entity}.${a}` as AuditAction)
  )
);

export function isAuditAction(v: unknown): v is AuditAction {
  return typeof v === "string" && (ALL_AUDIT_ACTIONS as ReadonlyArray<string>).includes(v);
}

/**
 * Libellés FR courts pour chaque action — utilisés dans la timeline
 * « Historique » de la page Affaire.
 */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  // affaire
  "affaire.creee": "Affaire créée",
  "affaire.modifiee": "Affaire mise à jour",
  "affaire.en_cours": "Affaire passée en cours",
  "affaire.en_delibere": "Affaire mise en délibéré",
  "affaire.archivee": "Affaire archivée",
  "affaire.cloturee": "Affaire clôturée",
  "affaire.reouverte": "Affaire rouverte",
  "affaire.consultee": "Affaire consultée",
  "affaire.membre_ajoute": "Membre ajouté",
  "affaire.membre_retire": "Membre retiré",
  "affaire.role_change": "Rôle d'un membre modifié",
  // document
  "document.cree": "Document créé",
  "document.edite": "Document édité",
  "document.sauvegarde": "Document sauvegardé",
  "document.verrou_pris": "Verrou pris sur le document",
  "document.verrou_libere": "Verrou libéré",
  "document.soumis": "Document soumis pour validation",
  "document.valide": "Document validé",
  "document.rejete": "Document rejeté",
  "document.reouvert": "Document rouvert en brouillon",
  "document.exporte_docx": "Document exporté (.docx)",
  "document.exporte_pdf": "Document exporté (.pdf)",
  "document.supprime": "Document supprimé",
  // commentaire
  "commentaire.ajoute": "Commentaire ajouté",
  "commentaire.modifie": "Commentaire modifié",
  "commentaire.resolu": "Commentaire résolu",
  "commentaire.supprime": "Commentaire supprimé",
  // echeance
  "echeance.creee": "Échéance créée",
  "echeance.modifiee": "Échéance modifiée",
  "echeance.supprimee": "Échéance supprimée",
  "echeance.alerte_envoyee": "Alerte d'échéance envoyée",
  // compte rendu
  "compte_rendu.cree": "Compte rendu créé",
  "compte_rendu.edite": "Compte rendu modifié",
  "compte_rendu.finalise": "Compte rendu finalisé",
  "compte_rendu.soumis": "Compte rendu soumis pour validation",
  "compte_rendu.valide": "Compte rendu validé",
  "compte_rendu.rejete": "Compte rendu rejeté",
  "compte_rendu.exporte_pdf": "Compte rendu exporté (.pdf)",
  "compte_rendu.structure_ia": "Compte rendu structuré par IA",
  "compte_rendu.supprime": "Compte rendu supprimé",
  "compte_rendu.confidentialite_changee": "Confidentialité du compte rendu modifiée",
};
