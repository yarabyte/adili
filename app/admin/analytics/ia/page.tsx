"use client";

import { BarList } from "@tremor/react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { Brain, CheckCircle2, Sparkles, XCircle } from "lucide-react";

import { AnalyticsChartCard } from "@/components/admin/analytics/analytics-chart-card";
import { KpiCard } from "@/components/admin/analytics/kpi-card";
import {
  adminAnalyticsFetcher,
  analyticsUrl,
} from "@/lib/admin/analytics/fetcher";

export default function AnalyticsIaPage() {
  const searchParams = useSearchParams();
  const period = searchParams?.get("period") ?? "7d";
  const usageKey = analyticsUrl("/api/admin/analytics/ia/usage", period);

  const { data } = useSWR<{
    total: number;
    success: number;
    failed: number;
    byFeature: { feature: string; count: number }[];
  }>(usageKey, adminAnalyticsFetcher, {
    refreshInterval: 30_000,
  });

  const successRate =
    data && data.total > 0 ? (data.success / data.total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Appels IA"
          value={data?.total ?? 0}
          icon={Sparkles}
          tone="violet"
        />
        <KpiCard
          label="Succès"
          value={data?.success ?? 0}
          icon={CheckCircle2}
          tone="sage"
        />
        <KpiCard
          label="Taux de succès"
          value={successRate}
          format="percent"
          icon={Brain}
          tone="sky"
        />
        {data && data.failed > 0 && (
          <KpiCard
            label="Échecs"
            value={data.failed}
            icon={XCircle}
            tone="crimson"
          />
        )}
      </div>
      <AnalyticsChartCard
        title="Par fonctionnalité"
        subtitle="Volume d'événements IA par type"
        icon={Brain}
        tone="violet"
      >
        <BarList
          className="mt-2"
          data={
            data?.byFeature?.map((f) => ({
              name: `✨ ${f.feature}`,
              value: f.count,
            })) ?? []
          }
          showAnimation
        />
      </AnalyticsChartCard>
    </div>
  );
}
