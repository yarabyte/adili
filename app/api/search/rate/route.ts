import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db/client";
import { searchRatings } from "@/lib/db/schema";

export const runtime = "nodejs";

const Body = z.object({
  chunkId: z.string().uuid(),
  query: z.string().min(3).max(500),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
  relevancePercent: z.number().int().min(0).max(100).optional(),
  position: z.number().int().min(1).max(50).optional(),
});

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

  const session = await getCurrentProfile();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  try {
    const meta = {
      relevancePercent: parsed.relevancePercent ?? null,
      position: parsed.position ?? null,
    };

    await db
      .insert(searchRatings)
      .values({
        userId: session.user.id,
        cabinetId: session.profile?.cabinetId ?? null,
        chunkId: parsed.chunkId,
        query: parsed.query,
        rating: parsed.rating,
        comment: parsed.comment ?? null,
        metadata: meta,
      })
      .onConflictDoUpdate({
        target: [
          searchRatings.userId,
          searchRatings.chunkId,
          searchRatings.query,
        ],
        set: {
          rating: parsed.rating,
          comment: parsed.comment ?? null,
          metadata: meta,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/search/rate]", err);
    return NextResponse.json(
      { error: "Erreur d'enregistrement de la note." },
      { status: 500 }
    );
  }
}
