/**
 * Catalogue exhaustif OHADA des types de documents juridiques produits dans
 * une affaire. Stocké en DB sous forme de clé snake_case (TEXT) dans
 * `documents.type_document`. L'enum Postgres correspondant
 * (`type_document`) est synchronisé dans la migration 0007_module_affaires.sql.
 */

export const TYPES_DOCUMENTS = {
  actes_introductifs: {
    label: "Actes introductifs",
    items: [
      "assignation",
      "requete_introductive",
      "plainte_simple",
      "plainte_constitution_pc",
      "citation_directe",
    ] as const,
  },
  ecritures: {
    label: "Écritures",
    items: [
      "conclusions_fond",
      "conclusions_incident",
      "conclusions_recapitulatives",
      "conclusions_replique",
      "conclusions_duplique",
      "memoire_defense",
      "memoire_demande",
      "memoire_intervention",
      "note_delibere",
    ] as const,
  },
  voies_recours: {
    label: "Voies de recours",
    items: [
      "appel",
      "pourvoi_ccja",
      "opposition",
      "tierce_opposition",
      "retractation",
    ] as const,
  },
  procedures_specifiques: {
    label: "Procédures spécifiques",
    items: [
      "sommation",
      "mise_en_demeure",
      "sommation_interpellative",
      "requete_injonction_payer",
      "requete_saisie",
    ] as const,
  },
  procedures_collectives: {
    label: "Procédures collectives",
    items: [
      "declaration_creance",
      "requete_redressement",
      "requete_liquidation",
    ] as const,
  },
  societes: {
    label: "Sociétés",
    items: ["pv_ag", "statuts", "pv_ca", "pacte_actionnaires"] as const,
  },
  correspondance: {
    label: "Correspondance",
    items: [
      "lettre_officielle",
      "courrier_confraternel",
      "note_client",
    ] as const,
  },
  pieces: {
    label: "Pièces & annexes",
    items: ["bordereau_pieces", "conclusions_incident_pieces"] as const,
  },
} as const;

type Categories = keyof typeof TYPES_DOCUMENTS;
type ItemsOf<C extends Categories> = (typeof TYPES_DOCUMENTS)[C]["items"][number];
export type TypeDocument = { [C in Categories]: ItemsOf<C> }[Categories];

export const ALL_TYPES_DOCUMENTS: ReadonlyArray<TypeDocument> = (
  Object.values(TYPES_DOCUMENTS).flatMap((g) => g.items) as ReadonlyArray<TypeDocument>
);

/** Libellés FR pour chaque clé snake_case → utilisés dans les selects UI. */
export const LABELS_DOCUMENTS: Record<TypeDocument, string> = {
  // Actes introductifs
  assignation: "Assignation",
  requete_introductive: "Requête introductive",
  plainte_simple: "Plainte simple",
  plainte_constitution_pc: "Plainte avec constitution de partie civile",
  citation_directe: "Citation directe",

  // Écritures
  conclusions_fond: "Conclusions au fond",
  conclusions_incident: "Conclusions sur incident",
  conclusions_recapitulatives: "Conclusions récapitulatives",
  conclusions_replique: "Conclusions en réplique",
  conclusions_duplique: "Conclusions en duplique",
  memoire_defense: "Mémoire en défense",
  memoire_demande: "Mémoire en demande",
  memoire_intervention: "Mémoire en intervention",
  note_delibere: "Note en délibéré",

  // Voies de recours
  appel: "Appel",
  pourvoi_ccja: "Pourvoi en cassation CCJA",
  opposition: "Opposition",
  tierce_opposition: "Tierce opposition",
  retractation: "Rétractation",

  // Procédures spécifiques
  sommation: "Sommation",
  mise_en_demeure: "Mise en demeure",
  sommation_interpellative: "Sommation interpellative",
  requete_injonction_payer: "Requête en injonction de payer",
  requete_saisie: "Requête de saisie",

  // Procédures collectives
  declaration_creance: "Déclaration de créance",
  requete_redressement: "Requête en redressement",
  requete_liquidation: "Requête en liquidation",

  // Sociétés
  pv_ag: "PV d'assemblée générale",
  statuts: "Statuts",
  pv_ca: "PV de conseil d'administration",
  pacte_actionnaires: "Pacte d'actionnaires",

  // Correspondance
  lettre_officielle: "Lettre officielle",
  courrier_confraternel: "Courrier confraternel",
  note_client: "Note au client",

  // Pièces & annexes
  bordereau_pieces: "Bordereau de pièces",
  conclusions_incident_pieces: "Conclusions sur incident de pièces",
};

export function isTypeDocument(v: unknown): v is TypeDocument {
  return typeof v === "string" && (ALL_TYPES_DOCUMENTS as ReadonlyArray<string>).includes(v);
}
