import { count, eq } from "drizzle-orm";
import { z } from "zod";

import { jsonError, jsonOk } from "@/lib/api/json";
import { BETA_MAX_PLACES, countBetaPlacesUsed } from "@/lib/billing/beta";
import { db } from "@/lib/db/client";
import { candidaturesBeta } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const Body = z.object({
  nom: z.string().min(2).max(120),
  email: z.string().email(),
  telephone: z.string().max(30).optional(),
  barreau: z.string().max(120).optional(),
  anneesExperience: z.coerce.number().int().min(0).max(60).optional(),
  typePratique: z.string().max(80).optional(),
  dossiersActifs: z.coerce.number().int().min(0).optional(),
  motivation: z.string().min(50).max(2000),
});

export async function POST(req: Request) {
  const used = await countBetaPlacesUsed();
  if (used >= BETA_MAX_PLACES) {
    return jsonError(
      `Le programme est complet (${BETA_MAX_PLACES} avocats pionniers).`,
      409
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return jsonError("Formulaire invalide", 400);
  }

  const [dup] = await db
    .select({ n: count() })
    .from(candidaturesBeta)
    .where(eq(candidaturesBeta.email, body.email.toLowerCase()));

  if (Number(dup?.n ?? 0) > 0) {
    return jsonError("Une candidature existe déjà pour cet email.", 409);
  }

  const [row] = await db
    .insert(candidaturesBeta)
    .values({
      nom: body.nom,
      email: body.email.toLowerCase(),
      telephone: body.telephone,
      barreau: body.barreau,
      anneesExperience: body.anneesExperience,
      typePratique: body.typePratique,
      dossiersActifs: body.dossiersActifs,
      motivation: body.motivation,
      statut: "en_revue",
    })
    .returning({ id: candidaturesBeta.id });

  const remaining = BETA_MAX_PLACES - used - 1;
  return jsonOk({ id: row.id, placesRestantes: Math.max(0, remaining) });
}

export async function GET() {
  const used = await countBetaPlacesUsed();
  return jsonOk({
    max: BETA_MAX_PLACES,
    used,
    remaining: Math.max(0, BETA_MAX_PLACES - used),
  });
}
