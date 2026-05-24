import { z } from "zod";

import { TYPES_CONTENTIEUX } from "@/lib/constants/types-contentieux";

// ─── Énumérations ─────────────────────────────────────────────────
export const TypeContentieuxZ = z.enum([...TYPES_CONTENTIEUX] as [
  (typeof TYPES_CONTENTIEUX)[number],
  ...(typeof TYPES_CONTENTIEUX)[number][]
]);

export const TypeClientZ = z.enum(["personne_physique", "personne_morale"]);

export const ConfidentialiteZ = z.enum(["standard", "sensible"]);

export const StatutAffaireZ = z.enum([
  "ouvert",
  "en_cours",
  "en_delibere",
  "clos",
  "archive",
]);

export const RoleAffaireZ = z.enum(["responsable", "contributeur", "lecteur"]);

// ─── Sub-schemas ──────────────────────────────────────────────────
const AdversaireZ = z.object({
  nom: z.string().min(1).max(255),
  qualite: z.string().max(120).optional().nullable(),
  conseil: z.string().max(255).optional().nullable(),
});

const ContactClientZ = z
  .object({
    email: z.email().optional().nullable(),
    tel: z.string().max(40).optional().nullable(),
    adresse: z.string().max(500).optional().nullable(),
    rccm: z.string().max(60).optional().nullable(),
    nif: z.string().max(60).optional().nullable(),
  })
  .partial();

// ─── Clients ──────────────────────────────────────────────────────
export const CreateClientZ = z.object({
  nom: z.string().min(2, "Nom requis (2 caractères min).").max(255),
  type: TypeClientZ.optional(),
  contact: ContactClientZ.optional(),
});

export const UpdateClientZ = CreateClientZ.partial();

export type CreateClientInput = z.infer<typeof CreateClientZ>;
export type UpdateClientInput = z.infer<typeof UpdateClientZ>;

// ─── Affaires ─────────────────────────────────────────────────────
export const CreateAffaireZ = z.object({
  reference: z
    .string()
    .trim()
    .max(40)
    .regex(/^[A-Za-z0-9_\-\/]+$/u, "Référence invalide.")
    .optional()
    .or(z.literal("")),
  intitule: z
    .string()
    .min(3, "L'intitulé doit comporter au moins 3 caractères.")
    .max(255),
  typeContentieux: TypeContentieuxZ,
  juridiction: z.string().max(255).optional().nullable(),
  clientId: z.uuid("Client invalide."),
  adversaires: z.array(AdversaireZ).max(50).optional(),
  dateOuverture: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, "Date d'ouverture invalide (YYYY-MM-DD).")
    .optional(),
  confidentialite: ConfidentialiteZ.optional(),
  responsableId: z.uuid("Responsable invalide."),
});

export const UpdateAffaireZ = z
  .object({
    intitule: z.string().min(3).max(255).optional(),
    typeContentieux: TypeContentieuxZ.optional(),
    juridiction: z.string().max(255).nullable().optional(),
    clientId: z.uuid().optional(),
    adversaires: z.array(AdversaireZ).max(50).optional(),
    statut: StatutAffaireZ.optional(),
    confidentialite: ConfidentialiteZ.optional(),
    responsableId: z.uuid().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Aucun champ à mettre à jour.",
  });

export type CreateAffaireInput = z.infer<typeof CreateAffaireZ>;
export type UpdateAffaireInput = z.infer<typeof UpdateAffaireZ>;

// ─── Membres ──────────────────────────────────────────────────────
export const AddAffaireMembreZ = z.object({
  userId: z.uuid("Utilisateur invalide."),
  role: RoleAffaireZ,
});

export const UpdateAffaireMembreZ = z.object({
  userId: z.uuid(),
  role: RoleAffaireZ,
});

export type AddAffaireMembreInput = z.infer<typeof AddAffaireMembreZ>;

// ─── Filtres de liste (API GET) ───────────────────────────────────
export const ListAffairesQueryZ = z.object({
  q: z.string().max(120).optional(),
  statut: StatutAffaireZ.optional(),
  typeContentieux: TypeContentieuxZ.optional(),
  responsableId: z.uuid().optional(),
  clientId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListAffairesQuery = z.infer<typeof ListAffairesQueryZ>;
