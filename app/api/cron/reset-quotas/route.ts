import { and, eq, inArray, sql } from "drizzle-orm";

import { getCurrentPeriode } from "@/lib/billing/period";
import { verifyCronSecret } from "@/lib/cron/auth";
import { db } from "@/lib/db/client";
import { plans, quotasIa, subscriptions, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = verifyCronSecret(req);
  if (denied) return denied;

  const periode = getCurrentPeriode();

  const rows = await db
    .select({
      userId: users.id,
      cabinetId: users.cabinetId,
      quotaIaParUser: plans.quotaIaParUser,
    })
    .from(users)
    .innerJoin(
      subscriptions,
      and(
        eq(subscriptions.cabinetId, users.cabinetId),
        inArray(subscriptions.statut, ["actif", "beta_gratuit"])
      )
    )
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(sql`${users.cabinetId} is not null`);

  let inserted = 0;
  for (const row of rows) {
    if (!row.cabinetId) continue;
    const result = await db
      .insert(quotasIa)
      .values({
        userId: row.userId,
        cabinetId: row.cabinetId,
        periodeDebut: periode.debut,
        periodeFin: periode.fin,
        quotaMensuel: row.quotaIaParUser,
        consomme: 0,
        depassementGratuitUtilise: false,
      })
      .onConflictDoNothing();
    if (result.length) inserted++;
  }

  return Response.json({
    periode,
    users_seen: rows.length,
    inserted,
  });
}
