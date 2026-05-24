import { and, count, desc, eq, gte, inArray, sum } from "drizzle-orm";
import { subDays, subMonths, startOfMonth } from "date-fns";

import { monthlyRevenueFcfa } from "@/lib/admin/subscription-actions";
import { db } from "@/lib/db/client";
import {
  cabinets,
  paiements,
  plans,
  subscriptions,
} from "@/lib/db/schema";

const ACTIVE_STATUTS = ["actif", "beta_gratuit"] as const;

export type RevenueMetrics = {
  mrrFcfa: number;
  arrFcfa: number;
  abonnementsActifs: number;
  abonnementsBeta: number;
  abonnementsSuspendus: number;
  abonnementsEnAttente: number;
  revenuEncaisse30jFcfa: number;
  revenuEncaisseMoisFcfa: number;
  paiementsEnAttente: number;
  churnMoisPrecedent: number;
  parPlan: { planId: string; planNom: string; count: number; mrrFcfa: number }[];
  revenuParMois: { mois: string; montantFcfa: number }[];
};

export async function getRevenueMetrics(): Promise<RevenueMetrics> {
  const now = new Date();
  const debutMois = startOfMonth(now);
  const il30j = subDays(now, 30);
  const activeRows = await db
    .select({ sub: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(inArray(subscriptions.statut, [...ACTIVE_STATUTS]));

  let mrrFcfa = 0;
  let abonnementsBeta = 0;
  const planMap = new Map<
    string,
    { planNom: string; count: number; mrrFcfa: number }
  >();

  for (const { sub, plan } of activeRows) {
    if (sub.statut === "beta_gratuit" || sub.estBeta) {
      abonnementsBeta++;
      continue;
    }
    const mrr = monthlyRevenueFcfa(sub, plan);
    mrrFcfa += mrr;
    const cur = planMap.get(plan.id) ?? {
      planNom: plan.nom,
      count: 0,
      mrrFcfa: 0,
    };
    cur.count++;
    cur.mrrFcfa += mrr;
    planMap.set(plan.id, cur);
  }

  const [suspendus] = await db
    .select({ n: count() })
    .from(subscriptions)
    .where(eq(subscriptions.statut, "suspendu"));

  const [enAttente] = await db
    .select({ n: count() })
    .from(subscriptions)
    .where(eq(subscriptions.statut, "en_attente_paiement"));

  const [encaisse30] = await db
    .select({ total: sum(paiements.montantFcfa) })
    .from(paiements)
    .where(
      and(eq(paiements.statut, "paye"), gte(paiements.createdAt, il30j))
    );

  const [encaisseMois] = await db
    .select({ total: sum(paiements.montantFcfa) })
    .from(paiements)
    .where(
      and(eq(paiements.statut, "paye"), gte(paiements.createdAt, debutMois))
    );

  const [pendingPay] = await db
    .select({ n: count() })
    .from(paiements)
    .where(eq(paiements.statut, "en_attente"));

  const [annules] = await db
    .select({ n: count() })
    .from(subscriptions)
    .where(eq(subscriptions.statut, "annule"));

  const actifsHorsBeta = activeRows.filter(
    (r) => r.sub.statut === "actif" && !r.sub.estBeta
  ).length;
  const totalSubs = actifsHorsBeta + Number(annules?.n ?? 0);
  const churnMoisPrecedent =
    totalSubs > 0
      ? Math.round((Number(annules?.n ?? 0) / totalSubs) * 100)
      : 0;

  const paidRecent = await db
    .select({
      montant: paiements.montantFcfa,
      createdAt: paiements.createdAt,
    })
    .from(paiements)
    .where(
      and(eq(paiements.statut, "paye"), gte(paiements.createdAt, subMonths(now, 6)))
    );

  const revenuParMois: RevenueMetrics["revenuParMois"] = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("fr-FR", {
      month: "short",
      year: "2-digit",
    }).format(d);
    const montant = paidRecent
      .filter((p) => {
        const pk = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, "0")}`;
        return pk === key;
      })
      .reduce((s, p) => s + p.montant, 0);
    revenuParMois.push({ mois: label, montantFcfa: montant });
  }

  return {
    mrrFcfa,
    arrFcfa: mrrFcfa * 12,
    abonnementsActifs: actifsHorsBeta,
    abonnementsBeta,
    abonnementsSuspendus: Number(suspendus?.n ?? 0),
    abonnementsEnAttente: Number(enAttente?.n ?? 0),
    revenuEncaisse30jFcfa: Number(encaisse30?.total ?? 0),
    revenuEncaisseMoisFcfa: Number(encaisseMois?.total ?? 0),
    paiementsEnAttente: Number(pendingPay?.n ?? 0),
    churnMoisPrecedent,
    parPlan: Array.from(planMap.entries()).map(([planId, v]) => ({
      planId,
      planNom: v.planNom,
      count: v.count,
      mrrFcfa: v.mrrFcfa,
    })),
    revenuParMois,
  };
}

export async function listSubscriptionsForAdmin(filters?: {
  statut?: string;
  limit?: number;
}) {
  const limit = filters?.limit ?? 100;
  const whereClause = filters?.statut
    ? eq(subscriptions.statut, filters.statut)
    : undefined;

  return db
    .select({
      subscription: subscriptions,
      plan: plans,
      cabinet: cabinets,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .innerJoin(cabinets, eq(subscriptions.cabinetId, cabinets.id))
    .where(whereClause)
    .orderBy(desc(subscriptions.updatedAt))
    .limit(limit);
}
