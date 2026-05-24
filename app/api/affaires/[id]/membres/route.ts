import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { affaireMembres, users } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth/profile";
import { authorize } from "@/lib/permissions/affaires";

export const dynamic = "force-dynamic";

/**
 * GET /api/affaires/[id]/membres — Liste des membres affectés à l'affaire,
 * jointe à la table `users` pour fournir nom/email. Accès réservé aux
 * utilisateurs ayant au moins le droit `affaire.voir`.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const ctx = await authorize(session, params.id, "affaire", "voir");
  if (!ctx) {
    return NextResponse.json(
      { error: "Affaire introuvable." },
      { status: 404 }
    );
  }

  const rows = await db
    .select({
      userId: affaireMembres.userId,
      role: affaireMembres.role,
      addedAt: affaireMembres.addedAt,
      user: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        cabinetRole: users.role,
      },
    })
    .from(affaireMembres)
    .innerJoin(users, eq(affaireMembres.userId, users.id))
    .where(eq(affaireMembres.affaireId, params.id))
    .orderBy(asc(affaireMembres.addedAt));

  return NextResponse.json({
    data: rows,
    canInviter:
      ctx.role === "responsable" || ctx.role === "admin_cabinet",
  });
}
