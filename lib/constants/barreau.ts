/** Valeur par défaut des champs « barreau » dans les formulaires. */
export const DEFAULT_BARREAU = "Barreau du Cameroun";

export function barreauFieldDefault(value?: string | null): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : DEFAULT_BARREAU;
}
