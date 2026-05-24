import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth/profile";
import { authorize } from "@/lib/permissions/affaires";
import {
  acquireLock,
  getCurrentLock,
  releaseLock,
} from "@/lib/documents/locking";
import { logAction } from "@/lib/audit/log";

export const dynamic = "force-dynamic";

/**
 * POST /api/documents/[id]/lock
 *
 *   Acquiert OU rafraîchit (heartbeat) le verrou d'édition pour
 *   l'utilisateur courant. Réponses :
 *     - 200 { status: "acquired", acquiredAt, refreshed, staleTakeover }
 *     - 423 { status: "locked", holder, since }   ← Locked
 *     - 403 (pas de droit `document.editer`)
 *     - 404 (document inconnu)
 *
 * DELETE /api/documents/[id]/lock
 *
 *   Libère le verrou. Idempotent : 200 même si l'utilisateur ne le
 *   détenait pas (mais ne supprime pas un verrou d'autrui).
 */

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
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

  const ctx = await authorize(session, doc.affaireId, "document", "editer");
  if (!ctx) {
    // On expose un état de verrou (lecture seule) mais on refuse d'écrire.
    const current = await getCurrentLock(params.id);
    return NextResponse.json(
      {
        error:
          "Vous n'avez pas le droit d'éditer ce document.",
        lock: current,
      },
      { status: 403 }
    );
  }

  const result = await acquireLock(params.id, session.user.id);
  if (!result) {
    return NextResponse.json(
      { error: "Document introuvable." },
      { status: 404 }
    );
  }

  if (result.status === "denied") {
    return NextResponse.json(
      {
        status: "locked",
        holder: result.holder,
        since: result.since.toISOString(),
      },
      { status: 423 } // Locked
    );
  }

  // Audit : on ne logue qu'à la prise initiale (pas à chaque heartbeat).
  if (!result.refreshed) {
    await logAction({
      action: "document.verrou_pris",
      cabinetId: ctx.cabinetId,
      affaireId: doc.affaireId,
      documentId: params.id,
      userId: session.user.id,
      metadata: result.staleTakeover ? { stale_takeover: true } : undefined,
    });
  }

  return NextResponse.json({
    status: "acquired",
    acquiredAt: result.acquiredAt.toISOString(),
    refreshed: result.refreshed,
    staleTakeover: result.staleTakeover,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
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
    // Log uniquement si on a effectivement relâché (évite le bruit).
    await logAction({
      action: "document.verrou_libere",
      cabinetId: session.profile.cabinetId,
      affaireId: doc.affaireId,
      documentId: params.id,
      userId: session.user.id,
    });
  }
  return NextResponse.json({ released });
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
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

  const ctx = await authorize(session, doc.affaireId, "document", "voir");
  if (!ctx) {
    return NextResponse.json(
      { error: "Document introuvable." },
      { status: 404 }
    );
  }

  const lock = await getCurrentLock(params.id);
  return NextResponse.json({ lock });
}
