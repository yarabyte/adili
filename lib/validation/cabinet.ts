import { z } from "zod";

export const cabinetProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Le nom doit comporter au moins 2 caractères.")
    .max(120),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  registreCommerce: z.string().trim().max(80).optional().or(z.literal("")),
  niu: z.string().trim().max(40).optional().or(z.literal("")),
});

export type CabinetProfileInput = z.infer<typeof cabinetProfileSchema>;
