import { z } from "zod";

import { requireAdminApi } from "@/lib/admin/require-admin-api";
import { jsonError, jsonOk } from "@/lib/api/json";
import { db } from "@/lib/db/client";
import { ecolesEtudiant } from "@/lib/db/schema";

const Body = z.object({
  nom: z.string().min(2).max(200),
  ville: z.string().max(120).optional(),
  ordreAffichage: z.number().int().optional(),
});

export async function POST(req: Request) {
  const auth = await requireAdminApi("etudiant_validation.decide", req);
  if (auth instanceof Response) return auth;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return jsonError("Données invalides", 400);
  }

  const [row] = await db
    .insert(ecolesEtudiant)
    .values({
      nom: body.nom.trim(),
      ville: body.ville?.trim() || null,
      ordreAffichage: body.ordreAffichage ?? 0,
      actif: true,
    })
    .returning();

  return jsonOk({ ecole: row });
}
