import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { affaires, clients, users } from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth/profile";
import { authorize } from "@/lib/permissions/affaires";

export const dynamic = "force-dynamic";

/**
 * GET /api/affaires/[id] — Détail d'une affaire (avec client et responsable
 * dénormalisés). Les permissions du module sont vérifiées : on renvoie 404
 * pour ne pas divulguer l'existence d'une affaire non autorisée.
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

  const [row] = await db
    .select({
      id: affaires.id,
      reference: affaires.reference,
      intitule: affaires.intitule,
      typeContentieux: affaires.typeContentieux,
      juridiction: affaires.juridiction,
      adversaires: affaires.adversaires,
      dateOuverture: affaires.dateOuverture,
      statut: affaires.statut,
      confidentialite: affaires.confidentialite,
      responsableId: affaires.responsableId,
      createdAt: affaires.createdAt,
      updatedAt: affaires.updatedAt,
      client: {
        id: clients.id,
        nom: clients.nom,
        type: clients.type,
        contact: clients.contact,
      },
      responsable: {
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      },
    })
    .from(affaires)
    .innerJoin(clients, eq(affaires.clientId, clients.id))
    .innerJoin(users, eq(affaires.responsableId, users.id))
    .where(eq(affaires.id, params.id))
    .limit(1);

  if (!row) {
    return NextResponse.json(
      { error: "Affaire introuvable." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    data: row,
    permissions: {
      role: ctx.role,
      canModifier: ctx.role === "responsable" || ctx.role === "admin_cabinet",
      canSupprimer: ctx.role === "admin_cabinet",
      canInviter: ctx.role === "responsable" || ctx.role === "admin_cabinet",
    },
  });
}
