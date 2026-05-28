/** Textes nationaux camerounais — disponibles et feuille de route produit. */

export const CAMEROON_CORPUS_TARGET_LABEL = "30 juin 2026";

export type CameroonCorpusEntry = {
  title: string;
  /** Précision affichée sous le titre (fichier source, version, etc.). */
  detail?: string;
};

/** Indexés et consultables dans la recherche (manifeste national). */
export const CAMEROON_CORPUS_AVAILABLE: readonly CameroonCorpusEntry[] = [
  { title: "Code pénal", detail: "code-penal-cameroun.pdf" },
  { title: "Code de procédure pénale", detail: "code-de-procedure-penale-cameroun.pdf" },
  {
    title: "Code de procédure civile",
    detail: "code-civil-camerounais.pdf — procédure civile (pas le code civil matière)",
  },
  {
    title: "Loi régissant l'activité commerciale au Cameroun",
    detail: "loi-activite-commerciale.pdf — Loi n° 2015/018 du 21 décembre 2015",
  },
  {
    title: "Code du travail",
    detail: "loi-code-travail.pdf — Loi n° 92/007 du 14 août 1992",
  },
  {
    title: "Constitution de la République du Cameroun",
    detail:
      "constitutioncameroun.pdf — Loi n° 96/06 du 18 janvier 1996, modifiée par la loi n° 2008/001 du 14 avril 2008",
  },
  {
    title: "Code général des impôts",
    detail: "cgi.pdf — Version consolidée mise à jour au 1er janvier 2024",
  },
] as const;

/** Prochaines intégrations — objectif produit. */
export const CAMEROON_CORPUS_PLANNED: readonly CameroonCorpusEntry[] = [
  {
    title: "Code civil",
    detail: "Texte de droit civil matière, distinct du CPC",
  },
  {
    title: "Code de commerce national",
    detail: "Si texte distinct des actes uniformes OHADA",
  },
  {
    title: "Code de la famille / personnes",
    detail: "Si codification séparée du droit commun",
  },
  { title: "Code des investissements", detail: "CEMAC / Cameroun" },
  { title: "Loi sur la lutte contre la corruption", detail: "SIC, etc." },
  { title: "Loi sur la protection des données personnelles" },
  {
    title: "Code forestier / environnement",
    detail: "Selon pratique et sources officielles",
  },
  {
    title: "Code minier / hydrocarbures",
    detail: "Extraits ou codes complets selon disponibilité",
  },
] as const;

/** Nombre de textes « à venir » affichés avant le bouton Voir plus. */
export const CAMEROON_CORPUS_PLANNED_PREVIEW_COUNT = 3;

export function splitCameroonPlannedCorpus(): {
  preview: readonly CameroonCorpusEntry[];
  more: readonly CameroonCorpusEntry[];
} {
  const preview = CAMEROON_CORPUS_PLANNED.slice(0, CAMEROON_CORPUS_PLANNED_PREVIEW_COUNT);
  const more = CAMEROON_CORPUS_PLANNED.slice(CAMEROON_CORPUS_PLANNED_PREVIEW_COUNT);
  return { preview, more };
}

export function cameroonCorpusProgress(): {
  available: number;
  planned: number;
  total: number;
  pctAvailable: number;
} {
  const available = CAMEROON_CORPUS_AVAILABLE.length;
  const planned = CAMEROON_CORPUS_PLANNED.length;
  const total = available + planned;
  return {
    available,
    planned,
    total,
    pctAvailable: total > 0 ? Math.round((available / total) * 100) : 0,
  };
}
