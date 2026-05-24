import { and, desc, eq, inArray, or } from "drizzle-orm";

import { ACTIVE_SUBSCRIPTION_STATUTS } from "@/lib/billing/constants";
import { db } from "@/lib/db/client";
import { plans, subscriptions, users } from "@/lib/db/schema";

export type ActiveSubscription = {
  subscription: typeof subscriptions.$inferSelect;
  plan: typeof plans.$inferSelect;
  cabinetId: string | null;
  userId: string;
};

function subscriptionStillValid(
  sub: typeof subscriptions.$inferSelect,
  now: Date
): boolean {
  if (sub.dateFin < now) return false;
  if (
    sub.estBeta &&
    sub.dateFinBeta &&
    sub.dateFinBeta < now
  ) {
    return false;
  }
  if (sub.estEssai && sub.dateFinEssai && sub.dateFinEssai < now) {
    return false;
  }
  return true;
}

export async function getActiveSubscriptionForUser(
  userId: string
): Promise<ActiveSubscription | null> {
  const [user] = await db
    .select({ cabinetId: users.cabinetId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;

  const now = new Date();

  if (user.cabinetId) {
    const [row] = await db
      .select({
        subscription: subscriptions,
        plan: plans,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(
        and(
          eq(subscriptions.cabinetId, user.cabinetId),
          inArray(subscriptions.statut, [...ACTIVE_SUBSCRIPTION_STATUTS])
        )
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (!row || !subscriptionStillValid(row.subscription, now)) return null;

    return {
      subscription: row.subscription,
      plan: row.plan,
      cabinetId: user.cabinetId,
      userId,
    };
  }

  const [row] = await db
    .select({
      subscription: subscriptions,
      plan: plans,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.userId, userId),
        inArray(subscriptions.statut, [...ACTIVE_SUBSCRIPTION_STATUTS])
      )
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  if (!row || !subscriptionStillValid(row.subscription, now)) return null;

  return {
    subscription: row.subscription,
    plan: row.plan,
    cabinetId: null,
    userId,
  };
}

/** Abonnement actif ou essai en cours pour un cabinet (onboarding). */
export async function cabinetHasActiveOrTrial(
  cabinetId: string
): Promise<boolean> {
  const now = new Date();
  const rows = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.cabinetId, cabinetId),
        or(
          inArray(subscriptions.statut, [...ACTIVE_SUBSCRIPTION_STATUTS]),
          eq(subscriptions.estEssai, true)
        )
      )
    )
    .limit(1);

  const sub = rows[0];
  if (!sub) return false;
  return subscriptionStillValid(sub, now);
}
