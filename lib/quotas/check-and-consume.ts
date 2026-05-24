import { and, asc, eq, gt, lt, sql } from "drizzle-orm";

import { getCurrentPeriode, formatPeriodeFinLabel } from "@/lib/billing/period";
import { getActiveSubscriptionForUser } from "@/lib/billing/subscription";
import { db } from "@/lib/db/client";
import { packsAdditionnels, quotasIa } from "@/lib/db/schema";

import type { QuotaCheckResult } from "./types";

export async function checkAndConsumeQuota(
  userId: string,
  feature: string
): Promise<QuotaCheckResult> {
  void feature; // réservé pour filtrage par type d'action IA
  const sub = await getActiveSubscriptionForUser(userId);
  if (!sub) {
    return {
      ok: false,
      raison: "subscription_expired",
      details: { billing_url: "/app/billing" },
    };
  }

  const periode = getCurrentPeriode();
  const quotaMensuel = sub.plan.quotaIaParUser;

  let [quota] = await db
    .select()
    .from(quotasIa)
    .where(
      and(eq(quotasIa.userId, userId), eq(quotasIa.periodeDebut, periode.debut))
    )
    .limit(1);

  if (!quota) {
    [quota] = await db
      .insert(quotasIa)
      .values({
        userId,
        cabinetId: sub.cabinetId ?? null,
        periodeDebut: periode.debut,
        periodeFin: periode.fin,
        quotaMensuel,
        consomme: 0,
        depassementGratuitUtilise: false,
      })
      .onConflictDoNothing()
      .returning();

    if (!quota) {
      [quota] = await db
        .select()
        .from(quotasIa)
        .where(
          and(
            eq(quotasIa.userId, userId),
            eq(quotasIa.periodeDebut, periode.debut)
          )
        )
        .limit(1);
    }
  }

  if (!quota) {
    return {
      ok: false,
      raison: "subscription_expired",
      details: { billing_url: "/app/billing" },
    };
  }

  if (quota.consomme < quota.quotaMensuel) {
    const next = quota.consomme + 1;
    await db
      .update(quotasIa)
      .set({ consomme: next, updatedAt: new Date() })
      .where(eq(quotasIa.id, quota.id));
    return {
      ok: true,
      restant: Math.max(0, quota.quotaMensuel - next),
      via: "quota_mensuel",
      quotaMensuel: quota.quotaMensuel,
      consomme: next,
    };
  }

  const now = new Date();
  const [pack] = await db
    .select()
    .from(packsAdditionnels)
    .where(
      and(
        eq(packsAdditionnels.userId, userId),
        eq(packsAdditionnels.statut, "actif"),
        gt(packsAdditionnels.dateExpiration, now),
        lt(packsAdditionnels.consomme, packsAdditionnels.quantite)
      )
    )
    .orderBy(asc(packsAdditionnels.dateExpiration))
    .limit(1);

  if (pack) {
    const nextPack = pack.consomme + 1;
    await db
      .update(packsAdditionnels)
      .set({
        consomme: nextPack,
        statut: nextPack >= pack.quantite ? "epuise" : "actif",
      })
      .where(eq(packsAdditionnels.id, pack.id));
    return {
      ok: true,
      restant: pack.quantite - nextPack,
      via: "pack",
      packId: pack.id,
      quotaMensuel: quota.quotaMensuel,
      consomme: quota.consomme,
    };
  }

  if (!quota.depassementGratuitUtilise) {
    const next = quota.consomme + 1;
    await db
      .update(quotasIa)
      .set({
        consomme: next,
        depassementGratuitUtilise: true,
        updatedAt: new Date(),
      })
      .where(eq(quotasIa.id, quota.id));
    return {
      ok: true,
      restant: 0,
      via: "depassement_gratuit",
      quotaMensuel: quota.quotaMensuel,
      consomme: next,
    };
  }

  return {
    ok: false,
    raison: "quota_epuise_pack_requis",
    details: {
      quota_mensuel: quota.quotaMensuel,
      consomme: quota.consomme,
      reset_date: formatPeriodeFinLabel(quota.periodeFin),
      pack_url: "/app/billing/packs",
      billing_url: "/app/billing",
    },
  };
}

/** Lecture seule du quota courant (barre d’état, page facturation). */
export async function getQuotaSummaryForUser(
  userId: string
): Promise<import("./types").QuotaSummary | null> {
  const sub = await getActiveSubscriptionForUser(userId);
  if (!sub) return null;

  const periode = getCurrentPeriode();
  let [quota] = await db
    .select()
    .from(quotasIa)
    .where(
      and(eq(quotasIa.userId, userId), eq(quotasIa.periodeDebut, periode.debut))
    )
    .limit(1);

  if (!quota) {
    [quota] = await db
      .insert(quotasIa)
      .values({
        userId,
        cabinetId: sub.cabinetId ?? null,
        periodeDebut: periode.debut,
        periodeFin: periode.fin,
        quotaMensuel: sub.plan.quotaIaParUser,
        consomme: 0,
      })
      .onConflictDoNothing()
      .returning();

    if (!quota) {
      [quota] = await db
        .select()
        .from(quotasIa)
        .where(
          and(
            eq(quotasIa.userId, userId),
            eq(quotasIa.periodeDebut, periode.debut)
          )
        )
        .limit(1);
    }
  }

  if (!quota) return null;

  const [packAgg] = await db
    .select({
      restant: sql<number>`coalesce(sum(${packsAdditionnels.quantite} - ${packsAdditionnels.consomme}), 0)::int`,
    })
    .from(packsAdditionnels)
    .where(
      and(
        eq(packsAdditionnels.userId, userId),
        eq(packsAdditionnels.statut, "actif"),
        gt(packsAdditionnels.dateExpiration, new Date())
      )
    );

  const packRestant = Number(packAgg?.restant ?? 0);
  const restantMensuel = Math.max(0, quota.quotaMensuel - quota.consomme);

  return {
    quotaMensuel: quota.quotaMensuel,
    consomme: quota.consomme,
    restantMensuel,
    packRestant,
    depassementGratuitUtilise: Boolean(quota.depassementGratuitUtilise),
    periodeFin: quota.periodeFin,
    planNom: sub.plan.nom,
    planId: sub.plan.id,
    subscriptionStatut: sub.subscription.statut,
  };
}
