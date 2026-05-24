import { addMonths } from "date-fns";
import { eq } from "drizzle-orm";

import { subscriptionAmount } from "@/lib/billing/subscribe";
import { db } from "@/lib/db/client";
import { plans, subscriptions } from "@/lib/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function monthlyRevenueFcfa(
  sub: typeof subscriptions.$inferSelect,
  plan: typeof plans.$inferSelect
): number {
  if (sub.statut === "beta_gratuit" || sub.estBeta) return 0;
  if (sub.statut !== "actif") return 0;
  const amount = subscriptionAmount(
    plan,
    sub.cycle as "mensuel" | "annuel",
    sub.prixNegocieFcfa
  );
  return sub.cycle === "annuel" ? Math.round(amount / 12) : amount;
}

export async function extendSubscription(
  tx: Tx,
  subscriptionId: string,
  months: number
): Promise<typeof subscriptions.$inferSelect> {
  const [sub] = await tx
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  if (!sub) throw new Error("Abonnement introuvable");

  const base = sub.dateFin > new Date() ? sub.dateFin : new Date();
  const dateFin = addMonths(base, months);

  const [updated] = await tx
    .update(subscriptions)
    .set({
      dateFin,
      dateRenouvellement: dateFin,
      statut: sub.statut === "suspendu" ? "actif" : sub.statut,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscriptionId))
    .returning();

  return updated;
}

export async function suspendSubscription(
  tx: Tx,
  subscriptionId: string
): Promise<typeof subscriptions.$inferSelect> {
  const [updated] = await tx
    .update(subscriptions)
    .set({ statut: "suspendu", updatedAt: new Date() })
    .where(eq(subscriptions.id, subscriptionId))
    .returning();

  if (!updated) throw new Error("Abonnement introuvable");
  return updated;
}

export async function reactivateSubscription(
  tx: Tx,
  subscriptionId: string
): Promise<typeof subscriptions.$inferSelect> {
  const [sub] = await tx
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  if (!sub) throw new Error("Abonnement introuvable");

  const now = new Date();
  let dateFin = sub.dateFin;
  if (dateFin <= now) {
    dateFin = addMonths(now, sub.cycle === "annuel" ? 12 : 1);
  }

  const [updated] = await tx
    .update(subscriptions)
    .set({
      statut: "actif",
      dateFin,
      dateRenouvellement: dateFin,
      updatedAt: now,
    })
    .where(eq(subscriptions.id, subscriptionId))
    .returning();

  return updated;
}
