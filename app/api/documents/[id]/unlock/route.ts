import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth/profile";
import { releaseLock } from "@/lib/documents/locking";
import { logAction } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

/**
 * POST /api/documents/[id]/unlock
 *
 * Alias POST de `DELETE /api/documents/[id]/lock` — utile pour
 * `navigator.sendBeacon` qui ne supporte que POST. Comportement
 * identique : libère le verrou si — et seulement si — l'utilisateur
 * courant le détient.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    // sendBeacon ne lit pas la réponse, mais on garde la sémantique HTTP.
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const [doc] = await db
    .select({ affaireId: documents.affaireId })
    .from(documents)
    .where(eq(documents.id, params.id))
    .limit(1);
  if (!doc) {
    return NextResponse.json(
      { error: "Document introuvable." },
      { status: 404 }
    );
  }

  const released = await releaseLock(params.id, session.user.id);
  if (released) {
    await logAction({
      action: "document.verrou_libere",
      cabinetId: session.profile.cabinetId,
      affaireId: doc.affaireId,
      documentId: params.id,
      userId: session.user.id,
      metadata: { via: "beacon" },
    });
  }
  return NextResponse.json({ released });
}
