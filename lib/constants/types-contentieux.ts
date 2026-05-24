/**
 * Types de contentieux OHADA — utilisés comme valeurs de la colonne
 * `affaires.type_contentieux`. Synchronisé avec le pg_enum
 * `type_contentieux` (cf. lib/db/sql/0007_module_affaires.sql).
 */
export const TYPES_CONTENTIEUX = [
  "commercial",
  "societes",
  "suretes",
  "recouvrement",
  "procedures_collectives",
  "arbitrage",
  "penal_affaires",
  "social",
  "fiscal",
  "bail_commercial",
  "transport",
  "propriete_intellectuelle",
  "autre",
] as const;

export type TypeContentieux = (typeof TYPES_CONTENTIEUX)[number];

export const LABELS_CONTENTIEUX: Record<TypeContentieux, string> = {
  commercial: "Commercial général",
  societes: "Droit des sociétés",
  suretes: "Sûretés",
  recouvrement: "Recouvrement",
  procedures_collectives: "Procédures collectives",
  arbitrage: "Arbitrage",
  penal_affaires: "Pénal des affaires",
  social: "Droit social",
  fiscal: "Fiscal",
  bail_commercial: "Bail commercial",
  transport: "Transport",
  propriete_intellectuelle: "Propriété intellectuelle",
  autre: "Autre",
};

export function isTypeContentieux(v: unknown): v is TypeContentieux {
  return typeof v === "string" && (TYPES_CONTENTIEUX as readonly string[]).includes(v);
}
