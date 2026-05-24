import { z } from "zod";

export const TYPES_ECHEANCE = [
  "audience",
  "depot",
  "signification",
  "delai_appel",
  "autre",
] as const;

export const TypeEcheanceZ = z.enum(TYPES_ECHEANCE);

export const CreateEcheanceZ = z.object({
  titre: z.string().trim().min(1, "Titre requis.").max(200),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v === "" || v == null ? null : v)),
  dateEcheance: z.string().min(1, "Date et heure requises."),
  type: TypeEcheanceZ.optional().nullable(),
  alerteJ7: z.boolean().optional().default(true),
  alerteJ2: z.boolean().optional().default(true),
  alerteJ1: z.boolean().optional().default(true),
  responsableId: z.uuid("Personne responsable invalide."),
});

export const UpdateEcheanceZ = CreateEcheanceZ.partial().extend({
  id: z.uuid("Identifiant invalide."),
});

export type CreateEcheanceInput = z.infer<typeof CreateEcheanceZ>;
export type UpdateEcheanceInput = z.infer<typeof UpdateEcheanceZ>;
