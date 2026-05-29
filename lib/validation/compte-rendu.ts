import { z } from "zod";

import { ALL_TYPES_CR } from "@/lib/constants/types-comptes-rendus";

const TypeCrZ = z
  .string()
  .refine((v) => (ALL_TYPES_CR as readonly string[]).includes(v), {
    message: "Type de compte rendu inconnu.",
  });

export const QUALITES_PARTICIPANT = [
  "juge",
  "greffier",
  "avocat",
  "client",
  "partie_adverse",
  "temoin",
  "expert",
  "huissier",
  "notaire",
  "mediateur",
  "arbitre",
  "collaborateur_cabinet",
  "autre",
] as const;

export const PARTIES_PARTICIPANT = [
  "demandeur",
  "defendeur",
  "intervenant",
  "neutre",
] as const;

export const ParticipantZ = z.object({
  nom: z.string().trim().min(1, "Nom requis.").max(100),
  qualite: z.enum(QUALITES_PARTICIPANT),
  partie: z.enum(PARTIES_PARTICIPANT).optional(),
});

export const DecisionActionZ = z.object({
  id: z.string().uuid(),
  type: z.enum(["decision", "action"]),
  texte: z.string().trim().min(1).max(500),
  deadline: z.string().datetime().optional(),
  responsable_id: z.uuid().optional(),
  fait: z.boolean().default(false),
  rappelActif: z.boolean().default(false),
  fait_at: z.string().datetime().optional(),
});

export const PieceRemiseZ = z.object({
  nom: z.string().trim().min(1).max(200),
  sens: z.enum(["recue", "remise"]),
  partie: z.string().max(200).optional(),
  numero: z.string().max(100).optional(),
});

export const EMPTY_TIPTAP_DOC = {
  type: "doc",
  content: [{ type: "paragraph" }],
} as const;

export const CreateCompteRenduZ = z.object({
  affaireId: z.uuid("Affaire invalide."),
  typeCr: TypeCrZ,
  titre: z.string().trim().min(3).max(200).optional(),
  dateEvenement: z.string().min(1, "Date de l'événement requise."),
  dureeMinutes: z.number().int().min(1).max(1440).optional().nullable(),
  lieu: z.string().trim().max(200).optional().nullable(),
  participants: z.array(ParticipantZ).max(50).default([]),
  corpsTiptap: z.record(z.string(), z.unknown()).optional(),
  decisionsActions: z.array(DecisionActionZ).max(100).default([]),
  piecesRemises: z.array(PieceRemiseZ).max(50).default([]),
  soumisValidation: z.boolean().default(false),
  confidentialite: z.enum(["standard", "sensible"]).default("standard"),
});

export const UpdateCompteRenduZ = CreateCompteRenduZ.partial().extend({
  id: z.uuid("Identifiant invalide."),
});

export const SaveCompteRenduCorpsZ = z.object({
  corpsTiptap: z.unknown(),
  corpsText: z.string().max(500_000).default(""),
  participants: z.array(ParticipantZ).max(50).optional(),
  decisionsActions: z.array(DecisionActionZ).max(100).optional(),
  piecesRemises: z.array(PieceRemiseZ).max(50).optional(),
  dureeMinutes: z.number().int().min(1).max(1440).optional().nullable(),
  lieu: z.string().trim().max(200).optional().nullable(),
  dateEvenement: z.string().optional(),
  createSnapshot: z.boolean().default(false),
});

export const RejectCompteRenduZ = z.object({
  raison: z.string().min(3, "Précisez le motif du rejet.").max(2000),
});

export const CRIAStructurerZ = z.object({
  notesBrutes: z
    .string()
    .trim()
    .min(10, "Notes trop courtes (10 caractères min.).")
    .max(3000),
  typeCr: TypeCrZ,
  participants: z
    .array(
      z.object({
        nom: z.string(),
        qualite: z.string(),
      })
    )
    .max(20)
    .default([]),
  langue: z.enum(["fr", "en"]).default("fr"),
});

export type Participant = z.infer<typeof ParticipantZ>;
export type DecisionAction = z.infer<typeof DecisionActionZ>;
export type PieceRemise = z.infer<typeof PieceRemiseZ>;
export type CreateCompteRenduInput = z.infer<typeof CreateCompteRenduZ>;
export type UpdateCompteRenduInput = z.infer<typeof UpdateCompteRenduZ>;
export type SaveCompteRenduCorpsInput = z.infer<typeof SaveCompteRenduCorpsZ>;
export type CRIAStructurerInput = z.infer<typeof CRIAStructurerZ>;
