import { addMonths } from "date-fns";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { plans, subscriptions } from "@/lib/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function activateSubscription(
  tx: Tx,
  subscriptionId: string
): Promise<typeof subscriptions.$inferSelect> {
  const [sub] = await tx
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  if (!sub) throw new Error("Abonnement introuvable");

  const [plan] = await tx
    .select()
    .from(plans)
    .where(eq(plans.id, sub.planId))
    .limit(1);

  if (!plan) throw new Error("Plan introuvable");

  const now = new Date();
  const months = sub.cycle === "annuel" ? 12 : 1;
  const dateFin = addMonths(now, months);

  const [updated] = await tx
    .update(subscriptions)
    .set({
      statut: "actif",
      estBeta: false,
      dateFinBeta: null,
      dateDebut: now,
      dateFin,
      dateRenouvellement: dateFin,
      updatedAt: now,
    })
    .where(eq(subscriptions.id, subscriptionId))
    .returning();

  return updated;
}
