import {
  CreditCard,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { AdminCard } from "@/components/admin/admin-card";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { RevenueBarChart } from "@/components/admin/revenue-bar-chart";
import { requireAdminPage } from "@/lib/admin/require-admin-page";
import { getRevenueMetrics } from "@/lib/admin/revenue";
import { formatFcfa } from "@/lib/billing/format";

export const metadata = { title: "Revenus · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminRevenuePage() {
  await requireAdminPage("subscription.view");
  const m = await getRevenueMetrics();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Revenus & MRR"
        description="Métriques calculées sur les abonnements actifs et paiements encaissés."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="MRR"
          value={formatFcfa(m.mrrFcfa)}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <AdminStatCard
          label="ARR"
          value={formatFcfa(m.arrFcfa)}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <AdminStatCard
          label="Encaissé (30 j)"
          value={formatFcfa(m.revenuEncaisse30jFcfa)}
          icon={<Wallet className="h-4 w-4" />}
        />
        <AdminStatCard
          label="Encaissé (mois)"
          value={formatFcfa(m.revenuEncaisseMoisFcfa)}
          icon={<Wallet className="h-4 w-4" />}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="Abonnements actifs"
          value={String(m.abonnementsActifs)}
          icon={<Users className="h-4 w-4" />}
        />
        <AdminStatCard
          label="Beta gratuits"
          value={String(m.abonnementsBeta)}
        />
        <AdminStatCard
          label="Suspendus"
          value={String(m.abonnementsSuspendus)}
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <AdminStatCard
          label="Paiements en attente"
          value={String(m.paiementsEnAttente)}
          icon={<CreditCard className="h-4 w-4" />}
        />
      </section>

      <AdminCard>
        <h2 className="font-heading text-lg font-semibold text-brand-justice">
          Revenus encaissés (6 mois)
        </h2>
        <RevenueBarChart data={m.revenuParMois} />
      </AdminCard>

      <AdminCard>
        <h2 className="font-heading text-lg font-semibold text-brand-justice">
          MRR par plan
        </h2>
        {m.parPlan.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Aucun abonnement payant actif.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[320px] text-sm">
              <thead>
                <tr className="border-b border-brand-justice/10 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Plan</th>
                  <th className="pb-3 pr-4">Cabinets</th>
                  <th className="pb-3 text-right">MRR</th>
                </tr>
              </thead>
              <tbody>
                {m.parPlan.map((p) => (
                  <tr
                    key={p.planId}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-3 font-medium">{p.planNom}</td>
                    <td className="py-3 tabular-nums text-muted-foreground">
                      {p.count}
                    </td>
                    <td className="py-3 text-right font-medium tabular-nums">
                      {formatFcfa(p.mrrFcfa)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Taux d&apos;annulation (approx.) :{" "}
          <strong className="text-foreground">{m.churnMoisPrecedent}%</strong> —
          ratio abonnements annulés / total historique.
        </p>
      </AdminCard>
    </div>
  );
}
