import "server-only";

import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { affaireMembres, affaires, auditLog, cabinets } from "@/lib/db/schema";
import { toDate } from "@/lib/datetime";
import { logAction } from "@/lib/audit/log";
import type { CurrentProfile } from "@/lib/auth/profile";

export type RecentAffaireItem = {
  id: string;
  reference: string;
  intitule: string;
  lastViewedAt: Date;
};

/** Enregistre une ouverture de fiche affaire (best-effort). */
export async function recordAffaireView(
  session: CurrentProfile,
  affaireId: string,
  cabinetId: string
): Promise<void> {
  await logAction({
    action: "affaire.consultee",
    cabinetId,
    affaireId,
    userId: session.user.id,
  });
}

/** IDs accessibles en une requête (évite N appels getEffectiveRole). */
async function accessibleAffaireIds(
  session: CurrentProfile,
  affaireIds: string[]
): Promise<Set<string>> {
  const cabinetId = session.profile?.cabinetId;
  if (!cabinetId || affaireIds.length === 0) return new Set();

  const rows = await db
    .select({
      id: affaires.id,
      confidentialite: affaires.confidentialite,
      ownerId: cabinets.ownerId,
      memberRole: affaireMembres.role,
    })
    .from(affaires)
    .innerJoin(cabinets, eq(affaires.cabinetId, cabinets.id))
    .leftJoin(
      affaireMembres,
      and(
        eq(affaireMembres.affaireId, affaires.id),
        eq(affaireMembres.userId, session.user.id)
      )
    )
    .where(
      and(eq(affaires.cabinetId, cabinetId), inArray(affaires.id, affaireIds))
    );

  const isAdminRole = session.profile?.role === "admin";
  const allowed = new Set<string>();

  for (const row of rows) {
    const isCabinetAdmin =
      isAdminRole || row.ownerId === session.user.id;
    if (isCabinetAdmin) {
      if (row.confidentialite === "standard" || row.memberRole) {
        allowed.add(row.id);
      }
    } else if (row.memberRole) {
      allowed.add(row.id);
    }
  }

  return allowed;
}

/**
 * Les 3 affaires consultées le plus récemment par l'utilisateur, parmi celles
 * auxquelles il a encore accès.
 */
export async function getRecentAffairesOpened(
  session: CurrentProfile,
  limit = 3
): Promise<RecentAffaireItem[]> {
  const cabinetId = session.profile?.cabinetId;
  const userId = session.user.id;
  if (!cabinetId) return [];

  const recentByAffaire = await db
    .select({
      affaireId: auditLog.affaireId,
      lastViewedAt: sql<Date>`max(${auditLog.createdAt})`.as("last_viewed_at"),
    })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.userId, userId),
        eq(auditLog.action, "affaire.consultee"),
        isNotNull(auditLog.affaireId)
      )
    )
    .groupBy(auditLog.affaireId)
    .orderBy(desc(sql`max(${auditLog.createdAt})`))
    .limit(Math.max(limit * 2, 6));

  const affaireIds = recentByAffaire
    .map((r) => r.affaireId)
    .filter((id): id is string => id != null);

  if (affaireIds.length === 0) return [];

  const [allowed, rows] = await Promise.all([
    accessibleAffaireIds(session, affaireIds),
    db
      .select({
        id: affaires.id,
        reference: affaires.reference,
        intitule: affaires.intitule,
      })
      .from(affaires)
      .where(
        and(eq(affaires.cabinetId, cabinetId), inArray(affaires.id, affaireIds))
      ),
  ]);

  const rowById = new Map(rows.map((r) => [r.id, r]));
  const out: RecentAffaireItem[] = [];

  for (const { affaireId, lastViewedAt } of recentByAffaire) {
    if (!affaireId || out.length >= limit) break;
    if (!allowed.has(affaireId)) continue;
    const row = rowById.get(affaireId);
    if (!row) continue;

    const viewedAt = toDate(lastViewedAt);
    if (!viewedAt) continue;

    out.push({
      id: row.id,
      reference: row.reference,
      intitule: row.intitule,
      lastViewedAt: viewedAt,
    });
  }

  return out;
}
