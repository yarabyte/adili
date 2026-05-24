/**
 * Typologie des comptes rendus OHADA — valeurs de `comptes_rendus.type_cr`.
 * Synchronisé avec le brief module CR (17 types).
 */

export const TYPES_CR = {
  audiences: {
    label: "Audiences",
    items: [
      "audience_plaidoirie",
      "audience_mise_en_etat",
      "audience_refere",
      "audience_delibere",
      "comparution",
    ],
  },
  clientele: {
    label: "Clientèle",
    items: ["rdv_client", "appel_telephonique", "visioconference"],
  },
  procedure: {
    label: "Procédure",
    items: ["reunion_expertise", "constat_huissier", "transport_lieux"],
  },
  negociation: {
    label: "Négociation",
    items: ["reunion_negociation", "mediation", "seance_arbitrage"],
  },
  vie_societaire: {
    label: "Vie sociétaire",
    items: ["assemblee_generale", "conseil_administration"],
  },
  interne: {
    label: "Interne cabinet",
    items: ["reunion_strategie", "note_interne"],
  },
} as const;

export const LABELS_CR: Record<string, string> = {
  audience_plaidoirie: "CR d'audience de plaidoirie",
  audience_mise_en_etat: "CR d'audience de mise en état",
  audience_refere: "CR d'audience en référé",
  audience_delibere: "CR d'audience de délibéré",
  comparution: "CR de comparution",
  rdv_client: "CR de rendez-vous client",
  appel_telephonique: "CR d'appel téléphonique",
  visioconference: "CR de visioconférence",
  reunion_expertise: "CR de réunion d'expertise judiciaire",
  constat_huissier: "CR de constat d'huissier",
  transport_lieux: "CR de transport sur les lieux",
  reunion_negociation: "CR de réunion de négociation",
  mediation: "CR de médiation",
  seance_arbitrage: "CR de séance d'arbitrage",
  assemblee_generale: "CR d'assemblée générale",
  conseil_administration: "CR de conseil d'administration",
  reunion_strategie: "CR de réunion de stratégie",
  note_interne: "Note interne au dossier",
};

/** Durée par défaut (minutes) selon le type d'événement. */
export const DUREE_DEFAUT_CR: Record<string, number> = {
  audience_plaidoirie: 120,
  audience_mise_en_etat: 90,
  audience_refere: 60,
  audience_delibere: 30,
  comparution: 60,
  rdv_client: 60,
  appel_telephonique: 15,
  visioconference: 45,
  reunion_expertise: 120,
  constat_huissier: 90,
  transport_lieux: 180,
  reunion_negociation: 90,
  mediation: 120,
  seance_arbitrage: 180,
  assemblee_generale: 180,
  conseil_administration: 120,
  reunion_strategie: 60,
  note_interne: 30,
};

/** Types pour lesquels la confidentialité renforcée est recommandée. */
export const TYPES_CR_CONFIDENTIELS = new Set([
  "reunion_negociation",
  "mediation",
  "seance_arbitrage",
]);

export const ALL_TYPES_CR = Object.values(TYPES_CR).flatMap((c) => c.items);

export type TypeCompteRendu = (typeof ALL_TYPES_CR)[number];

export function isTypeCompteRendu(v: string): v is TypeCompteRendu {
  return (ALL_TYPES_CR as readonly string[]).includes(v);
}

export function labelTypeCr(typeCr: string): string {
  return LABELS_CR[typeCr] ?? typeCr;
}

/** Titre auto : « {libellé court} — {date événement} » */
export function titreCompteRenduAuto(
  typeCr: string,
  dateEvenement: Date
): string {
  const label = labelTypeCr(typeCr);
  const dateStr = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(dateEvenement);
  return `${label} — ${dateStr}`;
}
