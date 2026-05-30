"use client";

import { AreaChart } from "@tremor/react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { CreditCard, TrendingUp, UserPlus, Users, Wallet } from "lucide-react";

import { AnalyticsChartCard } from "@/components/admin/analytics/analytics-chart-card";
import { KpiCard } from "@/components/admin/analytics/kpi-card";
import {
  adminAnalyticsFetcher,
  analyticsUrl,
} from "@/lib/admin/analytics/fetcher";

type OverviewResponse = {
  kpis: {
    signups: { value: number; change: number | null };
    new_subscriptions: { value: number; change: number | null };
    active_users: { value: number; change: number | null };
    revenue_fcfa: { value: number; change: number | null };
  };
};

export default function AnalyticsBusinessPage() {
  const searchParams = useSearchParams();
  const period = searchParams?.get("period") ?? "7d";

  const overviewKey = `/api/admin/analytics/overview?period=${period}&compare=true`;
  const revenueKey = analyticsUrl("/api/admin/analytics/business/revenue", period);

  const { data: overview } = useSWR<OverviewResponse>(overviewKey, adminAnalyticsFetcher, {
    refreshInterval: 30_000,
  });
  const { data: revenue } = useSWR<{ series: Record<string, string | number>[] }>(
    revenueKey,
    adminAnalyticsFetcher,
    { refreshInterval: 30_000 }
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Inscriptions"
          value={overview?.kpis?.signups?.value ?? 0}
          delta={overview?.kpis?.signups?.change}
          icon={UserPlus}
          tone="sage"
        />
        <KpiCard
          label="Abonnements"
          value={overview?.kpis?.new_subscriptions?.value ?? 0}
          delta={overview?.kpis?.new_subscriptions?.change}
          icon={CreditCard}
          tone="gold"
        />
        <KpiCard
          label="Utilisateurs actifs"
          value={overview?.kpis?.active_users?.value ?? 0}
          delta={overview?.kpis?.active_users?.change}
          icon={Users}
          tone="sky"
        />
        <KpiCard
          label="Revenus trackés"
          value={overview?.kpis?.revenue_fcfa?.value ?? 0}
          delta={overview?.kpis?.revenue_fcfa?.change}
          icon={Wallet}
          tone="justice"
          format="currency"
        />
      </div>
      <AnalyticsChartCard
        title="Revenus & abonnements"
        subtitle="Évolution journalière sur la période"
        icon={TrendingUp}
        tone="sage"
      >
        <AreaChart
          className="mt-2 h-72"
          data={revenue?.series ?? []}
          index="day"
          categories={["Revenus", "Abonnements"]}
          colors={["emerald", "blue"]}
          valueFormatter={(v) => Number(v).toLocaleString("fr-FR")}
          showAnimation
        />
      </AnalyticsChartCard>
    </div>
  );
}
