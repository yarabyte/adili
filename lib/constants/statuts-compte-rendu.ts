export const STATUTS_CR_LABEL = {
  brouillon: "Brouillon",
  finalise: "Finalisé",
  en_revue: "En revue",
  valide: "Validé",
  rejete: "Rejeté",
} as const;

export type StatutCompteRendu = keyof typeof STATUTS_CR_LABEL;

export const STATUTS_CR_COLOR: Record<StatutCompteRendu, string> = {
  brouillon:
    "border-brand-justice/20 bg-brand-parchment-dark/30 text-muted-foreground",
  finalise:
    "border-slate-400/30 bg-slate-500/10 text-slate-700 dark:text-slate-200",
  en_revue:
    "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
  valide:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
  rejete:
    "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200",
};
