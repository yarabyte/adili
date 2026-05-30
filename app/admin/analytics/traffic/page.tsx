"use client";

import { BarList } from "@tremor/react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { Globe2, MapPin, Monitor, Share2 } from "lucide-react";

import { AnalyticsChartCard } from "@/components/admin/analytics/analytics-chart-card";

import {
  adminAnalyticsFetcher,
  analyticsUrl,
} from "@/lib/admin/analytics/fetcher";

const SOURCE_ICONS: Record<string, string> = {
  direct: "↗",
  google: "🔍",
  linkedin: "💼",
  whatsapp: "💬",
  facebook: "📘",
  other_referral: "🔗",
};

function sourceLabel(source: string): string {
  const icon = SOURCE_ICONS[source] ?? "•";
  return `${icon} ${source}`;
}

export default function AnalyticsTrafficPage() {
  const searchParams = useSearchParams();
  const period = searchParams?.get("period") ?? "7d";

  const pagesKey = analyticsUrl("/api/admin/analytics/traffic/pages", period);
  const sourcesKey = analyticsUrl("/api/admin/analytics/traffic/sources", period);
  const geoKey = analyticsUrl("/api/admin/analytics/traffic/geography", period);
  const devicesKey = analyticsUrl("/api/admin/analytics/traffic/devices", period);

  const { data: pages } = useSWR<{ pages: { path: string; views: number }[] }>(
    pagesKey,
    adminAnalyticsFetcher,
    { refreshInterval: 30_000 }
  );
  const { data: sources } = useSWR<{ sources: { source: string; visitors: number }[] }>(
    sourcesKey,
    adminAnalyticsFetcher,
    { refreshInterval: 30_000 }
  );
  const { data: geo } = useSWR<{ geography: { country: string; visitors: number }[] }>(
    geoKey,
    adminAnalyticsFetcher,
    { refreshInterval: 30_000 }
  );
  const { data: devices } = useSWR<{
    devices: { device: string; visitors: number }[];
    browsers: { browser: string; visitors: number }[];
  }>(devicesKey, adminAnalyticsFetcher, { refreshInterval: 30_000 });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title="Top pages"
          subtitle="Pages les plus consultées"
          icon={Globe2}
          tone="gold"
        >
          <BarList
            className="mt-2"
            data={
              pages?.pages?.map((p) => ({
                name: p.path === "/" ? "🏠 Accueil" : `📄 ${p.path}`,
                value: p.views,
              })) ?? []
            }
            showAnimation
          />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Sources"
          subtitle="Origine du trafic"
          icon={Share2}
          tone="violet"
        >
          <BarList
            className="mt-2"
            data={
              sources?.sources?.map((s) => ({
                name: sourceLabel(s.source),
                value: s.visitors,
              })) ?? []
            }
            showAnimation
          />
        </AnalyticsChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsChartCard
          title="Géographie"
          subtitle="Visiteurs par pays"
          icon={MapPin}
          tone="sage"
        >
          <BarList
            className="mt-2"
            data={
              geo?.geography?.map((g) => ({
                name: `🌍 ${g.country}`,
                value: g.visitors,
              })) ?? []
            }
            showAnimation
          />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Appareils & navigateurs"
          subtitle="Répartition technique"
          icon={Monitor}
          tone="sky"
        >
          <BarList
            className="mt-2"
            data={[
              ...(devices?.devices?.map((d) => ({
                name: `📱 ${d.device}`,
                value: d.visitors,
              })) ?? []),
              ...(devices?.browsers?.map((b) => ({
                name: `🌐 ${b.browser}`,
                value: b.visitors,
              })) ?? []),
            ]}
            showAnimation
          />
        </AnalyticsChartCard>
      </div>
    </div>
  );
}
