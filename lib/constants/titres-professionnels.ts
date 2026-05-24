/**
 * Titres professionnels des membres du cabinet (affichage + PDF).
 */
export const TITRES_PROFESSIONNELS = {
  avocat: "Avocat",
  huissier: "Huissier",
  juriste: "Juriste",
  notaire: "Notaire",
  greffier: "Greffier",
  magistrat: "Magistrat",
  collaborateur_juridique: "Collaborateur juridique",
  expert: "Expert",
  autre: "Autre",
} as const;

export type TitreProfessionnel = keyof typeof TITRES_PROFESSIONNELS;

export const ALL_TITRES_PROFESSIONNELS = Object.keys(
  TITRES_PROFESSIONNELS
) as TitreProfessionnel[];

/** Titres pour lesquels le nom s'affiche avec le préfixe « Maître ». */
export const TITRES_AVEC_MAITRE = new Set<TitreProfessionnel>([
  "avocat",
  "huissier",
]);

export function isTitreProfessionnel(v: string): v is TitreProfessionnel {
  return (ALL_TITRES_PROFESSIONNELS as readonly string[]).includes(v);
}

export function labelTitreProfessionnel(
  titre: string | null | undefined
): string | null {
  if (!titre || !isTitreProfessionnel(titre)) return null;
  return TITRES_PROFESSIONNELS[titre];
}
