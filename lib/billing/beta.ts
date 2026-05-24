import { addMonths } from "date-fns";
import { and, count, eq, gt, isNull, or } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { candidaturesBeta, subscriptions } from "@/lib/db/schema";

/** Places maximum — programme avocats pionniers (12 mois gratuits). */
export const BETA_MAX_PLACES = 25;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function betaSubscriptionWhere(now: Date) {
  return and(
    or(
      eq(subscriptions.statut, "beta_gratuit"),
      eq(subscriptions.estBeta, true)
    ),
    gt(subscriptions.dateFin, now),
    or(isNull(subscriptions.dateFinBeta), gt(subscriptions.dateFinBeta, now))
  );
}

/**
 * Places beta consommées = abonnements beta encore valides (source de vérité),
 * pas seulement les candidatures marquées « acceptée » (un cabinet peut être beta
 * sans ligne candidature à jour).
 */
export async function countBetaPlacesUsed(): Promise<number> {
  const now = new Date();
  const [row] = await db
    .select({ n: count() })
    .from(subscriptions)
    .where(betaSubscriptionWhere(now));
  return Number(row?.n ?? 0);
}

export async function acceptBetaCandidature(
  tx: Tx,
  candidatureId: string,
  cabinetId: string
): Promise<void> {
  const now = new Date();
  const [row] = await tx
    .select({ n: count() })
    .from(subscriptions)
    .where(betaSubscriptionWhere(now));
  const used = Number(row?.n ?? 0);
  if (used >= BETA_MAX_PLACES) {
    throw new Error(`Programme beta complet (${BETA_MAX_PLACES} places).`);
  }

  const fin = addMonths(now, 12);

  await tx
    .update(candidaturesBeta)
    .set({ statut: "acceptee", updatedAt: now })
    .where(eq(candidaturesBeta.id, candidatureId));

  await tx.insert(subscriptions).values({
    cabinetId,
    planId: "individuel",
    statut: "beta_gratuit",
    cycle: "mensuel",
    dateDebut: now,
    dateFin: fin,
    estBeta: true,
    dateFinBeta: fin,
  });
}
