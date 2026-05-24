/**
 * Onglets fiche affaire — partagé serveur / client (pas de "use client").
 */
export const AFFAIRE_DETAIL_TAB_VALUES = [
  "documents",
  "comptes_rendus",
  "membres",
  "echeances",
  "historique",
] as const;

export type AffaireDetailTab = (typeof AFFAIRE_DETAIL_TAB_VALUES)[number];

export function parseAffaireTabParam(
  raw: string | null | undefined
): AffaireDetailTab {
  if (
    raw &&
    (AFFAIRE_DETAIL_TAB_VALUES as readonly string[]).includes(raw)
  ) {
    return raw as AffaireDetailTab;
  }
  return "documents";
}
