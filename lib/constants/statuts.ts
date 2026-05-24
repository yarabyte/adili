/**
 * Libellés FR + classes de couleur pour les statuts du module Affaires.
 * Utilisés dans les listes, badges et tableaux.
 */

export const STATUTS_AFFAIRE_LABEL = {
  ouvert: "Ouvert",
  en_cours: "En cours",
  en_delibere: "En délibéré",
  clos: "Clos",
  archive: "Archivé",
} as const;

export const STATUTS_AFFAIRE_COLOR: Record<
  keyof typeof STATUTS_AFFAIRE_LABEL,
  string
> = {
  ouvert: "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
  en_cours: "border-brand-justice/30 bg-brand-justice/10 text-brand-justice",
  en_delibere: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
  clos: "border-slate-400/30 bg-slate-500/10 text-slate-700 dark:text-slate-200",
  archive: "border-slate-300/30 bg-slate-300/10 text-slate-500",
};

export const STATUTS_DOCUMENT_LABEL = {
  brouillon: "Brouillon",
  en_revue: "En revue",
  valide: "Validé",
  rejete: "Rejeté",
  archive: "Archivé",
} as const;

export type StatutDocument = keyof typeof STATUTS_DOCUMENT_LABEL;

export const STATUTS_DOCUMENT_COLOR: Record<StatutDocument, string> = {
  brouillon:
    "border-brand-justice/20 bg-brand-parchment-dark/30 text-muted-foreground",
  en_revue:
    "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
  valide:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
  rejete: "border-destructive/30 bg-destructive/10 text-destructive",
  archive: "border-slate-300/30 bg-slate-300/10 text-slate-500",
};

export const CONFIDENTIALITE_LABEL = {
  standard: "Standard",
  sensible: "Sensible",
} as const;

export const ROLES_AFFAIRE_LABEL = {
  responsable: "Responsable",
  contributeur: "Contributeur",
  lecteur: "Lecteur",
} as const;
