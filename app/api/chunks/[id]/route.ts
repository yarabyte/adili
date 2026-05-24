import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getCurrentProfile } from "@/lib/auth/profile";
import { db } from "@/lib/db/client";
import { chunks, sources } from "@/lib/db/schema";

export const runtime = "nodejs";

/**
 * GET /api/chunks/:id
 * → renvoie le texte intégral d'un article du corpus, utilisé par
 *   l'inserter "Citation bloc" de l'éditeur TipTap (insertion d'un
 *   extrait verbatim avec barre latérale et label cliquable).
 *
 * Le corpus est public-pour-membres : tout utilisateur authentifié
 * peut consulter un chunk (idem que l'API /api/search).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return NextResponse.json(
      { error: "Vous devez être membre d'un cabinet pour accéder au corpus." },
      { status: 401 }
    );
  }

  const { id } = await params;

  const [row] = await db
    .select({
      chunkId: chunks.id,
      articleNumber: chunks.articleNumber,
      articleLabel: chunks.articleLabel,
      content: chunks.content,
      sourceId: sources.id,
      sourceTitle: sources.title,
      sourceShortCode: sources.shortCode,
    })
    .from(chunks)
    .innerJoin(sources, eq(chunks.sourceId, sources.id))
    .where(eq(chunks.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json(
      { error: "Article introuvable." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    chunkId: row.chunkId,
    articleNumber: row.articleNumber,
    articleLabel: row.articleLabel,
    content: row.content,
    source: {
      id: row.sourceId,
      title: row.sourceTitle,
      shortCode: row.sourceShortCode,
    },
  });
}
