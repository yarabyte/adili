import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db/client";
import { searches } from "@/lib/db/schema";
import { searchChunks } from "@/lib/search";

export const runtime = "nodejs";

const Body = z.object({
  query: z.string().min(3).max(500),
  limit: z.number().int().min(1).max(15).optional(),
});

async function logSearch(query: string, resultsCount: number): Promise<void> {
  try {
    const session = await getCurrentProfile();
    if (!session?.profile) return;
    await db.insert(searches).values({
      userId: session.profile.id,
      query,
      resultsCount,
    });
  } catch (err) {
    console.error("[/api/search] log searches failed", err);
  }
}

export async function POST(req: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Requête invalide", details: String(err) },
      { status: 400 }
    );
  }

  try {
    const hits = await searchChunks(parsed.query, parsed.limit ?? 5);
    // Best-effort : on log pour l'activité récente sans bloquer la réponse en cas d'échec.
    await logSearch(parsed.query, hits.length);
    return NextResponse.json({ hits });
  } catch (err) {
    console.error("[/api/search] ", err);
    return NextResponse.json(
      { error: "Erreur recherche" },
      { status: 500 }
    );
  }
}
