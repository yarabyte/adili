import {
  isTitreProfessionnel,
  TITRES_AVEC_MAITRE,
} from "@/lib/constants/titres-professionnels";

const MAITRE_PREFIX = /^(maître|maitre)\s+/i;

/** Nom stocké sans préfixe honorifique (pour avocat / huissier). */
export function normalizeMemberFullName(
  fullName: string,
  titre: string | null | undefined
): string {
  const trimmed = fullName.trim();
  if (!trimmed) return trimmed;
  if (titre && isTitreProfessionnel(titre) && TITRES_AVEC_MAITRE.has(titre)) {
    return trimmed.replace(MAITRE_PREFIX, "").trim();
  }
  return trimmed;
}

/**
 * Nom affiché dans l'interface : « Maître … » si titre avocat ou huissier.
 */
export function formatMemberDisplayName(
  fullName: string | null | undefined,
  email: string | null | undefined,
  titre: string | null | undefined
): string {
  const base = fullName?.trim() || email?.split("@")[0] || "Membre";
  if (!titre || !isTitreProfessionnel(titre) || !TITRES_AVEC_MAITRE.has(titre)) {
    return base;
  }
  const stripped = base.replace(MAITRE_PREFIX, "").trim() || base;
  return `Maître ${stripped}`;
}

/** Prénom pour « Bonjour, … » — conserve Maître si applicable. */
export function formatDashboardGreetingName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return displayName;
  const hasMaitre = MAITRE_PREFIX.test(trimmed);
  const withoutPrefix = trimmed.replace(MAITRE_PREFIX, "").trim();
  const first = withoutPrefix.split(/\s+/)[0] ?? trimmed;
  return hasMaitre ? `Maître ${first}` : first;
}
