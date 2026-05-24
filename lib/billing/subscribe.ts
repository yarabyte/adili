import { addMonths } from "date-fns";
import { and, eq, inArray } from "drizzle-orm";

import { SUBSCRIPTION_PENDING } from "@/lib/billing/constants";
import { db } from "@/lib/db/client";
import { plans, subscriptions } from "@/lib/db/schema";

const BLOCKING = ["actif", "beta_gratuit", SUBSCRIPTION_PENDING] as const;

export async function createPendingSubscription(args: {
  cabinetId: string;
  planId: string;
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
        inArray(subscriptions.statut, [...BLOCKING])
      )
    )
    .limit(1);

  if (existing?.statut === "actif" || existing?.statut === "beta_gratuit") {
    throw new Error("Un abonnement actif existe déjà pour ce cabinet");
  }

  const now = new Date();
  const placeholderEnd = addMonths(now, 1);

  if (existing?.statut === SUBSCRIPTION_PENDING) {
    const [updated] = await db
      .update(subscriptions)
      .set({
        planId: args.planId,
        cycle: args.cycle,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, existing.id))
      .returning();
    return { subscription: updated, plan };
  }

  const [subscription] = await db
    .insert(subscriptions)
    .values({
      cabinetId: args.cabinetId,
      planId: args.planId,
      statut: SUBSCRIPTION_PENDING,
      cycle: args.cycle,
      dateDebut: now,
      dateFin: placeholderEnd,
      autoRenouvellement: true,
    })
    .returning();

  return { subscription, plan };
}

export function subscriptionAmount(
  plan: typeof plans.$inferSelect,
  cycle: "mensuel" | "annuel",
  prixNegocieFcfa?: number | null
): number {
  if (prixNegocieFcfa != null && prixNegocieFcfa > 0) return prixNegocieFcfa;
  return cycle === "annuel" ? plan.prixAnnuelFcfa : plan.prixMensuelFcfa;
}
