import { NextResponse } from "next/server";
import {
  and,
  desc,
  eq,
  exists,
  ilike,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  affaireMembres,
  affaires,
  cabinets,
  clients,
  users,
} from "@/lib/db/schema";
import { getCurrentProfile } from "@/lib/auth/profile";
import { ListAffairesQueryZ } from "@/lib/validation/affaires";

export const dynamic = "force-dynamic";

/**
 * GET /api/affaires
 *
 * Liste paginée des affaires du cabinet courant, filtrée selon les
 * permissions du module Affaires :
 *   - confidentialite='standard' → visible par tous les membres du cabinet.
 *   - confidentialite='sensible' → seulement si l'utilisateur est membre
 *     explicite (affaire_membres) ou admin_cabinet ET membre explicite.
 *
 * Filtres : q (intitulé / référence), statut, typeContentieux,
 * responsableId, clientId. Pagination : page (1-based), pageSize (≤100).
 */
export async function GET(request: Request) {
  const session = await getCurrentProfile();
  if (!session?.profile?.cabinetId) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  const cabinetId = session.profile.cabinetId;

  const url = new URL(request.url);
  const parsed = ListAffairesQueryZ.safeParse(
    Object.fromEntries(url.searchParams.entries())
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Paramètres invalides.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { q, statut, typeContentieux, responsableId, clientId, page, pageSize } =
    parsed.data;

  const [cabinetRow] = await db
    .select({ ownerId: cabinets.ownerId })
    .from(cabinets)
    .where(eq(cabinets.id, cabinetId))
    .limit(1);
  const isCabinetAdmin =
    session.profile.role === "admin" || cabinetRow?.ownerId === session.user.id;

  // Visibilité : standard OR (sensible ET membre explicite).
  const visibilityClause = isCabinetAdmin
    ? // admin : accès aux 'standard' (toutes) + 'sensible' uniquement si membre explicite
      or(
        eq(affaires.confidentialite, "standard"),
        exists(
          db
            .select({ x: sql`1` })
            .from(affaireMembres)
            .where(
              and(
                eq(affaireMembres.affaireId, affaires.id),
                eq(affaireMembres.userId, session.user.id)
              )
            )
        )
      )
    : // utilisateur non admin : accès aux 'standard' du cabinet + 'sensible' si membre
      or(
        eq(affaires.confidentialite, "standard"),
        exists(
          db
            .select({ x: sql`1` })
            .from(affaireMembres)
            .where(
              and(
                eq(affaireMembres.affaireId, affaires.id),
                eq(affaireMembres.userId, session.user.id)
              )
            )
        )
      );

  const filters = [eq(affaires.cabinetId, cabinetId), visibilityClause];
  if (statut) filters.push(eq(affaires.statut, statut));
  if (typeContentieux) filters.push(eq(affaires.typeContentieux, typeContentieux));
  if (responsableId) filters.push(eq(affaires.responsableId, responsableId));
  if (clientId) filters.push(eq(affaires.clientId, clientId));
  if (q && q.trim().length > 0) {
    const like = `%${q.trim()}%`;
    filters.push(or(ilike(affaires.intitule, like), ilike(affaires.reference, like))!);
  }

  const whereClause = and(...filters);
  const offset = (page - 1) * pageSize;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: affaires.id,
        reference: affaires.reference,
        intitule: affaires.intitule,
        typeContentieux: affaires.typeContentieux,
        juridiction: affaires.juridiction,
        statut: affaires.statut,
        confidentialite: affaires.confidentialite,
        dateOuverture: affaires.dateOuverture,
        updatedAt: affaires.updatedAt,
        client: {
          id: clients.id,
          nom: clients.nom,
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
      .where(whereClause)
      .orderBy(desc(affaires.updatedAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(affaires)
      .where(whereClause),
  ]);

  return NextResponse.json({
    data: rows,
    pagination: {
      page,
      pageSize,
      total: Number(total ?? 0),
      pageCount: Math.max(1, Math.ceil(Number(total ?? 0) / pageSize)),
    },
  });
}
