export const PACK_IA_100 = {
  type: "requetes_ia_100",
  quantite: 100,
  prixFcfa: 5000,
  validiteJours: 30,
} as const;

export const ACTIVE_SUBSCRIPTION_STATUTS = [
  "actif",
  "beta_gratuit",
] as const;

export const SUBSCRIPTION_PENDING = "en_attente_paiement";
