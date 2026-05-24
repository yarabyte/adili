import { z } from "zod";

import { ALL_TYPES_DOCUMENTS } from "@/lib/constants/types-documents";

const TypeDocumentEnumValues = ALL_TYPES_DOCUMENTS as readonly string[];

export const CreateDocumentZ = z.object({
  affaireId: z.uuid("Affaire invalide."),
  typeDocument: z
    .string()
    .refine((v) => TypeDocumentEnumValues.includes(v), {
      message: "Type de document inconnu.",
    }),
  titre: z
    .string()
    .min(3, "Le titre doit comporter au moins 3 caractères.")
    .max(255),
});

export const SaveDocumentZ = z.object({
  contenuTiptap: z.unknown(),
  contenuText: z.string().max(500_000).default(""),
  /**
   * Demande un snapshot dans `document_versions` (trigger `manuel`).
   * `false` par défaut (les autosaves silencieuses ne créent pas de version).
   */
  createSnapshot: z.boolean().default(false),
});

export const RejectDocumentZ = z.object({
  raison: z.string().min(3, "Précisez le motif du rejet.").max(2000),
});

export type CreateDocumentInput = z.infer<typeof CreateDocumentZ>;
export type SaveDocumentInput = z.infer<typeof SaveDocumentZ>;
