import { addDays, addMonths } from "date-fns";
import { and, eq, inArray } from "drizzle-orm";

import { ACTIVE_SUBSCRIPTION_STATUTS } from "@/lib/billing/constants";
import { db } from "@/lib/db/client";
import { plans, subscriptions } from "@/lib/db/schema";

const TRIAL_DAYS = 30;

/**
 * Démarre un essai 30 jours sans paiement (Individuel ou Cabinet).
 */
export async function startTrialSubscription(args: {
  cabinetId: string;
  planId: "individuel" | "cabinet";
  cycle: "mensuel" | "annuel";
}) {
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, args.planId))
    .limit(1);

  if (!plan?.isActive) {
    throw new Error("Plan invalide ou inactif");
  }

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.cabinetId, args.cabinetId),
        inArray(subscriptions.statut, [...ACTIVE_SUBSCRIPTION_STATUTS])
      )
    )
    .limit(1);

  if (existing) {
    return { subscription: existing, plan, alreadyActive: true as const };
  }

  const now = new Date();
  const finEssai = addDays(now, TRIAL_DAYS);
  const dateFin = addMonths(now, 1);

  const [subscription] = await db
    .insert(subscriptions)
    .values({
      cabinetId: args.cabinetId,
      planId: args.planId,
      statut: "actif",
      cycle: args.cycle,
      dateDebut: now,
      dateFin,
      estEssai: true,
      dateFinEssai: finEssai,
      autoRenouvellement: false,
    })
    .returning();

  return { subscription, plan, alreadyActive: false as const };
}
